import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription,
} from "@/components/ui/sheet";
import {
  Wallet as WalletIcon, Plus, Copy, ArrowUpRight, ArrowDownLeft,
  ShieldCheck, Loader2, Landmark, ChevronLeft,
} from "lucide-react";
import { MobileHeader } from "@/components/MobileHeader";

type Wallet = { id: string; balance_cents: number; currency: string; status: string };
type VAcct = {
  bank_name: string | null; account_number: string; account_name: string | null;
  reference_code: string | null; is_real_bank_account: boolean;
};
type Txn = {
  id: string; type: string; direction: "credit" | "debit"; amount_cents: number;
  status: string; currency: string; description: string | null; created_at: string;
};

const formatMoney = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

export default function WalletPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [vAcct, setVAcct] = useState<VAcct | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [topupOpen, setTopupOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);

  const loadAll = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [{ data: w }, { data: va }, { data: t }] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("wallet_virtual_accounts").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("wallet_transactions").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(50),
    ]);
    setWallet(w as any);
    setVAcct(va as any);
    setTxns((t as any) ?? []);
    setLoading(false);
  };

  const provision = async () => {
    setProvisioning(true);
    try {
      const { error } = await supabase.functions.invoke("wallet-provision", { body: {} });
      if (error) throw error;
      await loadAll();
      toast.success("Wallet ready");
    } catch (e: any) {
      toast.error(e.message || "Could not set up wallet");
    } finally {
      setProvisioning(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [user?.id]);

  // Realtime: wallet + transactions
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`wallet-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        () => loadAll())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "wallet_transactions", filter: `user_id=eq.${user.id}` },
        () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user?.id]);

  // Handle top-up return
  useEffect(() => {
    const topup = params.get("topup");
    if (topup === "success") toast.success("Top-up received — checking balance…");
    if (topup === "failed") toast.error("Top-up was not completed.");
    if (topup) { params.delete("topup"); setParams(params, { replace: true }); }
    // eslint-disable-next-line
  }, []);

  const copyAcct = () => {
    if (!vAcct?.account_number) return;
    navigator.clipboard.writeText(vAcct.account_number);
    toast.success("Account number copied");
  };

  const startTopup = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (!cents || cents < 100) return toast.error("Enter at least $1.00");
    setTopupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("wallet-topup-initiate", {
        body: {
          amount_cents: cents,
          redirect_url: `${window.location.origin}/wallet?topup=success`,
        },
      });
      if (error) throw error;
      if (!data?.checkout_url) throw new Error("No checkout URL returned");
      window.location.href = data.checkout_url;
    } catch (e: any) {
      toast.error(e.message || "Could not start top-up");
    } finally {
      setTopupLoading(false);
    }
  };

  const balance = wallet?.balance_cents ?? 0;
  const currency = wallet?.currency ?? "USD";

  const hasWallet = !!wallet && !!vAcct;

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4 space-y-6">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link to="/user-dashboard" aria-label="Back"><ChevronLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prescribly Health Wallet</h1>
            <p className="text-sm text-muted-foreground">Store credit for consultations & (soon) HMO.</p>
          </div>
        </div>

        {loading ? (
          <>
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </>
        ) : !hasWallet ? (
          <Card className="border-teal-200/40 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                <WalletIcon className="h-7 w-7 text-teal-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Set up your Health Wallet</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  We'll create your wallet and a personal account number you can send money to.
                </p>
              </div>
              <Button onClick={provision} disabled={provisioning} size="lg" className="w-full">
                {provisioning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Setting up…</> : "Set up wallet"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Balance */}
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 text-white shadow-xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <WalletIcon className="h-4 w-4" /> Available balance
                  </div>
                  <Badge className="bg-white/15 text-white border-0 backdrop-blur">
                    {wallet?.status === "active" ? "Active" : "Frozen"}
                  </Badge>
                </div>
                <div className="text-4xl font-bold tracking-tight">
                  {formatMoney(balance, currency)}
                </div>
                <div className="flex gap-2">
                  <Sheet open={topupOpen} onOpenChange={setTopupOpen}>
                    <SheetTrigger asChild>
                      <Button className="flex-1 bg-white text-teal-700 hover:bg-white/90">
                        <Plus className="mr-2 h-4 w-4" /> Add money
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="rounded-t-2xl">
                      <SheetHeader>
                        <SheetTitle>Add money to your wallet</SheetTitle>
                        <SheetDescription>
                          You'll be redirected to Hitchpay to complete the payment securely.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-6 space-y-4">
                        <div>
                          <label className="text-sm font-medium">Amount (USD)</label>
                          <Input
                            type="number" inputMode="decimal" min="1" step="0.01"
                            placeholder="25.00" value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="mt-1 text-lg"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[10, 25, 50, 100].map((v) => (
                            <Button key={v} type="button" size="sm" variant="outline"
                              onClick={() => setAmount(String(v))}>
                              ${v}
                            </Button>
                          ))}
                        </div>
                        <Button onClick={startTopup} disabled={topupLoading} className="w-full" size="lg">
                          {topupLoading
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirecting…</>
                            : "Continue to Hitchpay"}
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
                <div className="flex items-start gap-2 text-xs text-white/80 pt-1">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>Funds can only be used inside Prescribly (consultations and, soon, HMO).</p>
                </div>
              </CardContent>
            </Card>

            {/* Virtual account */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Landmark className="h-4 w-4 text-teal-600" /> Your funding account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                  {vAcct.bank_name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {vAcct.is_real_bank_account ? "Bank" : "Type"}
                      </span>
                      <span className="font-medium text-right">{vAcct.bank_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {vAcct.is_real_bank_account ? "Account number" : "Reference code"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-lg">{vAcct.account_number}</span>
                      <Button size="icon" variant="ghost" onClick={copyAcct}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {vAcct.account_name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Account name</span>
                      <span className="font-medium text-right">{vAcct.account_name}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {vAcct.is_real_bank_account
                    ? "Transfers to this account are credited to your wallet within minutes. Funds can only be used inside Prescribly."
                    : "Use the reference above when paying via Hitchpay so the top-up is credited to your account. Funds can only be used inside Prescribly."}
                </p>
              </CardContent>
            </Card>

            {/* Transactions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent transactions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {txns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No transactions yet. Add money to get started.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {txns.map((t) => {
                      const credit = t.direction === "credit";
                      return (
                        <li key={t.id} className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
                              credit ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            }`}>
                              {credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium capitalize">
                                {t.description || t.type.replace(/_/g, " ")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(t.created_at).toLocaleString()} • {t.status}
                              </p>
                            </div>
                          </div>
                          <div className={`text-sm font-semibold ${credit ? "text-emerald-700" : "text-foreground"}`}>
                            {credit ? "+" : "−"}{formatMoney(t.amount_cents, t.currency)}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <p className="text-[11px] text-center text-muted-foreground pt-2">
              HMO section coming soon. Prescribly Health Wallet is a closed-loop store credit
              and cannot be spent outside Prescribly.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
