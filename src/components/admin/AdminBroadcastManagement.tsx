import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Trash2, Send } from "lucide-react";

interface Broadcast {
  id: string;
  title: string;
  message: string;
  cta_label: string | null;
  cta_url: string | null;
  active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

export default function AdminBroadcastManagement() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [sending, setSending] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_broadcasts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setBroadcasts((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Missing fields", description: "Title and message are required.", variant: "destructive" });
      return;
    }
    setSending(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("admin_broadcasts").insert({
      title: title.trim(),
      message: message.trim(),
      cta_label: ctaLabel.trim() || null,
      cta_url: ctaUrl.trim() || null,
      active: true,
      starts_at: new Date().toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      created_by: auth.user?.id ?? null,
    } as any);
    setSending(false);
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Broadcast sent", description: "All users will see this popup on their next visit." });
    setTitle("");
    setMessage("");
    setCtaLabel("");
    setCtaUrl("");
    setEndsAt("");
    load();
  };

  const toggleActive = async (b: Broadcast) => {
    const { error } = await supabase.from("admin_broadcasts").update({ active: !b.active } as any).eq("id", b.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else load();
  };

  const remove = async (b: Broadcast) => {
    if (!confirm("Delete this broadcast?")) return;
    const { error } = await supabase.from("admin_broadcasts").delete().eq("id", b.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Send Popup Broadcast
          </CardTitle>
          <CardDescription>Type a message and it will appear as a popup for every user.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New Feature Alert" maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What do you want your users to see?" rows={4} maxLength={2000} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CTA Button Label (optional)</Label>
              <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Learn More" maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label>CTA URL (optional)</Label>
              <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ends At (optional)</Label>
            <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
          <Button onClick={handleSend} disabled={sending} className="w-full gap-2">
            <Send className="h-4 w-4" />
            {sending ? "Sending..." : "Send to All Users"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Broadcast History</CardTitle>
          <CardDescription>Toggle a broadcast off to stop showing it. Delete removes it entirely.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : broadcasts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No broadcasts yet.</p>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((b) => (
                <div key={b.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{b.title}</h4>
                      {b.active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{b.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sent {new Date(b.created_at).toLocaleString()}
                      {b.ends_at ? ` · Ends ${new Date(b.ends_at).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={b.active} onCheckedChange={() => toggleActive(b)} />
                    <Button size="icon" variant="ghost" onClick={() => remove(b)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
