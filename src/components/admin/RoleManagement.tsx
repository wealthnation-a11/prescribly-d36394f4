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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, UserPlus, Trash2, Crown, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_legacy: boolean;
}

export const RoleManagement = () => {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [legacySearchTerm, setLegacySearchTerm] = useState<string>("");
  const [selectedLegacyUserId, setSelectedLegacyUserId] = useState<string>("");
  const queryClient = useQueryClient();

  // Fetch all user roles
  const { data: userRoles, isLoading } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-roles", {
        method: "GET",
        body: { action: "list" },
      });

      if (error) throw error;
      return data.roles as UserRole[];
    },
  });

  // Fetch all users for role assignment
  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        method: "POST",
        body: { action: "list", page: 1, limit: 1000 },
      });

      if (error) throw error;
      // Map user_id to id for Select component compatibility
      return (data.users || []).map((user: any) => ({
        ...user,
        id: user.user_id || user.id
      })) as UserProfile[];
    },
  });

  // Filter users for legacy access search
  const filteredUsersForLegacy = allUsers?.filter((user) => {
    if (!legacySearchTerm) return true;
    const searchLower = legacySearchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower)
    );
  });

  // Get users with legacy access
  const legacyUsers = allUsers?.filter((user) => user.is_legacy);

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-roles", {
        method: "POST",
        body: { action: "assign", userId, role },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Role assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      setSelectedUserId("");
      setSelectedRole("");
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign role: ${error.message}`);
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-roles", {
        method: "DELETE",
        body: { action: "remove", userId, role },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Role removed successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove role: ${error.message}`);
    },
  });

  // Grant legacy access mutation
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
      toast.success("Full access granted successfully! User can now access all features without subscription.");
      queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
      setSelectedLegacyUserId("");
      setLegacySearchTerm("");
    },
    onError: (error: Error) => {
      toast.error(`Failed to grant access: ${error.message}`);
    },
  });

  // Revoke legacy access mutation
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
      toast.success("Full access revoked. User will need a subscription.");
      queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke access: ${error.message}`);
    },
  });

  const handleAssignRole = () => {
    if (!selectedUserId || !selectedRole) {
      toast.error("Please select both user and role");
      return;
    }
    assignRoleMutation.mutate({ userId: selectedUserId, role: selectedRole });
  };

  const handleGrantLegacy = () => {
    if (!selectedLegacyUserId) {
      toast.error("Please select a user to grant access");
      return;
    }
    grantLegacyMutation.mutate(selectedLegacyUserId);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "doctor":
        return "default";
      case "patient":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grant Full Access Section */}
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Crown className="h-5 w-5" />
            Grant Full Access (No Subscription Required)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Grant a user full access to all app features without requiring a subscription. This sets their legacy status to true.
          </p>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={legacySearchTerm}
                onChange={(e) => setLegacySearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedLegacyUserId} onValueChange={setSelectedLegacyUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select user to grant access" />
              </SelectTrigger>
              <SelectContent>
                {filteredUsersForLegacy?.filter(u => !u.is_legacy).map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.email} - {user.first_name} {user.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleGrantLegacy}
              disabled={grantLegacyMutation.isPending || !selectedLegacyUserId}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Crown className="h-4 w-4 mr-2" />
              Grant Full Access
            </Button>
          </div>

          {/* Users with Full Access */}
          {legacyUsers && legacyUsers.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Users with Full Access ({legacyUsers.length})</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {legacyUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeLegacyMutation.mutate(user.id)}
                          disabled={revokeLegacyMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Revoke Access
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Role Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Role
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {allUsers?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.email} - {user.first_name} {user.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="patient">Patient</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleAssignRole}
              disabled={assignRoleMutation.isPending}
            >
              Assign Role
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Roles Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userRoles?.map((userRole) => (
                <TableRow key={userRole.id}>
                  <TableCell>
                    {userRole.profiles.first_name} {userRole.profiles.last_name}
                  </TableCell>
                  <TableCell>{userRole.profiles.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(userRole.role)}>
                      {userRole.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(userRole.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        removeRoleMutation.mutate({
                          userId: userRole.user_id,
                          role: userRole.role,
                        })
                      }
                      disabled={removeRoleMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
