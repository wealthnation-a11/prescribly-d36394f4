import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Star,
  Clock,
  ChevronLeft,
  FileText,
} from "lucide-react";
import RealtimeChat from "@/components/consultation/RealtimeChat";
import { StepTracker } from "@/components/consultation/StepTracker";
import { CT, mmss } from "@/components/consultation/consultationTheme";
import { useConsultationCall } from "@/hooks/useConsultationCall";

interface SessionRow {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  mode: "chat" | "voice" | "video";
  status: string;
  started_at: string | null;
  ends_at: string | null;
}

export default function LiveConsultation() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState("Your doctor");
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const [warned, setWarned] = useState(false);
  const [ended, setEnded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const endingRef = useRef(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [minimizedChat, setMinimizedChat] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const isPatient = !!session && session.patient_id === userId;

  const call = useConsultationCall({
    sessionId: sessionId ?? null,
    isCaller: isPatient,
    mode: session?.mode ?? "chat",
    autoStart: !!session && session.mode !== "chat" && !ended,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      const { data, error } = await supabase
        .from("consultation_sessions")
        .select("id,patient_id,doctor_id,mode,status,started_at,ends_at")
        .eq("id", sessionId)
        .maybeSingle();
      if (error || !data) {
        toast.error("Consultation not found");
        navigate("/dashboard");
        return;
      }
      setSession(data as SessionRow);
      if (data.status === "completed") setEnded(true);
      if (data.doctor_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name,last_name")
          .eq("user_id", data.doctor_id)
          .maybeSingle();
        if (prof) setDoctorName(`Dr. ${prof.first_name ?? ""} ${prof.last_name ?? ""}`.trim());
      }
    })();
  }, [sessionId, navigate]);

  // Server-authoritative countdown
  useEffect(() => {
    if (!session?.ends_at || ended) return;
    const tick = () => {
      const left = Math.floor((new Date(session.ends_at!).getTime() - Date.now()) / 1000);
      setSecondsLeft(left);
      if (left <= 300 && left > 0 && !warned) {
        setWarned(true);
        toast.warning("5 minutes remaining in this consultation");
      }
      if (left <= 0) handleEnd();
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.ends_at, ended, warned]);

  useEffect(() => {
    if (localVideoRef.current && call.localStream)
      localVideoRef.current.srcObject = call.localStream;
  }, [call.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && call.remoteStream)
      remoteVideoRef.current.srcObject = call.remoteStream;
    if (remoteAudioRef.current && call.remoteStream)
      remoteAudioRef.current.srcObject = call.remoteStream;
  }, [call.remoteStream]);

  useEffect(() => {
    if (remoteAudioRef.current) remoteAudioRef.current.muted = !call.speakerOn;
  }, [call.speakerOn]);

  const handleEnd = async () => {
    if (ended) return;
    setEnded(true);
    call.hangup();
    if (sessionId) {
      await supabase
        .from("consultation_sessions")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", sessionId);
    }
  };

  const extend = async () => {
    if (!sessionId || !session?.ends_at) return;
    const next = new Date(new Date(session.ends_at).getTime() + 10 * 60 * 1000).toISOString();
    await supabase.from("consultation_sessions").update({ ends_at: next }).eq("id", sessionId);
    setSession({ ...session, ends_at: next });
    setWarned(false);
    toast.success("Consultation extended by 10 minutes");
  };

  const submitRating = async () => {
    if (!session?.doctor_id || !userId || !rating) {
      navigate("/consultation/prescription" + (sessionId ? `?session=${sessionId}` : ""));
      return;
    }
    await supabase.from("doctor_reviews").insert({
      doctor_id: session.doctor_id,
      patient_id: userId,
      rating,
      comment: feedback || null,
    } as any);
    toast.success("Thank you for your feedback");
    navigate("/consultation/prescription" + (sessionId ? `?session=${sessionId}` : ""));
  };

  /* --------------- SCREEN 8C: SUMMARY --------------- */
  if (ended) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex-1 max-w-md w-full mx-auto px-5 pt-12 text-center">
          <h1 className="text-2xl font-bold" style={{ color: CT.navy }}>
            Consultation ended
          </h1>
          <p className="text-sm mt-2" style={{ color: CT.muted }}>
            You spoke with {doctorName}
          </p>

          <div
            className="mt-6 rounded-2xl border p-5"
            style={{ borderColor: CT.border, backgroundColor: CT.gray }}
          >
            <p className="text-sm font-semibold mb-3" style={{ color: CT.navy }}>
              How was your consultation?
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className="active:scale-90 transition">
                  <Star
                    className="w-8 h-8"
                    style={{
                      color: n <= rating ? "#F59E0B" : "#CBD5E1",
                      fill: n <= rating ? "#F59E0B" : "transparent",
                    }}
                  />
                </button>
              ))}
            </div>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your feedback (optional)"
              className="mt-4 rounded-xl bg-white"
            />
          </div>

          <Button
            className="w-full h-12 rounded-xl mt-6"
            style={{ backgroundColor: CT.blue }}
            onClick={submitRating}
          >
            <FileText className="w-4 h-4 mr-2" /> View prescription
          </Button>
          <button
            className="w-full py-3 text-sm font-medium"
            style={{ color: CT.muted }}
            onClick={() => navigate("/dashboard")}
          >
            Back to dashboard
          </button>
        </div>
        <div className="max-w-md w-full mx-auto">
          <StepTracker current="live" />
        </div>
      </div>
    );
  }

  const isCall = session?.mode === "voice" || session?.mode === "video";
  const timerColor = secondsLeft <= 300 ? CT.red : "#FFFFFF";

  /* --------------- SCREEN 8B: VOICE / VIDEO --------------- */
  if (isCall) {
    return (
      <div className="min-h-screen relative" style={{ backgroundColor: CT.navy }}>
        {session?.mode === "video" && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <audio ref={remoteAudioRef} autoPlay />

        <div className="relative z-10 flex flex-col h-screen">
          <div className="flex items-center justify-between px-5 pt-5">
            <div>
              <p className="text-white font-semibold">{doctorName}</p>
              <p className="text-xs text-white/60">
                {call.state === "connected"
                  ? "Connected"
                  : call.state === "reconnecting"
                    ? "Reconnecting..."
                    : "Connecting..."}
              </p>
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10"
              style={{ color: timerColor }}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono text-sm">{mmss(secondsLeft)}</span>
            </div>
          </div>

          {session?.mode === "voice" && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-white/10 flex items-center justify-center text-3xl font-bold text-white">
                {doctorName.replace("Dr. ", "").charAt(0)}
              </div>
              <p className="text-white text-lg font-semibold mt-5">{doctorName}</p>
            </div>
          )}

          {session?.mode === "video" && (
            <div className="flex-1 relative">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-4 right-4 w-28 h-40 rounded-2xl object-cover border-2 border-white/20"
                style={{ transform: "scaleX(-1)" }}
              />
            </div>
          )}

          {secondsLeft <= 300 && secondsLeft > 0 && (
            <div className="mx-5 mb-3 rounded-xl px-4 py-3 bg-white/10 flex items-center justify-between">
              <span className="text-sm text-white">5 minutes left</span>
              <Button size="sm" variant="secondary" onClick={extend}>
                Extend +10 min
              </Button>
            </div>
          )}

          <div className="px-5 pb-8 flex items-center justify-center gap-4">
            <button
              onClick={call.toggleMic}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 text-white"
            >
              {call.micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            {session?.mode === "video" && (
              <button
                onClick={call.toggleCam}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 text-white"
              >
                {call.camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={call.toggleSpeaker}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 text-white"
            >
              {call.speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={handleEnd}
              className="w-16 h-16 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: CT.red }}
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Slide-up chat during a call */}
        <div
          className="absolute left-0 right-0 bottom-0 z-20 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300"
          style={{
            height: "70vh",
            transform: minimizedChat ? "translateY(calc(100% - 44px))" : "translateY(0)",
          }}
        >
          <button
            className="w-full h-11 flex items-center justify-center gap-2 text-sm font-medium"
            style={{ color: CT.navy }}
            onClick={() => setMinimizedChat((v) => !v)}
          >
            <ChevronLeft
              className={`w-4 h-4 transition-transform ${minimizedChat ? "rotate-90" : "-rotate-90"}`}
            />
            {minimizedChat ? "Open chat" : "Hide chat"}
          </button>
          <div className="h-[calc(70vh-44px)]">
            {sessionId && (
              <RealtimeChat
                kind="consultation"
                parentId={sessionId}
                myRole={isPatient ? "patient" : "doctor"}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  /* --------------- SCREEN 8A: CHAT CONSULTATION --------------- */
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col relative">
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: CT.border }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
              style={{ backgroundColor: CT.blueSoft, color: CT.blue }}
            >
              {doctorName.replace("Dr. ", "").charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: CT.navy }}>
                {doctorName}
              </p>
              <p className="text-[11px]" style={{ color: CT.green }}>
                Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-xs px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: secondsLeft <= 300 ? "#FEF2F2" : CT.gray,
                color: secondsLeft <= 300 ? CT.red : CT.navy,
              }}
            >
              {mmss(secondsLeft)}
            </span>
            <button onClick={handleEnd} className="p-2 rounded-full" style={{ color: CT.red }}>
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {secondsLeft <= 300 && secondsLeft > 0 && (
          <div
            className="mx-4 mt-3 rounded-xl px-4 py-2.5 flex items-center justify-between"
            style={{ backgroundColor: "#FEF2F2" }}
          >
            <span className="text-sm" style={{ color: CT.red }}>
              5 minutes left
            </span>
            <Button size="sm" variant="outline" onClick={extend}>
              Extend +10 min
            </Button>
          </div>
        )}

        <div className="flex-1 min-h-0">
          {sessionId && (
            <RealtimeChat
              kind="consultation"
              parentId={sessionId}
              myRole={isPatient ? "patient" : "doctor"}
            />
          )}
        </div>
      </div>
      <div className="max-w-md w-full mx-auto">
        <StepTracker current="live" />
      </div>
    </div>
  );
}
