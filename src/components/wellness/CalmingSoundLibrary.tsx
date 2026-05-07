import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Play, Pause, ListMusic, Plus } from "lucide-react";
import { CALMING_TRACKS, playCalmingTrack } from "@/lib/wellnessAlarm";
import { toast } from "@/hooks/use-toast";

const FAV_KEY = "med_fav_tracks";
const PLAY_KEY = "med_playlist_tracks";

export type CalmingControls = {
  selectedId: string | null;
  isPlaying: boolean;
  play: (id: string) => void;
  stop: () => void;
};

export function useCalmingPlayer(): CalmingControls {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const handleRef = useRef<{ stop: () => void } | null>(null);

  const stop = () => {
    if (handleRef.current) { handleRef.current.stop(); handleRef.current = null; }
    setIsPlaying(false);
  };
  const play = (id: string) => {
    stop();
    const h = playCalmingTrack(id);
    if (!h) { toast({ title: "Audio unavailable", variant: "destructive" }); return; }
    handleRef.current = h;
    setSelectedId(id);
    setIsPlaying(true);
  };
  useEffect(() => () => stop(), []);
  return { selectedId, isPlaying, play, stop };
}

export default function CalmingSoundLibrary({ controls }: { controls: CalmingControls }) {
  const [favs, setFavs] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]"); } catch { return []; } });
  const [playlist, setPlaylist] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(PLAY_KEY) ?? "[]"); } catch { return []; } });

  const toggleFav = (id: string) => {
    const next = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
    setFavs(next); localStorage.setItem(FAV_KEY, JSON.stringify(next));
  };
  const addToPlaylist = (id: string) => {
    if (playlist.includes(id)) return;
    const next = [...playlist, id];
    setPlaylist(next); localStorage.setItem(PLAY_KEY, JSON.stringify(next));
    toast({ title: "Added to playlist" });
  };

  return (
    <Card className="glassmorphism-card border-0 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ListMusic className="w-5 h-5 text-purple-500" /> Calming Sounds</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">Auto-generated soundscapes — pick one to meditate to.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {CALMING_TRACKS.map(t => {
            const playing = controls.selectedId === t.id && controls.isPlaying;
            const isFav = favs.includes(t.id);
            return (
              <div key={t.id} className={`rounded-lg border p-3 ${playing ? "border-purple-400 bg-purple-50/40" : ""}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                  {isFav && <Badge variant="secondary">★ Favorite</Badge>}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant={playing ? "secondary" : "default"} onClick={() => playing ? controls.stop() : controls.play(t.id)}>
                    {playing ? <><Pause className="w-3 h-3 mr-1" /> Stop</> : <><Play className="w-3 h-3 mr-1" /> Play</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleFav(t.id)}><Heart className={`w-3 h-3 mr-1 ${isFav ? "fill-current text-red-500" : ""}`} /> {isFav ? "Unfav" : "Fav"}</Button>
                  <Button size="sm" variant="outline" onClick={() => addToPlaylist(t.id)}><Plus className="w-3 h-3 mr-1" /> Playlist</Button>
                </div>
              </div>
            );
          })}
        </div>

        {playlist.length > 0 && (
          <div className="mt-4 rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Your playlist</p>
            <div className="flex flex-wrap gap-2">
              {playlist.map(id => {
                const t = CALMING_TRACKS.find(x => x.id === id); if (!t) return null;
                return <Badge key={id} variant="outline" className="cursor-pointer" onClick={() => controls.play(id)}>▶ {t.name}</Badge>;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
