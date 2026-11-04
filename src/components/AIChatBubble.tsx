import { useEffect, useRef, useState } from "react";
import { X, Send, Sparkles, Minus, Stethoscope, ShieldCheck, CalendarDays, Pill, Wallet, Activity, Moon, Droplets } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  { q: "What's my next appointment?", label: "Next appointment", Icon: CalendarDays },
  { q: "Show my active prescriptions", label: "My prescriptions", Icon: Pill },
  { q: "What does my last symptom check suggest?", label: "Last symptom check", Icon: Activity },
  { q: "How much have I paid for consultations?", label: "My payments", Icon: Wallet },
  { q: "Tips to improve my sleep", label: "Better sleep tips", Icon: Moon },
  { q: "How can I stay hydrated?", label: "Hydration tips", Icon: Droplets },
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

  const firstName = (user?.user_metadata as any)?.first_name || (user?.user_metadata as any)?.full_name?.split(" ")[0] || "";

  return (
    <>
      {!open && (
        <div className="fixed bottom-6 right-6 z-50 group">
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border bg-card/95 backdrop-blur px-3 py-1.5 text-xs font-medium text-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Ask PrescriblyCare AI
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss assistant"
            className="absolute -top-1.5 -left-1.5 z-10 h-5 w-5 rounded-full border bg-card text-muted-foreground grid place-items-center shadow opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
          <button
            onClick={() => setOpen(true)}
            aria-label="Open AI assistant"
            className="relative h-14 w-14 rounded-full grid place-items-center text-primary-foreground transition-transform duration-300 hover:scale-110 hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))", boxShadow: "0 10px 30px -6px hsl(var(--primary) / 0.55)" }}
          >
            <span className="absolute inset-0 rounded-full ring-4 ring-primary/15" aria-hidden />
            <Sparkles className="w-6 h-6" />
            <span className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-500" aria-hidden>
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
            </span>
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed z-50 inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px] h-[600px] max-h-[85vh] flex flex-col overflow-hidden rounded-3xl border bg-card/95 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-300"
          style={{ boxShadow: "0 24px 60px -12px hsl(var(--primary) / 0.35)" }}
        >
          {/* Header */}
          <div
            className="relative px-4 pt-4 pb-5 text-primary-foreground"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))" }}
          >
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-2xl bg-primary-foreground/20 backdrop-blur grid place-items-center">
                <Stethoscope className="w-5 h-5" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-primary bg-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">PrescriblyCare Assistant</p>
                <p className="text-[11px] opacity-85">Online · Your 24/7 health companion</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Minimize" className="h-8 w-8 rounded-full grid place-items-center hover:bg-primary-foreground/15 transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <button onClick={dismiss} aria-label="Close for this session" className="h-8 w-8 rounded-full grid place-items-center hover:bg-primary-foreground/15 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto -mt-3 rounded-t-3xl bg-card px-4 pt-5 pb-3 space-y-4">
            {messages.length === 0 ? (
              <>
                <AssistantRow>
                  <p className="font-medium">Hello{firstName ? ` ${firstName}` : ""}! 👋</p>
                  <p className="text-muted-foreground mt-0.5">I'm your PrescriblyCare health assistant. How can I help you today?</p>
                </AssistantRow>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Suggested topics</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SUGGESTIONS.map(({ q, label, Icon }) => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        className="group/s flex items-start gap-2 text-left rounded-2xl border bg-background p-3 hover:border-primary/40 hover:bg-primary/5 hover:-translate-y-0.5 transition-all"
                      >
                        <span className="h-7 w-7 shrink-0 rounded-xl bg-primary/10 text-primary grid place-items-center group-hover/s:bg-primary group-hover/s:text-primary-foreground transition-colors">
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-xs font-medium leading-snug text-foreground">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end animate-in fade-in slide-in-from-bottom-1">
                    <div
                      className="max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm text-primary-foreground shadow-sm whitespace-pre-wrap"
                      style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))" }}
                    >
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <AssistantRow key={i}>
                    {m.content ? <span className="whitespace-pre-wrap">{m.content}</span> : <TypingDots />}
                  </AssistantRow>
                )
              )
            )}
          </div>

          {/* Composer */}
          <div className="border-t bg-card px-3 pt-3 pb-2">
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2 rounded-full border bg-background pl-4 pr-1.5 py-1.5 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all"
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about symptoms, meds, visits…"
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="h-9 w-9 shrink-0 rounded-full grid place-items-center text-primary-foreground transition-all disabled:opacity-40 disabled:scale-95 hover:scale-105"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))" }}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <ShieldCheck className="w-3 h-3" /> Private & secure · For emergencies call 112
            </p>
          </div>
        </div>
      )}
    </>
  );
};

const AssistantRow = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-end gap-2 animate-in fade-in slide-in-from-bottom-1">
    <div
      className="h-7 w-7 shrink-0 rounded-full grid place-items-center text-primary-foreground"
      style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))" }}
    >
      <Sparkles className="w-3.5 h-3.5" />
    </div>
    <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm text-foreground">{children}</div>
  </div>
);

const TypingDots = () => (
  <span className="flex items-center gap-1 py-1" aria-label="Assistant is typing">
    {[0, 150, 300].map(d => (
      <span key={d} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: `${d}ms` }} />
    ))}
  </span>
);

export default AIChatBubble;
