import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reusable WebRTC call hook for the Consultation module.
 * Free/native browser WebRTC — Supabase Realtime is used purely for signaling
 * (offer / answer / ICE candidate exchange) via the `consultation_call_signals` table.
 *
 * Works for BOTH sides: the patient calls with `isCaller = true`,
 * the doctor answers with `isCaller = false`.
 */
export type CallState = "idle" | "connecting" | "connected" | "reconnecting" | "ended";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useConsultationCall(opts: {
  sessionId: string | null;
  isCaller: boolean;
  mode: "voice" | "video" | "chat";
  autoStart?: boolean;
}) {
  const { sessionId, isCaller, mode, autoStart } = opts;

  const [state, setState] = useState<CallState>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(mode === "video");
  const [speakerOn, setSpeakerOn] = useState(true);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const userIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const sendSignal = useCallback(
    async (signal_type: string, payload: unknown) => {
      if (!sessionId || !userIdRef.current) return;
      // --- SIGNALING: outbound offer / answer / ICE candidate ---
      await supabase.from("consultation_call_signals").insert({
        session_id: sessionId,
        sender_id: userIdRef.current,
        signal_type,
        payload: payload as any,
      });
    },
    [sessionId],
  );

  const cleanup = useCallback(() => {
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    setLocalStream((s) => {
      s?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setRemoteStream(null);
  }, []);

  const endCall = useCallback(() => {
    cleanup();
    setState("ended");
  }, [cleanup]);

  const start = useCallback(async () => {
    if (!sessionId || mode === "chat") return;
    setState("connecting");
    const { data: auth } = await supabase.auth.getUser();
    userIdRef.current = auth.user?.id ?? null;

    // --- MEDIA STREAM: acquire local mic/camera ---
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === "video",
    });
    setLocalStream(stream);

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const remote = new MediaStream();
    setRemoteStream(remote);
    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((t) => remote.addTrack(t));
      setRemoteStream(new MediaStream(remote.getTracks()));
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal("ice", e.candidate.toJSON());
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setState("connected");
      else if (s === "disconnected") setState("reconnecting");
      else if (s === "failed" || s === "closed") setState("ended");
    };

    // --- SIGNALING: inbound listener ---
    const channel = supabase
      .channel(`call-signals-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "consultation_call_signals",
          filter: `session_id=eq.${sessionId}`,
        },
        async ({ new: row }: any) => {
          if (row.sender_id === userIdRef.current) return;
          try {
            if (row.signal_type === "offer" && !isCaller) {
              await pc.setRemoteDescription(new RTCSessionDescription(row.payload));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendSignal("answer", answer);
            } else if (row.signal_type === "answer" && isCaller) {
              await pc.setRemoteDescription(new RTCSessionDescription(row.payload));
            } else if (row.signal_type === "ice") {
              await pc.addIceCandidate(new RTCIceCandidate(row.payload));
            } else if (row.signal_type === "hangup") {
              endCall();
            }
          } catch (err) {
            console.error("signal handling error", err);
          }
        },
      )
      .subscribe();
    channelRef.current = channel;

    if (isCaller) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal("offer", offer);
    }
  }, [sessionId, mode, isCaller, sendSignal, endCall]);

  useEffect(() => {
    if (autoStart && sessionId && mode !== "chat") {
      start().catch((e) => {
        console.error("call start failed", e);
        setState("ended");
      });
    }
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, sessionId, mode]);

  const toggleMic = () => {
    const next = !micOn;
    localStream?.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  };
  const toggleCam = () => {
    const next = !camOn;
    localStream?.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
  };
  const toggleSpeaker = () => setSpeakerOn((v) => !v);

  const hangup = async () => {
    await sendSignal("hangup", {});
    endCall();
  };

  return {
    state,
    localStream,
    remoteStream,
    micOn,
    camOn,
    speakerOn,
    toggleMic,
    toggleCam,
    toggleSpeaker,
    start,
    hangup,
  };
}
