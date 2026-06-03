import { useEffect, useRef, useState } from "react";
import { Headset, X, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's my next appointment?",
  "Show my active prescriptions",
  "How much have I paid for consultations?",
  "What does my last symptom check suggest?",
  "Tips to improve my sleep",
  "How can I stay hydrated?",
];

const dismissKey = (uid: string) => `ai-bubble-dismissed:${uid}`;

export const AIChatBubble = () => {
  const { user, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync dismissed state with sessionStorage per-user.
  useEffect(() => {
    if (!user) { setDismissed(false); return; }
    setDismissed(sessionStorage.getItem(dismissKey(user.id)) === "1");
  }, [user?.id]);

  // Clear dismissed state on a fresh sign-in so it reappears after logout/login.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === "SIGNED_IN" && sess?.user) {
        sessionStorage.removeItem(dismissKey(sess.user.id));
        setDismissed(false);
      }
      if (event === "SIGNED_OUT") setDismissed(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  if (!user || dismissed) return null;

  const dismiss = () => {
    if (user) sessionStorage.setItem(dismissKey(user.id), "1");
    setDismissed(true);
    setOpen(false);
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chatbot`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
      });

      if (resp.status === 429) { toast({ title: "Slow down", description: "Too many requests, try again shortly." }); setLoading(false); return; }
      if (resp.status === 402) { toast({ title: "AI unavailable", description: "AI credits exhausted." }); setLoading(false); return; }
      if (!resp.ok || !resp.body) { toast({ title: "AI error", variant: "destructive" }); setLoading(false); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistantText = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantText += delta;
              setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m));
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to reach assistant", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <div className="fixed bottom-6 right-6 z-50 group">
          {/* Friendly tooltip label */}
          <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-foreground text-background text-xs font-medium px-2.5 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Ask me anything
          </div>

          {/* Dismiss (X) button */}
          <button
            onClick={dismiss}
            aria-label="Dismiss assistant"
            className="absolute -top-1 -right-1 z-10 h-5 w-5 rounded-full bg-foreground text-background grid place-items-center shadow-md hover:scale-110 transition-transform"
          >
            <X className="w-3 h-3" />
          </button>

          {/* Pulsing ring */}
          <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" aria-hidden />

          {/* Circular trigger with cartoon support agent */}
          <button
            onClick={() => setOpen(true)}
            aria-label="Open AI assistant"
            className="relative h-14 w-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform overflow-hidden"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--wh-pink, var(--primary))))" }}
          >
            {/* Cartoon-style support agent: head + headset */}
            <svg viewBox="0 0 64 64" className="h-9 w-9 drop-shadow" aria-hidden>
              {/* Face */}
              <circle cx="32" cy="30" r="14" fill="#FFD9B8" />
              {/* Hair */}
              <path d="M18 26 Q20 14 32 14 Q44 14 46 26 Q40 22 32 22 Q24 22 18 26 Z" fill="#3a2a1f" />
              {/* Eyes */}
              <circle cx="27" cy="31" r="1.6" fill="#1a1a1a" />
              <circle cx="37" cy="31" r="1.6" fill="#1a1a1a" />
              {/* Smile */}
              <path d="M27 36 Q32 40 37 36" stroke="#7a3a2a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              {/* Cheek blush */}
              <circle cx="24" cy="35" r="1.4" fill="#ff9bb9" opacity="0.6" />
              <circle cx="40" cy="35" r="1.4" fill="#ff9bb9" opacity="0.6" />
              {/* Headset band */}
              <path d="M16 28 Q32 8 48 28" stroke="#ffffff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              {/* Ear cups */}
              <rect x="13" y="27" width="6" height="9" rx="2" fill="#ffffff" />
              <rect x="45" y="27" width="6" height="9" rx="2" fill="#ffffff" />
              {/* Mic boom */}
              <path d="M45 32 Q42 42 32 44" stroke="#ffffff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <circle cx="32" cy="45" r="2" fill="#ffffff" />
            </svg>
          </button>
        </div>
      )}

      {open && (
        <Card className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[92vw] h-[520px] max-h-[80vh] flex flex-col shadow-2xl border-primary/20">
          <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2"><Headset className="w-4 h-4" /><span className="font-semibold text-sm">Prescribly Assistant</span></div>
            <div className="flex items-center gap-1">
              <button onClick={dismiss} aria-label="Dismiss for this session" className="text-xs underline opacity-80 hover:opacity-100">Hide</button>
              <button onClick={() => setOpen(false)} aria-label="Close" className="ml-2"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-3" ref={scrollRef as any}>
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" />Hi! Pick a question or type your own:</p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map(q => (
                    <button key={q} onClick={() => send(q)} className="text-left text-sm p-2 rounded-md border hover:bg-accent transition-colors">{q}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`text-sm rounded-lg p-2 max-w-[85%] ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {m.content || (loading && i === messages.length - 1 ? "…" : "")}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="p-3 border-t flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message…" className="flex-1 text-sm rounded-md border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary" disabled={loading} />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}><Send className="w-4 h-4" /></Button>
          </form>
        </Card>
      )}
    </>
  );
};

export default AIChatBubble;
