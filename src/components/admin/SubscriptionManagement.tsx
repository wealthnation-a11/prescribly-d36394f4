import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Crown, Ban } from "lucide-react";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_legacy: boolean;
  role: string;
  created_at: string;
}

export const SubscriptionManagement = () => {
  const queryClient = useQueryClient();

  // Fetch all users with subscription info
  const { data: users, isLoading } = useQuery({
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

  // Grant legacy status mutation
  const grantLegacyMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-roles", {
        method: "POST",
        body: { action: "grant-legacy", userId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Legacy status granted");
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-users"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to grant legacy status: ${error.message}`);
    },
  });

  // Revoke legacy status mutation
  const revokeLegacyMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-roles", {
        method: "POST",
        body: { action: "revoke-legacy", userId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Legacy status revoked");
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-users"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke legacy status: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Filter only patients for subscription management
  const patients = users?.filter((user) => user.role === "patient") || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  {user.first_name} {user.last_name}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.is_legacy ? (
                    <Badge variant="default" className="gap-1">
                      <Crown className="h-3 w-3" />
                      Legacy
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Subscription Required</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {user.is_legacy ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeLegacyMutation.mutate(user.id)}
                      disabled={revokeLegacyMutation.isPending}
                      className="gap-2"
                    >
                      <Ban className="h-4 w-4" />
                      Revoke Legacy
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => grantLegacyMutation.mutate(user.id)}
                      disabled={grantLegacyMutation.isPending}
                      className="gap-2"
                    >
                      <Crown className="h-4 w-4" />
                      Grant Legacy
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
