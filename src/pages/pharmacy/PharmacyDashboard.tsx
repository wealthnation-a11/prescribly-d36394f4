import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePharmacyAccount } from "@/hooks/usePharmacyAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import RealtimeChat from "@/components/consultation/RealtimeChat";
import { usePageSEO } from "@/hooks/usePageSEO";
import {
  Pill,
  Plus,
  Trash2,
  Package,
  MessageSquare,
  Clock,
  LogOut,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";

const naira = (n: number) => `₦${Number(n || 0).toLocaleString("en-NG")}`;

const ORDER_STAGES = ["placed", "confirmed", "dispatched", "delivered"] as const;

interface InventoryRow {
  id: string;
  drug_name: string;
  generic_name: string | null;
  unit_price: number;
  quantity_available: number;
  is_available: boolean;
}

export default function PharmacyDashboard() {
  usePageSEO({
    title: "Pharmacy Dashboard | Prescribly",
    description: "Manage your drug price list, patient orders and chats on Prescribly.",
  });

  const navigate = useNavigate();
  const { user } = useAuth();
  const { pharmacy, isLoading, refetch } = usePharmacyAccount();

  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [newDrug, setNewDrug] = useState({ drug_name: "", generic_name: "", unit_price: "", quantity_available: "" });
  const [profile, setProfile] = useState({ phone: "", address: "", city: "", delivery_eta: "", description: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const pharmacyId = pharmacy?.id ?? null;

  useEffect(() => {
    if (!pharmacy) return;
    setProfile({
      phone: pharmacy.phone ?? "",
      address: pharmacy.address ?? "",
      city: pharmacy.city ?? "",
      delivery_eta: pharmacy.delivery_eta ?? "",
      description: pharmacy.description ?? "",
    });
  }, [pharmacy]);

  const loadInventory = async (id: string) => {
    const { data } = await supabase
      .from("pharmacy_inventory")
      .select("id, drug_name, generic_name, unit_price, quantity_available, is_available")
      .eq("pharmacy_id", id)
      .order("drug_name");
    setInventory((data ?? []) as InventoryRow[]);
  };

  const loadOrders = async (id: string) => {
    const { data } = await supabase
      .from("pharmacy_orders")
      .select("*")
      .eq("pharmacy_id", id)
      .order("created_at", { ascending: false });
    setOrders(data ?? []);
  };

  useEffect(() => {
    if (!pharmacyId) return;
    loadInventory(pharmacyId);
    loadOrders(pharmacyId);

    const channel = supabase
      .channel(`pharmacy-orders-${pharmacyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pharmacy_orders", filter: `pharmacy_id=eq.${pharmacyId}` },
        () => loadOrders(pharmacyId),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [pharmacyId]);

  const addDrug = async () => {
    if (!pharmacyId) return;
    if (!newDrug.drug_name.trim()) return toast.error("Enter a drug name");
    const price = Number(newDrug.unit_price);
    if (!Number.isFinite(price) || price < 0) return toast.error("Enter a valid price");

    const { error } = await supabase.from("pharmacy_inventory").insert({
      pharmacy_id: pharmacyId,
      drug_name: newDrug.drug_name.trim(),
      generic_name: newDrug.generic_name.trim() || null,
      unit_price: price,
      quantity_available: Number(newDrug.quantity_available) || 0,
      is_available: (Number(newDrug.quantity_available) || 0) > 0,
    });
    if (error) return toast.error(error.message);
    setNewDrug({ drug_name: "", generic_name: "", unit_price: "", quantity_available: "" });
    toast.success("Added to your price list");
    loadInventory(pharmacyId);
  };

  const updateRow = async (row: InventoryRow, patch: Partial<InventoryRow>) => {
    setInventory((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
    const { error } = await supabase.from("pharmacy_inventory").update(patch).eq("id", row.id);
    if (error) toast.error(error.message);
  };

  const removeRow = async (id: string) => {
    const { error } = await supabase.from("pharmacy_inventory").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setInventory((prev) => prev.filter((r) => r.id !== id));
  };

  const advanceOrder = async (order: any) => {
    const i = ORDER_STAGES.indexOf(order.status);
    const next = ORDER_STAGES[Math.min(ORDER_STAGES.length - 1, i + 1)];
    const { error } = await supabase.from("pharmacy_orders").update({ status: next }).eq("id", order.id);
    if (error) return toast.error(error.message);
    toast.success(`Order marked as ${next}`);
  };

  const saveProfile = async () => {
    if (!pharmacyId) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("pharmacies")
      .update({
        phone: profile.phone || null,
        address: profile.address || null,
        city: profile.city || null,
        delivery_eta: profile.delivery_eta || null,
        description: profile.description || null,
      } as any)
      .eq("id", pharmacyId);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success("Pharmacy profile updated");
    refetch();
  };

  const pendingOrders = useMemo(() => orders.filter((o) => o.status !== "delivered"), [orders]);
  const activeOrder = orders.find((o) => o.id === activeOrderId) ?? null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (pharmacy && pharmacy.status !== "approved") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-8 space-y-3">
            <ShieldAlert className="h-12 w-12 mx-auto text-amber-500" />
            <h1 className="text-xl font-bold">
              {pharmacy.status === "suspended"
                ? "Your pharmacy is suspended"
                : pharmacy.status === "rejected"
                  ? "Application not approved"
                  : "Application under review"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {pharmacy.admin_notes ||
                "The Prescribly team is reviewing your pharmacy. You'll get access to your dashboard once it's approved."}
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/pharmacy-portal");
              }}
            >
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Pill className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{pharmacy?.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {pharmacy?.city} · {pendingOrders.length} open order{pendingOrders.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/pharmacy-portal");
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        <Tabs defaultValue="orders">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="prices">Price list</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* ---------------- ORDERS + CHAT ---------------- */}
          <TabsContent value="orders" className="pt-4">
            {activeOrder ? (
              <Card className="overflow-hidden">
                <CardHeader className="border-b py-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setActiveOrderId(null)}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">
                        Order #{activeOrder.id.slice(0, 8)}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground truncate">
                        {activeOrder.delivery_address}
                      </p>
                    </div>
                    <Badge className="ml-auto capitalize">{activeOrder.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 h-[60vh]">
                  <RealtimeChat
                    kind="pharmacy"
                    parentId={activeOrder.id}
                    myRole="pharmacy"
                    className="h-full"
                  />
                </CardContent>
              </Card>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="py-14 text-center space-y-2">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground/40" />
                  <p className="font-medium">No orders yet</p>
                  <p className="text-sm text-muted-foreground">
                    Publish your price list so patients can pick you when their doctor prescribes.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <Card key={o.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">Order #{o.id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {o.delivery_address}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {new Date(o.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="secondary" className="capitalize">
                            {o.status}
                          </Badge>
                          <p className="font-bold mt-1">{naira(o.total_amount)}</p>
                        </div>
                      </div>

                      {Array.isArray(o.items) && o.items.length > 0 && (
                        <ul className="text-sm text-muted-foreground space-y-0.5">
                          {o.items.map((it: any, idx: number) => (
                            <li key={idx} className="flex justify-between">
                              <span>{it.name}</span>
                              <span>{it.priceKnown ? naira(it.price) : "Price to confirm"}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setActiveOrderId(o.id)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1.5" /> Chat with patient
                        </Button>
                        {o.status !== "delivered" && (
                          <Button size="sm" className="flex-1" onClick={() => advanceOrder(o)}>
                            Mark {ORDER_STAGES[ORDER_STAGES.indexOf(o.status) + 1] ?? "delivered"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ---------------- PRICE LIST ---------------- */}
          <TabsContent value="prices" className="pt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Add a drug</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Drug name (e.g. Amoxicillin 500mg)"
                    value={newDrug.drug_name}
                    onChange={(e) => setNewDrug({ ...newDrug, drug_name: e.target.value })}
                  />
                  <Input
                    placeholder="Generic name (optional)"
                    value={newDrug.generic_name}
                    onChange={(e) => setNewDrug({ ...newDrug, generic_name: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Unit price (₦)"
                    value={newDrug.unit_price}
                    onChange={(e) => setNewDrug({ ...newDrug, unit_price: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Quantity in stock"
                    value={newDrug.quantity_available}
                    onChange={(e) => setNewDrug({ ...newDrug, quantity_available: e.target.value })}
                  />
                </div>
                <Button onClick={addDrug} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-1.5" /> Add to price list
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Your price list ({inventory.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {inventory.length === 0 && (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Nothing published yet. Patients only see pharmacies with a price list.
                  </p>
                )}
                {inventory.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{row.drug_name}</p>
                        {row.generic_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {row.generic_name}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        aria-label="Remove drug"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Price (₦)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={row.unit_price}
                          onChange={(e) =>
                            updateRow(row, { unit_price: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min={0}
                          value={row.quantity_available}
                          onChange={(e) =>
                            updateRow(row, {
                              quantity_available: Number(e.target.value),
                              is_available: Number(e.target.value) > 0,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Available to patients</Label>
                      <Switch
                        checked={row.is_available}
                        onCheckedChange={(v) => updateRow(row, { is_available: v })}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- PROFILE ---------------- */}
          <TabsContent value="profile" className="pt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pharmacy details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Delivery ETA</Label>
                    <Input
                      placeholder="30–45 mins"
                      value={profile.delivery_eta}
                      onChange={(e) => setProfile({ ...profile, delivery_eta: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>About</Label>
                  <Textarea
                    value={profile.description}
                    maxLength={500}
                    onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                  />
                </div>
                <Button onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? "Saving…" : "Save changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
