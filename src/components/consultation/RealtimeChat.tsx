import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Paperclip,
  Camera,
  ImageIcon,
  Send,
  X,
  ChevronDown,
  RefreshCw,
  Check,
  CheckCheck,
} from "lucide-react";
import { CT } from "./consultationTheme";

export type ChatKind = "consultation" | "pharmacy";

export interface ChatMessage {
  id: string;
  sender_id: string | null;
  sender_role: string;
  message_type: string;
  content: string | null;
  image_url: string | null;
  read_at?: string | null;
  created_at: string;
}

interface Props {
  kind: ChatKind;
  parentId: string;
  myRole: "patient" | "doctor" | "pharmacy" | "rider";
  disabled?: boolean;
  headerSlot?: React.ReactNode;
  className?: string;
}

const TABLE = { consultation: "consultation_messages", pharmacy: "pharmacy_messages" } as const;
const FK = { consultation: "session_id", pharmacy: "order_id" } as const;

/** Client-side compression so patients spend as little mobile data as possible. */
async function compressImage(file: File, maxWidth = 1280, quality = 0.7): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
    return blob ?? file;
  } catch {
    return file;
  }
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function RealtimeChat({ kind, parentId, myRole, disabled, headerSlot, className }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState<File | null>(null);
  const [typingPeer, setTypingPeer] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const typingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const table = TABLE[kind];
  const fk = FK[kind];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Initial load
  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .eq(fk, parentId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("chat load error", error);
        return;
      }
      if (!cancelled) {
        setMessages((data ?? []) as unknown as ChatMessage[]);
        setTimeout(() => scrollToBottom(false), 50);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [parentId, table, fk, scrollToBottom]);

  // Realtime messages + typing presence/broadcast
  useEffect(() => {
    if (!parentId) return;
    const channel = supabase
      .channel(`${kind}-chat-${parentId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter: `${fk}=eq.${parentId}` },
        (payload) => {
          const msg = payload.new as unknown as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          setTimeout(() => {
            const el = scrollRef.current;
            if (!el) return;
            const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
            if (nearBottom) scrollToBottom();
            else setShowJump(true);
          }, 30);
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.role !== myRole) {
          setTypingPeer(true);
          setTimeout(() => setTypingPeer(false), 2500);
        }
      })
      .subscribe();
    typingChannel.current = channel;
    return () => {
      supabase.removeChannel(channel);
      typingChannel.current = null;
    };
  }, [parentId, kind, table, fk, myRole, scrollToBottom]);

  // Mark peer messages as read (delivery ticks)
  useEffect(() => {
    if (kind !== "consultation" || !userId) return;
    const unread = messages.filter((m) => m.sender_id !== userId && !m.read_at).map((m) => m.id);
    if (!unread.length) return;
    supabase
      .from("consultation_messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread)
      .then(({ error }) => error && console.error(error));
  }, [messages, userId, kind]);

  const pickFile = async (file?: File | null) => {
    if (!file) return;
    setFailed(null);
    setPending({ file, preview: URL.createObjectURL(file) });
    setShowAttach(false);
  };

  const uploadAndSend = async (file: File, caption: string) => {
    setUploading(true);
    setProgress(15);
    try {
      const blob = await compressImage(file);
      setProgress(45);
      const path = `${kind}/${parentId}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("chat-files")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;
      setProgress(75);
      const { data: signed } = await supabase.storage
        .from("chat-files")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      setProgress(90);
      await insertMessage({
        message_type: "image",
        content: caption || null,
        image_url: signed?.signedUrl ?? null,
      });
      setProgress(100);
      setPending(null);
    } catch (e: any) {
      console.error("upload failed", e);
      setFailed(file);
      toast.error("Image upload failed. Tap retry.");
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 400);
    }
  };

  const insertMessage = async (partial: Partial<ChatMessage>) => {
    if (!userId) return;
    const row: Record<string, any> = {
      [fk]: parentId,
      sender_id: userId,
      sender_role: myRole,
      message_type: partial.message_type ?? "text",
      content: partial.content ?? null,
      image_url: partial.image_url ?? null,
    };
    const { data, error } = await supabase.from(table as any).insert(row).select().single();
    if (error) {
      toast.error("Message failed to send");
      throw error;
    }
    const msg = data as unknown as ChatMessage;
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    setTimeout(() => scrollToBottom(), 30);
  };

  const handleSend = async () => {
    if (disabled) return;
    if (pending) {
      await uploadAndSend(pending.file, text.trim());
      setText("");
      return;
    }
    const value = text.trim();
    if (!value) return;
    setText("");
    try {
      await insertMessage({ message_type: "text", content: value });
    } catch {
      setText(value);
    }
  };

  const grouped = useMemo(() => {
    const out: { label: string; items: ChatMessage[] }[] = [];
    messages.forEach((m) => {
      const label = dayLabel(m.created_at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(m);
      else out.push({ label, items: [m] });
    });
    return out;
  }, [messages]);

  return (
    <div className={`flex flex-col h-full bg-white ${className ?? ""}`}>
      {headerSlot}

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
        }}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        style={{ backgroundColor: CT.gray }}
      >
        {grouped.map((g) => (
          <div key={g.label} className="space-y-2">
            <div className="flex justify-center">
              <span
                className="text-[11px] px-3 py-1 rounded-full bg-white"
                style={{ color: CT.muted }}
              >
                {g.label}
              </span>
            </div>
            {g.items.map((m) => {
              const mine = m.sender_id === userId;
              const system = m.sender_role === "system";
              if (system) {
                return (
                  <div key={m.id} className="flex justify-center">
                    <span
                      className="text-[11px] px-3 py-1.5 rounded-full text-center max-w-[85%]"
                      style={{ backgroundColor: "#FFF7E6", color: "#92400E" }}
                    >
                      {m.content}
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  <div
                    className={`max-w-[78%] px-3 py-2 shadow-sm ${
                      mine ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm"
                    }`}
                    style={{
                      backgroundColor: mine ? CT.blue : "#FFFFFF",
                      color: mine ? "#FFFFFF" : CT.text,
                    }}
                  >
                    {m.message_type === "image" && m.image_url && (
                      <button onClick={() => setViewer(m.image_url!)} className="block mb-1">
                        <img
                          src={m.image_url}
                          alt="Shared in consultation"
                          loading="lazy"
                          className="rounded-lg max-h-56 object-cover"
                        />
                      </button>
                    )}
                    {m.content && <p className="text-sm whitespace-pre-wrap">{m.content}</p>}
                    <div
                      className="flex items-center justify-end gap-1 mt-1 text-[10px]"
                      style={{ color: mine ? "rgba(255,255,255,.75)" : CT.muted }}
                    >
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {mine &&
                        (m.read_at ? (
                          <CheckCheck className="w-3 h-3" />
                        ) : (
                          <Check className="w-3 h-3" />
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {typingPeer && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: CT.muted, animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {showJump && (
        <button
          onClick={() => {
            scrollToBottom();
            setShowJump(false);
          }}
          className="absolute bottom-28 right-4 rounded-full shadow-lg p-2"
          style={{ backgroundColor: CT.navy, color: "#fff" }}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Pending image preview */}
      {pending && (
        <div
          className="px-4 py-2 border-t flex items-center gap-3"
          style={{ borderColor: CT.border }}
        >
          <div className="relative">
            <img src={pending.preview} alt="Preview" className="w-14 h-14 rounded-lg object-cover" />
            <button
              onClick={() => setPending(null)}
              className="absolute -top-1 -right-1 bg-black/70 rounded-full p-0.5"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
          <div className="flex-1">
            <p className="text-xs" style={{ color: CT.muted }}>
              Add an optional caption, then send.
            </p>
            {uploading && (
              <div className="h-1.5 rounded-full mt-2 bg-gray-200 overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{ width: `${progress}%`, backgroundColor: CT.blue }}
                />
              </div>
            )}
          </div>
          {failed && (
            <Button size="sm" variant="outline" onClick={() => uploadAndSend(failed, text.trim())}>
              <RefreshCw className="w-3 h-3 mr-1" /> Retry
            </Button>
          )}
        </div>
      )}

      {/* Attach menu */}
      {showAttach && (
        <div className="px-4 pb-2 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => cameraRef.current?.click()}>
            <Camera className="w-4 h-4 mr-1" /> Take Photo
          </Button>
          <Button variant="outline" size="sm" onClick={() => galleryRef.current?.click()}>
            <ImageIcon className="w-4 h-4 mr-1" /> Choose from Gallery
          </Button>
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => pickFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/png,image/jpeg,image/heic,image/*"
        hidden
        onChange={(e) => pickFile(e.target.files?.[0])}
      />

      <div
        className="flex items-center gap-2 px-3 py-2 border-t bg-white"
        style={{ borderColor: CT.border }}
      >
        <button
          onClick={() => setShowAttach((v) => !v)}
          disabled={disabled}
          className="p-2 rounded-full"
          style={{ color: CT.navy }}
          aria-label="Attach"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <Input
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            typingChannel.current?.send({
              type: "broadcast",
              event: "typing",
              payload: { role: myRole },
            });
          }}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder={disabled ? "This conversation has ended" : "Type a message..."}
          className="rounded-full"
        />
        <button
          onClick={handleSend}
          disabled={disabled || uploading}
          className="p-2.5 rounded-full disabled:opacity-50"
          style={{ backgroundColor: CT.blue, color: "#fff" }}
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {viewer && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setViewer(null)}
        >
          <button className="absolute top-5 right-5 text-white" onClick={() => setViewer(null)}>
            <X className="w-6 h-6" />
          </button>
          <img src={viewer} alt="Full size" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}

export default RealtimeChat;
