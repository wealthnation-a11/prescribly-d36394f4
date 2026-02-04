import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Download, Trash2, UserX, UserCheck, Shield, ShieldOff } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

interface UserProfile {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  subscription_tier: string | null;
  subscription_status: string | null;
  is_legacy?: boolean;
}

const UserManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list", search: searchQuery },
      });
      if (error) throw error;
      return data.users as UserProfile[];
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "suspend" | "activate" }) => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action, userId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User status updated successfully");
    },
    onError: () => {
      toast.error("Failed to update user status");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete", userId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User deleted successfully");
      setDeleteUserId(null);
    },
    onError: () => {
      toast.error("Failed to delete user");
    },
  });

  const toggleFullAccessMutation = useMutation({
    mutationFn: async ({ userId, grant }: { userId: string; grant: boolean }) => {
      const action = grant ? "grant-full-access" : "revoke-full-access";
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action, userId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(
        variables.grant 
          ? "Full access granted successfully. User will see changes on next login." 
          : "Full access revoked successfully. User will see changes on next login."
      );
    },
    onError: () => {
      toast.error("Failed to update user access");
    },
  });

  const downloadExcel = () => {
    if (!users) return;
    
    const worksheet = XLSX.utils.json_to_sheet(
      users.map(user => ({
        Name: `${user.first_name} ${user.last_name}`,
        Email: user.email,
        Role: user.role,
        Joined: new Date(user.created_at).toLocaleDateString(),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, `users-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel file downloaded");
  };

  const downloadPDF = () => {
    if (!users) return;
    
    const doc = new jsPDF();
    doc.text("User Management Report", 14, 15);
    
    autoTable(doc, {
      startY: 25,
      head: [['Name', 'Email', 'Role', 'Joined']],
      body: users.map(user => [
        `${user.first_name} ${user.last_name}`,
        user.email,
        user.role,
        new Date(user.created_at).toLocaleDateString(),
      ]),
    });
    
    doc.save(`users-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF file downloaded");
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      admin: "destructive",
      doctor: "default",
      patient: "secondary",
    };
    return <Badge variant={variants[role] || "secondary"}>{role}</Badge>;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  // Mobile card view for users
  const MobileUserCard = ({ user }: { user: UserProfile }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-medium">{user.first_name} {user.last_name}</p>
            <p className="text-sm text-muted-foreground truncate max-w-[200px]">{user.email}</p>
          </div>
          <div className="flex gap-1 items-center">
            {user.is_legacy && (
              <Badge variant="default" className="bg-green-600">Full Access</Badge>
            )}
            {getRoleBadge(user.role)}
          </div>
        </div>
        <div className="flex justify-between items-center text-sm mb-3">
          <span className="text-muted-foreground">
            {user.subscription_tier ? `${user.subscription_tier}` : "No subscription"}
          </span>
          <span className="text-muted-foreground">
            {new Date(user.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.is_legacy ? (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => toggleFullAccessMutation.mutate({ userId: user.user_id, grant: false })}
            >
              <ShieldOff className="h-4 w-4 mr-1" />
              Revoke Access
            </Button>
          ) : (
            <Button
              size="sm"
              variant="default"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => toggleFullAccessMutation.mutate({ userId: user.user_id, grant: true })}
            >
              <Shield className="h-4 w-4 mr-1" />
              Grant Full Access
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateUserMutation.mutate({ userId: user.user_id, action: "suspend" })}
          >
            <UserX className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateUserMutation.mutate({ userId: user.user_id, action: "activate" })}
          >
            <UserCheck className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDeleteUserId(user.user_id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-md"
        />
        <div className="flex gap-2">
          <Button onClick={downloadExcel} variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={downloadPDF} variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block md:hidden">
        {users?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No users found</p>
        ) : (
          users?.map((user) => <MobileUserCard key={user.user_id} user={user} />)
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users?.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    {user.is_legacy ? (
                      <Badge variant="default" className="bg-green-600">Full Access</Badge>
                    ) : (
                      <span className="text-muted-foreground">Standard</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.subscription_tier ? (
                      <Badge variant="outline">
                        {user.subscription_tier} - {user.subscription_status}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {user.is_legacy ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleFullAccessMutation.mutate({ userId: user.user_id, grant: false })}
                          title="Revoke Full Access"
                        >
                          <ShieldOff className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => toggleFullAccessMutation.mutate({ userId: user.user_id, grant: true })}
                          title="Grant Full Access"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateUserMutation.mutate({ userId: user.user_id, action: "suspend" })}
                        title="Suspend"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateUserMutation.mutate({ userId: user.user_id, action: "activate" })}
                        title="Activate"
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteUserId(user.user_id)}
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteUserMutation.mutate(deleteUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;
