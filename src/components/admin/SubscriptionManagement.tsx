import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Crown, Ban, Search, ShieldCheck, CreditCard, XCircle, Trash2 } from "lucide-react";
import { differenceInDays, format } from "date-fns";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_legacy: boolean;
  role: string;
  created_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  status: string;
  plan: string;
  expires_at: string;
  started_at: string;
}

type AccessFilter = "all" | "free-access" | "paid" | "no-access";

export const SubscriptionManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "grant" | "revoke" | "cancel-subscription";
    user: User | null;
  }>({ open: false, type: "grant", user: null });

  // Fetch all users with subscription info
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-subscription-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        method: "POST",
        body: { action: "list", page: 1, limit: 1000 },
      });

      if (error) throw error;
      return data.users as User[];
    },
  });

  // Fetch subscriptions
  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*");

      if (error) throw error;
      return data as Subscription[];
    },
  });

  // Grant free access mutation
  const grantAccessMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-roles", {
        method: "POST",
        body: { action: "grant-legacy", userId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Free access granted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-users"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to grant access: ${error.message}`);
    },
  });

  // Revoke free access mutation
  const revokeAccessMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-roles", {
        method: "POST",
        body: { action: "revoke-legacy", userId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Free access revoked successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-users"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke access: ${error.message}`);
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subscription cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-users"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel subscription: ${error.message}`);
    },
  });

  // Get subscription for a user
  const getSubscription = (userId: string) => {
    return subscriptions?.find((sub) => sub.user_id === userId);
  };

  // Get access status for a user
  const getAccessStatus = (user: User) => {
    if (user.is_legacy) return "free-access";
    const subscription = getSubscription(user.id);
    if (subscription && subscription.status === "active") {
      const expiresAt = new Date(subscription.expires_at);
      if (expiresAt > new Date()) return "paid";
    }
    return "no-access";
  };

  // Filter and search patients
  const patients = users?.filter((user) => user.role === "patient") || [];

  const filteredPatients = useMemo(() => {
    return patients.filter((user) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower);

      // Access filter
      const status = getAccessStatus(user);
      const matchesFilter =
        accessFilter === "all" || status === accessFilter;

      return matchesSearch && matchesFilter;
    });
  }, [patients, searchQuery, accessFilter, subscriptions]);

  // Calculate counts
  const counts = useMemo(() => {
    return {
      total: patients.length,
      freeAccess: patients.filter((u) => u.is_legacy).length,
      paid: patients.filter((u) => {
        const sub = getSubscription(u.id);
        return sub && sub.status === "active" && new Date(sub.expires_at) > new Date() && !u.is_legacy;
      }).length,
      noAccess: patients.filter((u) => {
        const sub = getSubscription(u.id);
        const hasPaidAccess = sub && sub.status === "active" && new Date(sub.expires_at) > new Date();
        return !u.is_legacy && !hasPaidAccess;
      }).length,
    };
  }, [patients, subscriptions]);

  // Render subscription status
  const renderSubscriptionStatus = (user: User) => {
    const status = getAccessStatus(user);
    const subscription = getSubscription(user.id);

    if (status === "free-access") {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge className="gap-1 bg-emerald-500/20 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/30">
                <ShieldCheck className="h-3 w-3" />
                Full Access (Free)
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              This user has permanent free access to all features
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (status === "paid" && subscription) {
      const expiresAt = new Date(subscription.expires_at);
      const daysRemaining = differenceInDays(expiresAt, new Date());
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge className="gap-1 bg-blue-500/20 text-blue-600 border-blue-500/30 hover:bg-blue-500/30">
                <CreditCard className="h-3 w-3" />
                {subscription.plan} ({daysRemaining} days left)
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              Expires: {format(expiresAt, "MMM dd, yyyy")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="secondary" className="gap-1 bg-muted text-muted-foreground">
              <XCircle className="h-3 w-3" />
              No Active Access
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            This user needs a subscription or free access grant
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const handleConfirmAction = () => {
    if (!confirmDialog.user) return;

    if (confirmDialog.type === "grant") {
      grantAccessMutation.mutate(confirmDialog.user.id);
    } else if (confirmDialog.type === "revoke") {
      revokeAccessMutation.mutate(confirmDialog.user.id);
    } else if (confirmDialog.type === "cancel-subscription") {
      cancelSubscriptionMutation.mutate(confirmDialog.user.id);
    }
    setConfirmDialog({ open: false, type: "grant", user: null });
  };

  const isLoading = usersLoading || subscriptionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          User Access Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{counts.total}</p>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-2xl font-bold text-emerald-600">{counts.freeAccess}</p>
            <p className="text-sm text-emerald-600/80">Free Access</p>
          </div>
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-2xl font-bold text-blue-600">{counts.paid}</p>
            <p className="text-sm text-blue-600/80">Paid Subscription</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-muted-foreground">{counts.noAccess}</p>
            <p className="text-sm text-muted-foreground">No Access</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={accessFilter}
            onValueChange={(value) => setAccessFilter(value as AccessFilter)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by access" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users ({counts.total})</SelectItem>
              <SelectItem value="free-access">Free Access ({counts.freeAccess})</SelectItem>
              <SelectItem value="paid">Paid ({counts.paid})</SelectItem>
              <SelectItem value="no-access">No Access ({counts.noAccess})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Access Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredPatients.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>{renderSubscriptionStatus(user)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {user.is_legacy ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setConfirmDialog({ open: true, type: "revoke", user })
                                  }
                                  disabled={revokeAccessMutation.isPending}
                                  className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Ban className="h-4 w-4" />
                                  Revoke Access
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Remove free access - user will need a subscription
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setConfirmDialog({ open: true, type: "grant", user })
                                  }
                                  disabled={grantAccessMutation.isPending}
                                  className="gap-2 text-emerald-600 hover:text-emerald-600 hover:bg-emerald-500/10"
                                >
                                  <Crown className="h-4 w-4" />
                                  Grant Free Access
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Give permanent free access to all features
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {/* Cancel Subscription Button - show for paid users */}
                        {getAccessStatus(user) === "paid" && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setConfirmDialog({ open: true, type: "cancel-subscription", user })
                                  }
                                  disabled={cancelSubscriptionMutation.isPending}
                                  className="gap-2 text-orange-600 hover:text-orange-600 hover:bg-orange-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Cancel Subscription
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Cancel the user's paid subscription
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog
          open={confirmDialog.open}
          onOpenChange={(open) =>
            !open && setConfirmDialog({ open: false, type: "grant", user: null })
          }
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog.type === "grant"
                  ? "Grant Free Access?"
                  : confirmDialog.type === "revoke"
                  ? "Revoke Free Access?"
                  : "Cancel Subscription?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.type === "grant" ? (
                  <>
                    This will give <strong>{confirmDialog.user?.first_name} {confirmDialog.user?.last_name}</strong>{" "}
                    permanent free access to all app features without requiring a subscription.
                  </>
                ) : confirmDialog.type === "revoke" ? (
                  <>
                    This will remove free access for <strong>{confirmDialog.user?.first_name} {confirmDialog.user?.last_name}</strong>.
                    They will need to purchase a subscription to continue using premium features.
                  </>
                ) : (
                  <>
                    This will cancel the paid subscription for <strong>{confirmDialog.user?.first_name} {confirmDialog.user?.last_name}</strong>.
                    They will lose access to premium features immediately.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmAction}
                className={
                  confirmDialog.type === "grant"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : confirmDialog.type === "cancel-subscription"
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-destructive hover:bg-destructive/90"
                }
              >
                {confirmDialog.type === "grant" 
                  ? "Grant Access" 
                  : confirmDialog.type === "revoke" 
                  ? "Revoke Access" 
                  : "Cancel Subscription"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
