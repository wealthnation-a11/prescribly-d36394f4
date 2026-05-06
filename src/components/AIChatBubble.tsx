import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's my next appointment?",
  "Show my active prescriptions",
  "How much have I paid for consultations?",
  "What does my last symptom check suggest?",
  "Tips to improve my sleep",
  "How can I stay hydrated?",
];

export const AIChatBubble = () => {
  const { user, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  if (!user) return null;

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
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 rounded-full bg-primary text-primary-foreground shadow-lg px-5 py-3 flex items-center gap-2 hover:scale-105 transition-transform"
          aria-label="Open AI assistant"
        >
          <Sparkles className="w-4 h-4" />
          <span className="font-medium text-sm">Ask me anything</span>
        </button>
      )}

      {open && (
        <Card className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[92vw] h-[520px] max-h-[80vh] flex flex-col shadow-2xl border-primary/20">
          <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2"><Sparkles className="w-4 h-4" /><span className="font-semibold text-sm">Prescribly AI</span></div>
            <button onClick={() => setOpen(false)} aria-label="Close"><X className="w-4 h-4" /></button>
          </div>

          <ScrollArea className="flex-1 p-3" ref={scrollRef as any}>
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Hi! Pick a question or type your own:</p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map(q => (
                    <button key={q} onClick={() => send(q)} className="text-left text-sm p-2 rounded-md border hover:bg-accent transition-colors">
                      {q}
                    </button>
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
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 text-sm rounded-md border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}><Send className="w-4 h-4" /></Button>
          </form>
        </Card>
      )}
    </>
  );
};

export default AIChatBubble;
