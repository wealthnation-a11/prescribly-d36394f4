import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  ArrowLeft,
  Zap,
  CalendarClock,
  MessageSquare,
  Phone,
  Video,
  AlertTriangle,
  Star,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Volume2,
  VolumeX,
  CreditCard,
  Landmark,
  Wallet,
} from "lucide-react";
import { StepTracker, type ConsultationStepKey } from "@/components/consultation/StepTracker";
import {
  CT,
  CONSULTATION_FEE,
  DEFAULT_WAITING_AUDIO_URL,
  formatNaira,
} from "@/components/consultation/consultationTheme";
import { useConsultationPayment } from "@/hooks/useConsultationPayment";

const DURATIONS = ["Today", "1-3 days", "1 week", "More than a week"];
const OTHER_SYMPTOMS = [
  "Fever",
  "Cough",
  "Headache",
  "Nausea",
  "Fatigue",
  "Dizziness",
  "Body pain",
  "Rash",
  "Sore throat",
];
const CONDITIONS = ["Diabetes", "Hypertension", "Asthma", "Ulcer", "None"];

const EMERGENCY_KEYWORDS = [
  "chest pain",
  "difficulty breathing",
  "can't breathe",
  "cannot breathe",
  "severe bleeding",
  "bleeding heavily",
  "unconscious",
  "stroke",
  "seizure",
  "suicid",
  "collapsed",
  "heart attack",
];

type Mode = "chat" | "voice" | "video";

interface DoctorMatch {
  user_id: string;
  name: string;
  specialization: string;
  rating: number;
  reviews: number;
  years: number;
  avatar?: string | null;
}

