import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLogisticsAccount } from "@/hooks/useLogisticsAccount";
import { useLogout } from "@/hooks/useLogout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Truck, Package, ShieldAlert, LogOut, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/Logo";

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

const STAGES = ["assigned", "accepted", "picked_up", "in_transit", "delivered"] as const;

interface DeliveryRow {
  id: string;
  order_id: string;
  status: string;
  delivery_fee: number;
  pickup_address: string | null;
  delivery_address: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  rider_name: string | null;
  rider_phone: string | null;
  notes: string | null;
  created_at: string;
  delivered_at: string | null;
  pharmacy?: { name: string; phone: string | null; address: string | null } | null;
}

export default function LogisticsDashboard() {
  usePageSEO({
    title: "Logistics Dashboard | Prescribly",
    description: "Manage medication delivery jobs assigned to your logistics company.",
  });

  const navigate = useNavigate();
  const { company, isLoading, refetch } = useLogisticsAccount();
  const { handleLogout } = useLogout();
  const [jobs, setJobs] = useState<DeliveryRow[]>([]);
  const [rider, setRider] = useState<Record<string, { name: string; phone: string }>>({});
  const [profile, setProfile] = useState({ phone: "", city: "", coverage_areas: "", description: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!company) return;
    setProfile({
      phone: company.phone ?? "",
      city: company.city ?? "",
      coverage_areas: company.coverage_areas ?? "",
      description: company.description ?? "",
    });
    loadJobs(company.id);

    const channel = supabase
      .channel(`logistics-${company.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_orders", filter: `logistics_company_id=eq.${company.id}` },
        () => loadJobs(company.id),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id]);

  const loadJobs = async (companyId: string) => {
    const { data, error } = await supabase
      .from("delivery_orders")
      .select("*, pharmacy:pharmacies(name, phone, address)")
      .eq("logistics_company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setJobs((data ?? []) as unknown as DeliveryRow[]);
  };

  const advance = async (job: DeliveryRow) => {
    const i = STAGES.indexOf(job.status as (typeof STAGES)[number]);
    const next = STAGES[Math.min(STAGES.length - 1, i < 0 ? 0 : i + 1)];
    const patch: Record<string, any> = { status: next };
    if (next === "delivered") patch.delivered_at = new Date().toISOString();
    const { error } = await supabase.from("delivery_orders").update(patch).eq("id", job.id);
    if (error) return toast.error(error.message);
    toast.success(`Delivery marked ${next.replace("_", " ")}`);
    if (company) loadJobs(company.id);
  };

  const saveRider = async (job: DeliveryRow) => {
    const r = rider[job.id];
    if (!r?.name) return toast.error("Enter the rider's name");
    const { error } = await supabase
      .from("delivery_orders")
      .update({ rider_name: r.name, rider_phone: r.phone || null })
      .eq("id", job.id);
    if (error) return toast.error(error.message);
    toast.success("Rider assigned");
    if (company) loadJobs(company.id);
  };

  const saveProfile = async () => {
    if (!company) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("logistics_companies")
      .update({
        phone: profile.phone || null,
        city: profile.city || null,
        coverage_areas: profile.coverage_areas || null,
        description: profile.description || null,
      })
      .eq("id", company.id);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success("Company profile updated");
    refetch();
  };

  const active = useMemo(() => jobs.filter((j) => j.status !== "delivered" && j.status !== "cancelled"), [jobs]);
  const completed = useMemo(() => jobs.filter((j) => j.status === "delivered"), [jobs]);
  const earnings = useMemo(
    () => completed.reduce((s, j) => s + Number(j.delivery_fee || 0), 0),
    [completed],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (company && company.status !== "approved") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8 space-y-3">
            <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto" />
            <h1 className="text-lg font-semibold">Awaiting approval</h1>
            <p className="text-sm text-muted-foreground">
              {company.name} is still being reviewed. You'll be able to receive delivery jobs once
              our team approves your company.
            </p>
            {company.admin_notes && (
              <p className="text-xs text-muted-foreground">Note: {company.admin_notes}</p>
            )}
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              Back home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const jobCard = (job: DeliveryRow) => (
    <Card key={job.id}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium truncate">{job.pharmacy?.name ?? "Pharmacy"}</p>
            <p className="text-xs text-muted-foreground">
              Job #{job.id.slice(0, 8)} · {naira(job.delivery_fee)}
            </p>
          </div>
          <Badge variant="secondary" className="capitalize">
            {job.status.replace("_", " ")}
          </Badge>
        </div>

        <div className="space-y-1 text-sm">
          <p className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              <span className="font-medium text-foreground">Pick up: </span>
              {job.pickup_address || job.pharmacy?.address || "—"}
            </span>
          </p>
          <p className="flex items-start gap-2 text-muted-foreground">
            <Package className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              <span className="font-medium text-foreground">Deliver to: </span>
              {job.delivery_address || "—"}
              {job.recipient_name ? ` · ${job.recipient_name}` : ""}
            </span>
          </p>
          {job.recipient_phone && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <a className="underline" href={`tel:${job.recipient_phone}`}>
                {job.recipient_phone}
              </a>
            </p>
          )}
          {job.notes && <p className="text-xs text-muted-foreground">Note: {job.notes}</p>}
        </div>

        {job.status !== "delivered" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Rider name"
                value={rider[job.id]?.name ?? job.rider_name ?? ""}
                onChange={(e) =>
                  setRider((p) => ({
                    ...p,
                    [job.id]: { name: e.target.value, phone: p[job.id]?.phone ?? job.rider_phone ?? "" },
                  }))
                }
              />
              <Input
                placeholder="Rider phone"
                value={rider[job.id]?.phone ?? job.rider_phone ?? ""}
                onChange={(e) =>
                  setRider((p) => ({
                    ...p,
                    [job.id]: { name: p[job.id]?.name ?? job.rider_name ?? "", phone: e.target.value },
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => saveRider(job)}>
                Save rider
              </Button>
              <Button size="sm" onClick={() => advance(job)}>
                Mark{" "}
                {(STAGES[STAGES.indexOf(job.status as (typeof STAGES)[number]) + 1] ?? "delivered").replace(
                  "_",
                  " ",
                )}
              </Button>
            </div>
          </>
        )}
        {job.rider_name && job.status === "delivered" && (
          <p className="text-xs text-muted-foreground">Delivered by {job.rider_name}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Logo size="md" withLink />
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{company?.name}</h1>
            <p className="text-xs text-muted-foreground">Logistics dashboard</p>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-3 gap-3 pt-4">
          {[
            { label: "Active", value: active.length },
            { label: "Delivered", value: completed.length },
            { label: "Earnings", value: naira(earnings) },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="active" className="pt-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="pt-4 space-y-3">
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">
                No delivery jobs yet. Pharmacies will assign orders to you here.
              </p>
            ) : (
              active.map(jobCard)
            )}
          </TabsContent>

          <TabsContent value="history" className="pt-4 space-y-3">
            {completed.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">
                Completed deliveries will appear here.
              </p>
            ) : (
              completed.map(jobCard)
            )}
          </TabsContent>

          <TabsContent value="profile" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Company profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profile.city}
                    onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coverage">Areas you cover</Label>
                  <Input
                    id="coverage"
                    value={profile.coverage_areas}
                    onChange={(e) => setProfile((p) => ({ ...p, coverage_areas: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="about">About</Label>
                  <Textarea
                    id="about"
                    value={profile.description}
                    onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <Button className="w-full" onClick={saveProfile} disabled={savingProfile}>
                  Save changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
