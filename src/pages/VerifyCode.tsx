import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Search, ShieldCheck, Building2, User, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Logo } from "@/components/Logo";

interface CodeResult {
  id: string;
  code: string;
  patient_id: string;
  facility_id: string;
  status: string;
  expires_at: string;
  confirmed_at: string | null;
  created_at: string;
  patient_first_name: string | null;
  patient_last_name: string | null;
  facility_name: string | null;
  facility_type: string | null;
}

const VerifyCode = () => {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<CodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleVerify = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      toast({ title: "Please enter a valid 6-character code", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);
    setNotFound(false);

    try {
      const { data, error } = await supabase.rpc("verify_registration_code", { _code: trimmed });

      if (error) throw error;

      if (!data || data.length === 0) {
        setNotFound(true);
      } else {
        setResult(data[0] as CodeResult);
      }
    } catch {
      toast({ title: "Error looking up code", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!result) return;
    setConfirming(true);

    try {
      const { data, error } = await supabase.rpc("confirm_registration_code", { _code: result.code });

      if (error) throw error;

      if (data) {
        toast({ title: "Visit confirmed successfully!" });
        setResult({ ...result, status: "used", confirmed_at: new Date().toISOString() });
      } else {
        toast({ title: "Could not confirm code", description: "It may have already been used or expired.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error confirming code", variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  const getStatus = () => {
    if (!result) return null;
    if (result.status === "used") return { label: "Used", icon: CheckCircle, className: "bg-green-100 text-green-800 border-green-200" };
    if (new Date(result.expires_at) < new Date()) return { label: "Expired", icon: XCircle, className: "bg-red-100 text-red-800 border-red-200" };
    return { label: "Active", icon: Clock, className: "bg-orange-100 text-orange-800 border-orange-200" };
  };

  const status = getStatus();
  const isActive = result && result.status !== "used" && new Date(result.expires_at) >= new Date();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Logo />
          <Badge variant="outline" className="text-xs">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Staff Verification
          </Badge>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-6">
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Verify Patient Code</h1>
            <p className="text-muted-foreground text-sm">
              Enter the 6-character registration code shown by the patient
            </p>
          </div>

          {/* Code Input */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="e.g. ABC123"
                  className="text-center text-2xl font-mono tracking-[0.3em] uppercase"
                  maxLength={6}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                />
                <Button onClick={handleVerify} disabled={loading || code.trim().length !== 6} size="lg">
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Not Found */}
          {notFound && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-6 text-center">
                <XCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
                <p className="font-medium text-foreground">Code not found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please check the code and try again.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Result */}
          {result && status && (
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Verification Result</CardTitle>
                  <Badge className={status.className}>
                    <status.icon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <User className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Patient</p>
                      <p className="font-medium text-foreground">
                        {result.patient_first_name} {result.patient_last_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Building2 className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Facility</p>
                      <p className="font-medium text-foreground">
                        {result.facility_name || "N/A"}
                      </p>
                      {result.facility_type && (
                        <p className="text-xs text-muted-foreground capitalize">{result.facility_type}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <CalendarClock className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Expires</p>
                      <p className="font-medium text-foreground">
                        {format(new Date(result.expires_at), "PPP p")}
                      </p>
                    </div>
                  </div>

                  {result.confirmed_at && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-primary/20">
                      <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Confirmed at</p>
                        <p className="font-medium text-foreground">
                          {format(new Date(result.confirmed_at), "PPP p")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {isActive && (
                  <Button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="w-full"
                    size="lg"
                  >
                    {confirming ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Confirm Patient Visit
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default VerifyCode;