const Card = ({
  children,
  className = "",
  onClick,
  selected,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 active:scale-[.98] ${className}`}
    style={{
      borderColor: selected ? CT.blue : CT.border,
      backgroundColor: selected ? CT.blueSoft : "#fff",
      boxShadow: selected ? `0 0 0 2px ${CT.blue}22` : "0 1px 2px rgba(15,30,61,.05)",
    }}
  >
    {children}
  </button>
);

const Chip = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="px-3.5 py-2 rounded-full text-sm border transition-all duration-200 active:scale-95"
    style={{
      borderColor: active ? CT.blue : CT.border,
      backgroundColor: active ? CT.blue : "#fff",
      color: active ? "#fff" : CT.text,
    }}
  >
    {label}
  </button>
);

export default function ConsultationFlow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const { initializePayment, loading: payLoading } = useConsultationPayment();

  const [step, setStep] = useState<ConsultationStepKey>("type");
  const [consultType, setConsultType] = useState<"talk_now" | "book_later">("talk_now");
  const [mode, setMode] = useState<Mode>("chat");
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState(5);
  const [otherSymptoms, setOtherSymptoms] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [emergency, setEmergency] = useState(false);
  const [doctor, setDoctor] = useState<DoctorMatch | null>(null);
  const [matching, setMatching] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<"card" | "transfer" | "ussd">("card");
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [musicOn, setMusicOn] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Restore after returning from the payment gateway
  useEffect(() => {
    const pendingId = localStorage.getItem("consultation_flow_session");
    const status = params.get("status");
    if (pendingId && (status === "successful" || status === "completed")) {
      setSessionId(pendingId);
      localStorage.removeItem("consultation_flow_session");
      (async () => {
        const { data } = await supabase
          .from("consultation_sessions")
          .select("*")
          .eq("id", pendingId)
          .maybeSingle();
        if (data) {
          setMode(data.mode as Mode);
          setConsultType(data.consult_type as any);
          await supabase
            .from("consultation_sessions")
            .update({ status: "paid" })
            .eq("id", pendingId);
          await loadDoctor(data.doctor_id);
        }
        setStep("confirmation");
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDoctor = async (doctorUserId: string | null) => {
    if (!doctorUserId) return;
    const { data: doc } = await supabase
      .from("doctors")
      .select("user_id, specialization, rating, total_reviews, years_of_experience")
      .eq("user_id", doctorUserId)
      .maybeSingle();
    const { data: prof } = await supabase
      .from("profiles")
      .select("first_name,last_name,avatar_url")
      .eq("user_id", doctorUserId)
      .maybeSingle();
    if (doc) {
      setDoctor({
        user_id: doc.user_id!,
        name: `Dr. ${prof?.first_name ?? ""} ${prof?.last_name ?? ""}`.trim(),
        specialization: doc.specialization ?? "General Practitioner",
        rating: Number(doc.rating ?? 4.8),
        reviews: doc.total_reviews ?? 0,
        years: doc.years_of_experience ?? 5,
        avatar: (prof as any)?.avatar_url ?? null,
      });
    }
  };

  // Emergency keyword detection
  useEffect(() => {
    const t = symptoms.toLowerCase();
    setEmergency(EMERGENCY_KEYWORDS.some((k) => t.includes(k)));
  }, [symptoms]);

  // Waiting-room timer + music
  useEffect(() => {
    if (step !== "waiting") return;
    const i = setInterval(() => setWaitSeconds((s) => s + 1), 1000);
    audioRef.current?.play().catch(() => undefined);
    return () => {
      clearInterval(i);
      audioRef.current?.pause();
    };
  }, [step]);

  // Doctor accepts -> go live
  useEffect(() => {
    if (step !== "waiting" || !sessionId) return;
    const channel = supabase
      .channel(`consult-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "consultation_sessions",
          filter: `id=eq.${sessionId}`,
        },
        ({ new: row }: any) => {
          if (row.status === "active") navigate(`/consultation/${sessionId}/live`);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [step, sessionId, navigate]);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const runMatching = async () => {
    setStep("matching");
    setMatching(true);
    const { data } = await supabase
      .from("doctors")
      .select("user_id, specialization, rating, total_reviews, years_of_experience")
      .eq("verification_status", "approved")
      .order("rating", { ascending: false })
      .limit(1);
    const found = data?.[0];
    if (found?.user_id) {
      await loadDoctor(found.user_id);
    } else {
      setDoctor({
        user_id: "",
        name: "Next available doctor",
        specialization: "General Practitioner",
        rating: 4.8,
        reviews: 0,
        years: 5,
      });
    }
    setTimeout(() => setMatching(false), 1400);
  };

  const createSession = async () => {
    if (!user?.id) {
      toast.error("Please sign in to continue");
      return null;
    }
    if (sessionId) return sessionId;
    const { data, error } = await supabase
      .from("consultation_sessions")
      .insert({
        patient_id: user.id,
        doctor_id: doctor?.user_id || null,
        consult_type: consultType,
        mode,
        symptoms,
        duration_answer: duration,
        severity,
        other_symptoms: otherSymptoms,
        conditions,
        is_emergency: emergency,
        status: "pending_payment",
        fee: CONSULTATION_FEE,
      })
      .select("id")
      .single();
    if (error) {
      console.error(error);
      toast.error("Could not start consultation");
      return null;
    }
    setSessionId(data.id);
    return data.id;
  };

  const handlePay = async () => {
    const id = await createSession();
    if (!id) return;
    await supabase
      .from("consultation_sessions")
      .update({ payment_method: payMethod })
      .eq("id", id);
    localStorage.setItem("consultation_flow_session", id);
    const url = await initializePayment(id, {
      metadata: { consultation_session_id: id, flow: "consultation" },
    });
    if (url) window.location.href = url;
  };

  const enterWaiting = async () => {
    if (sessionId) {
      await supabase
        .from("consultation_sessions")
        .update({ status: "waiting" })
        .eq("id", sessionId);
    }
    setStep("waiting");
  };

  const header = (title: string, subtitle?: string, back?: () => void) => (
    <div className="px-5 pt-5 pb-3">
      {back && (
        <button onClick={back} className="mb-3 -ml-1 p-1" aria-label="Back">
          <ArrowLeft className="w-5 h-5" style={{ color: CT.navy }} />
        </button>
      )}
      <h1 className="text-2xl font-bold leading-tight" style={{ color: CT.navy }}>
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm mt-1.5" style={{ color: CT.muted }}>
          {subtitle}
        </p>
      )}
    </div>
  );

  const modeMeta: Record<Mode, { icon: any; title: string; desc: string }> = {
    chat: { icon: MessageSquare, title: "Chat", desc: "Text-based consultation with your doctor" },
    voice: { icon: Phone, title: "Voice Call", desc: "Speak directly with your doctor" },
    video: { icon: Video, title: "Video Call", desc: "Face-to-face consultation" },
  };

  const content = useMemo(() => {
    switch (step) {
      /* ---------------- SCREEN 1: TYPE ---------------- */
      case "type":
        return (
          <div key="type" className="animate-fade-in">
            {header("How would you like to consult?", "Choose what works for you right now.", () =>
              navigate(-1),
            )}
            <div className="px-5 space-y-3">
              <Card
                selected={consultType === "talk_now"}
                onClick={() => setConsultType("talk_now")}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: CT.blueSoft }}
                  >
                    <Zap className="w-5 h-5" style={{ color: CT.blue }} />
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: CT.navy }}>
                      Talk to a doctor now
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: CT.muted }}>
                      Connect instantly with an available doctor
                    </p>
                    <span
                      className="inline-block mt-2 text-[11px] font-medium px-2 py-1 rounded-full"
                      style={{ backgroundColor: "#DCFCE7", color: CT.green }}
                    >
                      Avg. wait 2 mins
                    </span>
                  </div>
                </div>
              </Card>

              <Card
                selected={consultType === "book_later"}
                onClick={() => setConsultType("book_later")}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "#F1F5F9" }}
                  >
                    <CalendarClock className="w-5 h-5" style={{ color: CT.navy }} />
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: CT.navy }}>
                      Book for later
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: CT.muted }}>
                      Schedule an appointment at a time that suits you
                    </p>
                  </div>
                </div>
              </Card>
            </div>
            <div className="px-5 mt-6">
              <Button
                className="w-full h-12 rounded-xl text-base"
                style={{ backgroundColor: CT.blue }}
                onClick={() =>
                  consultType === "book_later"
                    ? navigate("/book-appointment")
                    : setStep("mode")
                }
              >
                Continue
              </Button>
            </div>
          </div>
        );

      /* ---------------- SCREEN 2: MODE ---------------- */
      case "mode":
        return (
          <div key="mode" className="animate-fade-in">
            {header("How do you want to consult?", "Pick your preferred way to talk.", () =>
              setStep("type"),
            )}
            <div className="px-5 space-y-3">
              {(Object.keys(modeMeta) as Mode[]).map((m) => {
                const Meta = modeMeta[m];
                return (
                  <Card key={m} selected={mode === m} onClick={() => setMode(m)}>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: mode === m ? CT.blue : CT.blueSoft }}
                      >
                        <Meta.icon
                          className="w-5 h-5"
                          style={{ color: mode === m ? "#fff" : CT.blue }}
                        />
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: CT.navy }}>
                          {Meta.title}
                        </p>
                        <p className="text-sm" style={{ color: CT.muted }}>
                          {Meta.desc}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            <div className="px-5 mt-6">
              <Button
                className="w-full h-12 rounded-xl text-base"
                style={{ backgroundColor: CT.blue }}
                onClick={() => setStep("symptoms")}
              >
                Continue
              </Button>
            </div>
          </div>
        );

      /* ---------------- SCREEN 3: SYMPTOM INTAKE ---------------- */
      case "symptoms":
        return (
          <div key="symptoms" className="animate-fade-in pb-6">
            {header("Tell us how you feel", "This helps your doctor prepare before you connect.", () =>
              setStep("mode"),
            )}
            <div className="px-5 space-y-6">
              <div>
                <label className="text-sm font-semibold" style={{ color: CT.navy }}>
                  What's your main symptom?
                </label>
                <Textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Persistent headache and dizziness"
                  className="mt-2 rounded-xl min-h-[92px]"
                />
              </div>

              {emergency && (
                <div
                  className="rounded-2xl p-4 animate-fade-in"
                  style={{ backgroundColor: "#FEF2F2", border: `1px solid ${CT.red}33` }}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: CT.red }} />
                    <div>
                      <p className="font-semibold" style={{ color: CT.red }}>
                        This may be a medical emergency
                      </p>
                      <p className="text-sm mt-1" style={{ color: "#7F1D1D" }}>
                        Please seek immediate in-person care. You can still continue online, but do
                        not delay emergency treatment.
                      </p>
                      <div className="flex gap-2 mt-3">
                        <a href="tel:112" className="flex-1">
                          <Button
                            className="w-full h-10 rounded-xl"
                            style={{ backgroundColor: CT.red }}
                          >
                            Call emergency line
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold" style={{ color: CT.navy }}>
                  How long have you felt this?
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DURATIONS.map((d) => (
                    <Chip
                      key={d}
                      label={d}
                      active={duration === d}
                      onClick={() => setDuration(d)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold" style={{ color: CT.navy }}>
                    How severe is it?
                  </label>
                  <span className="text-sm font-bold" style={{ color: CT.blue }}>
                    {severity}/10
                  </span>
                </div>
                <Slider
                  value={[severity]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(v) => setSeverity(v[0])}
                  className="mt-4"
                />
                <div className="flex justify-between text-[11px] mt-1.5" style={{ color: CT.muted }}>
                  <span>Mild</span>
                  <span>Severe</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold" style={{ color: CT.navy }}>
                  Any other symptoms?
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {OTHER_SYMPTOMS.map((s) => (
                    <Chip
                      key={s}
                      label={s}
                      active={otherSymptoms.includes(s)}
                      onClick={() => toggle(otherSymptoms, setOtherSymptoms, s)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold" style={{ color: CT.navy }}>
                  Existing conditions
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {CONDITIONS.map((c) => (
                    <Chip
                      key={c}
                      label={c}
                      active={conditions.includes(c)}
                      onClick={() => toggle(conditions, setConditions, c)}
                    />
                  ))}
                </div>
              </div>

              <Button
                className="w-full h-12 rounded-xl text-base"
                style={{ backgroundColor: CT.blue }}
                disabled={!symptoms.trim() || !duration}
                onClick={runMatching}
              >
                Find me a doctor
              </Button>
            </div>
          </div>
        );

      /* ---------------- SCREEN 4: DOCTOR MATCHING ---------------- */
      case "matching":
        return (
          <div key="matching" className="animate-fade-in px-5 pt-10">
            {matching ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="relative w-28 h-28">
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ backgroundColor: `${CT.blue}22` }}
                  />
                  <div
                    className="absolute inset-3 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: CT.blueSoft }}
                  >
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: CT.blue }} />
                  </div>
                </div>
                <p className="mt-6 text-lg font-semibold" style={{ color: CT.navy }}>
                  Finding the right doctor for you...
                </p>
                <p className="text-sm mt-1" style={{ color: CT.muted }}>
                  Matching your symptoms with available specialists
                </p>
              </div>
            ) : (
              <div className="animate-fade-in">
                <h1 className="text-2xl font-bold" style={{ color: CT.navy }}>
                  We found your doctor
                </h1>
                <div
                  className="mt-5 rounded-2xl border p-5"
                  style={{ borderColor: CT.border, backgroundColor: "#fff" }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                      style={{ backgroundColor: CT.blueSoft, color: CT.blue }}
                    >
                      {doctor?.name?.replace("Dr. ", "").charAt(0) || "D"}
                    </div>
                    <div>
                      <p className="font-bold text-lg" style={{ color: CT.navy }}>
                        {doctor?.name}
                      </p>
                      <p className="text-sm" style={{ color: CT.muted }}>
                        {doctor?.specialization}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-medium" style={{ color: CT.navy }}>
                          {doctor?.rating?.toFixed(1)}
                        </span>
                        <span className="text-xs" style={{ color: CT.muted }}>
                          ({doctor?.reviews} reviews) · {doctor?.years} yrs
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    className="mt-4 pt-4 border-t flex items-center gap-2 text-sm"
                    style={{ borderColor: CT.border, color: CT.green }}
                  >
                    <ShieldCheck className="w-4 h-4" /> Verified by Prescribly
                  </div>
                </div>
                <Button
                  className="w-full h-12 rounded-xl text-base mt-6"
                  style={{ backgroundColor: CT.blue }}
                  onClick={() => setStep("payment")}
                >
                  Continue to payment
                </Button>
                <button
                  className="w-full mt-3 text-sm font-medium py-2"
                  style={{ color: CT.muted }}
                  onClick={runMatching}
                >
                  Find another doctor
                </button>
              </div>
            )}
          </div>
        );

      /* ---------------- SCREEN 5: PAYMENT ---------------- */
      case "payment":
        return (
          <div key="payment" className="animate-fade-in">
            {header("Payment", "Complete payment to connect with your doctor.", () =>
              setStep("matching"),
            )}
            <div className="px-5 space-y-4">
              <div
                className="rounded-2xl p-5"
                style={{ backgroundColor: CT.navy, color: "#fff" }}
              >
                <p className="text-sm opacity-70">Consultation fee</p>
                <p className="text-3xl font-bold mt-1">{formatNaira(CONSULTATION_FEE)}</p>
                <div className="mt-4 pt-4 border-t border-white/15 space-y-1.5 text-sm opacity-90">
                  <p>· 20-minute session with {doctor?.name ?? "your doctor"}</p>
                  <p>· {modeMeta[mode].title} consultation</p>
                  <p>· Digital prescription if needed</p>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { key: "card", label: "Card", Icon: CreditCard },
                  { key: "transfer", label: "Bank Transfer", Icon: Landmark },
                  { key: "ussd", label: "USSD", Icon: Wallet },
                ].map(({ key, label, Icon }) => (
                  <Card
                    key={key}
                    selected={payMethod === key}
                    onClick={() => setPayMethod(key as any)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" style={{ color: CT.blue }} />
                      <span className="font-medium" style={{ color: CT.navy }}>
                        {label}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>

              <Button
                className="w-full h-12 rounded-xl text-base"
                style={{ backgroundColor: CT.blue }}
                disabled={payLoading}
                onClick={handlePay}
              >
                {payLoading ? "Processing..." : `Pay ${formatNaira(CONSULTATION_FEE)}`}
              </Button>
              <p className="text-center text-xs flex items-center justify-center gap-1.5" style={{ color: CT.muted }}>
                <ShieldCheck className="w-3.5 h-3.5" /> Secured by Flutterwave
              </p>
            </div>
          </div>
        );

      /* ---------------- SCREEN 6: CONFIRMATION ---------------- */
      case "confirmation":
        return (
          <div key="confirmation" className="animate-fade-in px-5 pt-12 text-center">
            <div
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center animate-scale-in"
              style={{ backgroundColor: "#DCFCE7" }}
            >
              <CheckCircle2 className="w-10 h-10" style={{ color: CT.green }} />
            </div>
            <h1 className="text-2xl font-bold mt-5" style={{ color: CT.navy }}>
              Payment successful
            </h1>
            <p className="text-sm mt-2" style={{ color: CT.muted }}>
              Your consultation is confirmed. Your doctor has been notified.
            </p>

            <div
              className="mt-6 rounded-2xl border p-4 text-left space-y-3"
              style={{ borderColor: CT.border }}
            >
              {[
                ["Doctor", doctor?.name ?? "Next available doctor"],
                ["Type", modeMeta[mode].title],
                ["Duration", "20 minutes"],
                ["Amount paid", formatNaira(CONSULTATION_FEE)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span style={{ color: CT.muted }}>{k}</span>
                  <span className="font-semibold" style={{ color: CT.navy }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>

            <Button
              className="w-full h-12 rounded-xl text-base mt-6"
              style={{ backgroundColor: CT.blue }}
              onClick={enterWaiting}
            >
              Start consultation
            </Button>
          </div>
        );

      /* ---------------- SCREEN 7: WAITING ROOM ---------------- */
      case "waiting":
        return (
          <div
            key="waiting"
            className="animate-fade-in min-h-[70vh] flex flex-col items-center justify-center px-6 text-center rounded-3xl mx-3 my-3"
            style={{ background: `linear-gradient(160deg, ${CT.navy}, ${CT.navySoft})` }}
          >
            <div className="relative w-32 h-32">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{
                    backgroundColor: "rgba(255,255,255,.08)",
                    animationDelay: `${i * 600}ms`,
                    animationDuration: "2.4s",
                  }}
                />
              ))}
              <div className="absolute inset-6 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {doctor?.name?.replace("Dr. ", "").charAt(0) ?? "D"}
                </span>
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mt-8">
              Connecting you to {doctor?.name ?? "your doctor"}
            </h2>
            <p className="text-sm text-white/60 mt-2">Please stay on this screen</p>
            <p className="text-3xl font-mono text-white mt-6">
              {Math.floor(waitSeconds / 60)
                .toString()
                .padStart(2, "0")}
              :{(waitSeconds % 60).toString().padStart(2, "0")}
            </p>

            <div className="mt-8 space-y-2 text-left w-full max-w-xs">
              <p className="text-xs uppercase tracking-wide text-white/40">While you wait</p>
              <p className="text-sm text-white/80">· Find a quiet, well-lit place</p>
              <p className="text-sm text-white/80">· Have any medications nearby</p>
              <p className="text-sm text-white/80">· Check your internet connection</p>
            </div>

            <button
              onClick={() => {
                setMusicOn((v) => {
                  const next = !v;
                  if (next) audioRef.current?.play().catch(() => undefined);
                  else audioRef.current?.pause();
                  return next;
                });
              }}
              className="mt-8 flex items-center gap-2 text-white/70 text-sm"
            >
              {musicOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              Calm background music
            </button>

            <audio ref={audioRef} src={DEFAULT_WAITING_AUDIO_URL} loop />

            <div className="mt-8 w-full max-w-xs space-y-2">
              <Button
                className="w-full h-11 rounded-xl bg-white text-[#0F1E3D] hover:bg-white/90"
                onClick={async () => {
                  if (!sessionId) return;
                  await supabase
                    .from("consultation_sessions")
                    .update({
                      status: "active",
                      started_at: new Date().toISOString(),
                      ends_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
                    })
                    .eq("id", sessionId);
                  navigate(`/consultation/${sessionId}/live`);
                }}
              >
                Enter consultation room
              </Button>
              <button
                className="w-full text-sm text-white/60 py-2"
                onClick={() => navigate("/dashboard")}
              >
                Cancel consultation
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    consultType,
    mode,
    symptoms,
    duration,
    severity,
    otherSymptoms,
    conditions,
    emergency,
    doctor,
    matching,
    payMethod,
    waitSeconds,
    musicOn,
    payLoading,
    sessionId,
  ]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#fff" }}>
      <div className="flex-1 max-w-md w-full mx-auto pb-4">{content}</div>
      <div className="max-w-md w-full mx-auto">
        <StepTracker current={step} />
      </div>
    </div>
  );
}
