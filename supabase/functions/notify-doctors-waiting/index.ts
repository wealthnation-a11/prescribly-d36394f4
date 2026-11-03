import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import webpush from 'npm:web-push@3.6.7';

const Body = z.object({ session_id: z.string().uuid() });
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: s } = await admin.from('consultation_sessions')
      .select('id, patient_id, doctor_id, mode, symptoms, status, is_emergency')
      .eq('id', parsed.data.session_id).maybeSingle();
    if (!s || s.patient_id !== user.id) return json({ error: 'Not found' }, 404);
    if (!['waiting', 'paid'].includes(s.status)) return json({ sent: 0, reason: 'not waiting' });

    let targets: string[] = [];
    if (s.doctor_id) targets = [s.doctor_id];
    else {
      const { data: docs } = await admin.from('doctors').select('user_id').eq('verification_status', 'approved');
      targets = (docs ?? []).map((d: any) => d.user_id).filter(Boolean);
    }
    if (!targets.length) return json({ sent: 0 });

    const { data: p } = await admin.from('profiles').select('first_name').eq('user_id', user.id).maybeSingle();
    const mode = s.mode === 'video' ? 'Video' : s.mode === 'voice' ? 'Voice' : 'Chat';
    const title = s.is_emergency ? '🚨 URGENT patient waiting' : '🩺 Patient waiting for you';
    const body = `${p?.first_name ?? 'A patient'} • ${mode} • ${(s.symptoms ?? 'General consultation').slice(0, 80)}`;
    const link = '/doctor-consultations';

    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);
    const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', targets);
    let sent = 0;
    await Promise.all((subs ?? []).filter((x: any) => x.p256dh && x.p256dh !== 'native-android').map(async (x: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: x.endpoint, keys: { p256dh: x.p256dh, auth: x.auth } },
          JSON.stringify({ title, body, url: link, type: 'consultation_waiting', tag: `consult-${s.id}` }),
          { TTL: 600, urgency: 'high' },
        );
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', x.id);
        else console.error('push failed', e?.statusCode, e?.body);
      }
    }));

    await admin.from('notifications').insert(targets.map((uid) => ({
      user_id: uid, type: 'consultation_waiting', title, message: body, data: { url: link, session_id: s.id },
    })));
    return json({ sent, doctors: targets.length });
  } catch (e) {
    console.error(e);
    return json({ error: 'Internal error' }, 500);
  }
});
