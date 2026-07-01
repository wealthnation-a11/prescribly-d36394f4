import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Send, Plus, Trash2, Sparkles, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import WHLayout from "@/components/womens-health/WHLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Session { id: string; title: string; updated_at: string }
interface Msg { id: string; role: "user" | "assistant"; content: string; created_at: string }

const SecretChats = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const initialTopic = params.get("topic");
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [busy, setBusy] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check pin state
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any).rpc("has_secret_pin");
      setHasPin(!!data);
    })();
  }, [user]);

  // Load sessions after unlock
  useEffect(() => {
    if (!unlocked || !user) return;
    (async () => {
      const { data } = await (supabase as any).from("secret_chat_sessions")
        .select("id,title,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false });
      setSessions(data ?? []);
      if (!activeId && data && data.length) setActiveId(data[0].id);
      if (!data?.length) await createSession(initialTopic === "delay" ? "Why is my period late?" : undefined);
    })();
    // eslint-disable-next-line
  }, [unlocked, user]);

  // Load messages for active session
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    (async () => {
      const { data } = await (supabase as any).from("secret_chat_messages")
        .select("id,role,content,created_at").eq("session_id", activeId).order("created_at", { ascending: true });
      setMessages(data ?? []);
      setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 50);
    })();
  }, [activeId]);

  const setPinFlow = async () => {
    if (pin.length < 4) { toast({ title: "PIN must be 4+ digits", variant: "destructive" }); return; }
    if (pin !== pin2) { toast({ title: "PINs do not match", variant: "destructive" }); return; }
    setBusy(true);
    const { error } = await (supabase as any).rpc("set_secret_pin", { _pin: pin });
    setBusy(false);
    if (error) { toast({ title: "Couldn't set PIN", description: error.message, variant: "destructive" }); return; }
    setHasPin(true); setUnlocked(true); setPin(""); setPin2("");
    toast({ title: "PIN set", description: "Secret Chats are locked with your PIN." });
  };

  const verifyPin = async () => {
    if (!pin) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("verify_secret_pin", { _pin: pin });
    setBusy(false);
    if (error || !data) { toast({ title: "Incorrect PIN", variant: "destructive" }); return; }
    setUnlocked(true); setPin("");
  };

  const createSession = async (firstUserMsg?: string) => {
    if (!user) return;
    const { data, error } = await (supabase as any).from("secret_chat_sessions")
      .insert({ user_id: user.id, title: firstUserMsg?.slice(0, 40) ?? "New chat" })
      .select("id,title,updated_at").single();
    if (error || !data) return;
    setSessions(s => [data, ...s]);
    setActiveId(data.id);
    if (firstUserMsg) {
      setTimeout(() => send(firstUserMsg, data.id), 200);
    }
  };

  const deleteSession = async (id: string) => {
    await (supabase as any).from("secret_chat_sessions").delete().eq("id", id);
    setSessions(s => s.filter(x => x.id !== id));
    if (activeId === id) setActiveId(sessions.find(s => s.id !== id)?.id ?? null);
  };

  const send = async (text?: string, sessionId?: string) => {
    const body = (text ?? input).trim();
    const sid = sessionId ?? activeId;
    if (!body || !sid || !user) return;
    setInput(""); setSending(true);
    const userRow = { session_id: sid, user_id: user.id, role: "user" as const, content: body };
    const { data: inserted } = await (supabase as any).from("secret_chat_messages").insert(userRow).select("*").single();
    setMessages(m => [...m, inserted]);
    setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 20);
    try {
      const history = [...messages, inserted].slice(-16).map(m => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke("gift-assistant", { body: { mode: "chat", messages: history } });
      if (error) throw error;
      const answer = (data as any)?.text ?? "";
      const asstRow = { session_id: sid, user_id: user.id, role: "assistant" as const, content: answer };
      const { data: asstInserted } = await (supabase as any).from("secret_chat_messages").insert(asstRow).select("*").single();
      setMessages(m => [...m, asstInserted]);
      await (supabase as any).from("secret_chat_sessions").update({ updated_at: new Date().toISOString(), title: sessions.find(s => s.id === sid)?.title || body.slice(0, 40) }).eq("id", sid);
    } catch (e: any) {
      toast({ title: "Gift is offline", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 50);
    }
  };

  // ── UI ─────────────────────────────────────────────
  if (hasPin === null) return <WHLayout title="Secret Chats" showBack><Card className="h-48 animate-pulse" /></WHLayout>;

  if (!unlocked) {
    return (
      <WHLayout title="Secret Chats" showBack>
        <Card className="p-6 text-center max-w-sm mx-auto">
          <div className="mx-auto h-14 w-14 rounded-full bg-wh-pink-soft grid place-items-center mb-3">
            {hasPin ? <Lock className="h-7 w-7 text-wh-pink" /> : <KeyRound className="h-7 w-7 text-wh-pink" />}
          </div>
          <h2 className="font-bold text-lg">{hasPin ? "Enter your PIN" : "Create a PIN"}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {hasPin ? "Your Secret Chats are private and PIN-protected." : "Choose a 4–12 digit PIN. You'll use it to open Secret Chats."}
          </p>
          <div className="mt-4 space-y-2">
            <Input inputMode="numeric" maxLength={12} placeholder="PIN"
              type="password" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} />
            {!hasPin && <Input inputMode="numeric" maxLength={12} placeholder="Confirm PIN"
              type="password" value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g, ""))} />}
            <Button className="w-full bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full"
              disabled={busy} onClick={hasPin ? verifyPin : setPinFlow}>
              {hasPin ? "Unlock" : "Set PIN"}
            </Button>
          </div>
        </Card>
      </WHLayout>
    );
  }

  const active = sessions.find(s => s.id === activeId);

  return (
    <WHLayout title="Secret Chats" showBack>
      <div className="grid grid-cols-[110px_1fr] md:grid-cols-[200px_1fr] gap-3 h-[calc(100vh-8rem)]">
        {/* Session list */}
        <div className="border-r border-border pr-2 overflow-y-auto">
          <Button size="sm" variant="outline" className="w-full mb-2" onClick={() => createSession()}>
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
          {sessions.map(s => (
            <div key={s.id} className={`group flex items-center gap-1 rounded-lg mb-1 ${activeId === s.id ? "bg-wh-pink-soft" : ""}`}>
              <button onClick={() => setActiveId(s.id)}
                className="flex-1 text-left px-2 py-2 text-xs">
                <p className="truncate font-medium">{s.title}</p>
                <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}</p>
              </button>
              <button onClick={() => deleteSession(s.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Chat */}
        <div className="flex flex-col h-full">
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
            {!messages.length && (
              <div className="text-center py-10">
                <div className="mx-auto h-12 w-12 rounded-full bg-wh-pink grid place-items-center mb-2"><Sparkles className="h-6 w-6 text-white" /></div>
                <p className="font-semibold">Chat privately with Gift</p>
                <p className="text-xs text-muted-foreground">Only you can see these messages.</p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map(m => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full bg-wh-pink grid place-items-center shrink-0 mr-2 mt-0.5">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap
                    ${m.role === "user" ? "bg-wh-pink text-white rounded-br-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
              {sending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="h-7 w-7 rounded-full bg-wh-pink grid place-items-center shrink-0 mr-2"><Sparkles className="h-4 w-4 text-white" /></div>
                  <div className="bg-muted rounded-2xl px-3 py-2 text-sm text-muted-foreground">Gift is thinking…</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type a private message…" className="min-h-[44px] max-h-32 resize-none" />
            <Button onClick={() => send()} disabled={sending || !input.trim()}
              className="bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full self-end h-11 w-11 p-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
            <ShieldCheck className="h-3 w-3" /> PIN-protected. Not medical advice.
          </p>
        </div>
      </div>
    </WHLayout>
  );
};

export default SecretChats;
