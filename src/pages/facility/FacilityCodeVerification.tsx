import { useState } from "react";
import { FacilityLayout } from "@/components/FacilityLayout";
import { useFacilityStaff } from "@/hooks/useFacilityStaff";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, Search, User, Calendar, Building2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { usePageSEO } from "@/hooks/usePageSEO";

const FacilityCodeVerification = () => {
  const { facilityId } = useFacilityStaff();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<any>(null);

  usePageSEO({
    title: "Verify Code - Facility Portal",
    description: "Verify patient registration codes",
  });

  const handleVerify = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      toast({ title: "Invalid code", description: "Enter a 6-character code", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.rpc("verify_registration_code", { _code: trimmed });
      if (error) throw error;

      if (!data || data.length === 0) {
        toast({ title: "Not Found", description: "No registration found for this code", variant: "destructive" });
        return;
      }

      const record = data[0];

      // Check if this code belongs to this facility
      if (record.facility_id !== facilityId) {
        toast({ title: "Wrong Facility", description: "This code is for a different facility", variant: "destructive" });
        return;
      }

      setResult(record);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
        toast({ title: "Visit Confirmed!", description: `Patient ${result.patient_first_name} ${result.patient_last_name} has been checked in.` });
        setResult({ ...result, status: "used", confirmed_at: new Date().toISOString() });
      } else {
        toast({ title: "Cannot Confirm", description: "Code may already be used or expired", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  const isExpired = result && new Date(result.expires_at) < new Date();
  const isUsed = result?.status === "used";
  const canConfirm = result && !isExpired && !isUsed;

  return (
    <FacilityLayout>
      <div className="container mx-auto p-4 lg:p-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Verify Registration Code</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter the 6-character code shown by the patient
          </p>
        </div>

        <Card className="mb-6 border-border/50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Input
                placeholder="Enter 6-character code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                className="text-center text-2xl font-mono tracking-[0.5em] uppercase"
                maxLength={6}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              />
              <Button onClick={handleVerify} disabled={loading || code.trim().length !== 6}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? "Checking..." : "Verify"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-border/50 animate-fade-in">
            <CardHeader className="border-b border-border/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Patient Details</CardTitle>
                <Badge variant={isUsed ? "secondary" : isExpired ? "destructive" : "default"}>
                  {isUsed ? "Confirmed" : isExpired ? "Expired" : "Active"}
                </Badge>
              </div>
              <CardDescription>Registration code: {result.code}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Patient Name</p>
                    <p className="font-medium">{result.patient_first_name} {result.patient_last_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Facility</p>
                    <p className="font-medium">{result.facility_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-medium">{format(new Date(result.created_at), "PPp")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Expires</p>
                    <p className="font-medium">{format(new Date(result.expires_at), "PPp")}</p>
                  </div>
                </div>
              </div>

              {result.confirmed_at && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-400">
                    Confirmed at {format(new Date(result.confirmed_at), "PPp")}
                  </span>
                </div>
              )}

              {canConfirm && (
                <Button onClick={handleConfirm} disabled={confirming} className="w-full" size="lg">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {confirming ? "Confirming..." : "Confirm Patient Arrival"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </FacilityLayout>
  );
};

export default FacilityCodeVerification;
