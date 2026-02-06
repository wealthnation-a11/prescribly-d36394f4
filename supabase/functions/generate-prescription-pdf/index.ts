import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const drugSchema = z.object({
  name: z.string().max(500),
  dosage: z.string().max(500),
  usage: z.string().max(1000).optional(),
}).passthrough();

const prescriptionSchema = z.object({
  id: z.string().max(200),
  condition_name: z.string().max(500),
  drugs: z.array(drugSchema).max(50),
  created_at: z.string().optional(),
}).passthrough();

const requestSchema = z.object({
  type: z.enum(['single', 'all']),
  prescription: prescriptionSchema.optional(),
  prescriptions: z.array(prescriptionSchema).max(200).optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header required');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid authorization token');

    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validation.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { type, prescription, prescriptions } = validation.data;

    let htmlContent = '';
    if (type === 'single' && prescription) {
      htmlContent = generateSinglePrescriptionHTML(prescription, user);
    } else if (type === 'all' && prescriptions) {
      htmlContent = generateAllPrescriptionsHTML(prescriptions, user);
    } else {
      throw new Error('Invalid request parameters');
    }

    const pdfResponse = await generatePDFFromHTML(htmlContent);

    const fileName = type === 'single'
      ? `prescription-${prescription!.id}-${Date.now()}.pdf`
      : `all-prescriptions-${user.id}-${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('prescriptions')
      .upload(fileName, pdfResponse, { contentType: 'application/pdf', upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('prescriptions').getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ url: urlData.publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate PDF' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateSinglePrescriptionHTML(prescription: any, user: any): string {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Prescription</title></head><body>
    <h1>PRESCRIBLY</h1><p>Patient: ${user.email}</p><p>Date: ${currentDate}</p>
    <h2>DIAGNOSIS: ${prescription.condition_name}</h2>
    ${prescription.drugs.map((drug: any) => `<div><strong>${drug.name}</strong><br>Dosage: ${drug.dosage}<br>${drug.usage || ''}</div>`).join('')}
    <p><strong>DISCLAIMER:</strong> This prescription is AI-generated and for informational purposes only.</p>
  </body></html>`;
}

function generateAllPrescriptionsHTML(prescriptions: any[], user: any): string {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Prescriptions</title></head><body>
    <h1>PRESCRIBLY - Complete Prescription History</h1><p>Patient: ${user.email}</p><p>Date: ${currentDate}</p>
    ${prescriptions.map((p, i) => `<div><h3>Prescription #${i + 1} - ${p.condition_name}</h3>
      ${p.drugs.map((d: any) => `<div><strong>${d.name}</strong> - ${d.dosage}</div>`).join('')}</div>`).join('')}
    <p><strong>DISCLAIMER:</strong> These prescriptions are AI-generated and for informational purposes only.</p>
  </body></html>`;
}

async function generatePDFFromHTML(html: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Prescription PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n309\n%%EOF`;
  return encoder.encode(pdfContent);
}
