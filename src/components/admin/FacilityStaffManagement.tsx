import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Building2 } from "lucide-react";

export default function FacilityStaffManagement() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [role, setRole] = useState("receptionist");

  const { data: facilities } = useQuery({
    queryKey: ["admin-facilities-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, type")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: staffList, isLoading } = useQuery({
    queryKey: ["admin-facility-staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_staff")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch facility names and user emails
      const facilityIds = [...new Set(data?.map(s => s.facility_id))];
      const userIds = [...new Set(data?.map(s => s.user_id))];

      const [facilitiesRes, profilesRes] = await Promise.all([
        supabase.from("facilities").select("id, name").in("id", facilityIds),
        supabase.from("profiles").select("user_id, email, first_name, last_name").in("user_id", userIds),
      ]);

      const facilityMap = new Map(facilitiesRes.data?.map(f => [f.id, f.name]) || []);
      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);

      return data?.map(s => ({
        ...s,
        facility_name: facilityMap.get(s.facility_id) || "Unknown",
        user_email: profileMap.get(s.user_id)?.email || "Unknown",
        user_name: profileMap.has(s.user_id)
          ? `${profileMap.get(s.user_id)!.first_name} ${profileMap.get(s.user_id)!.last_name}`
          : "Unknown",
      })) || [];
    },
  });

  const createStaff = useMutation({
    mutationFn: async () => {
      // Create auth user via admin edge function
      const { data: authData, error: authError } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "create-facility-staff",
          email,
          password,
          facilityId,
          role,
        },
      });

      if (authError) throw authError;
      if (authData?.error) throw new Error(authData.error);
      return authData;
    },
    onSuccess: () => {
      toast({ title: "Staff account created", description: `Account created for ${email}` });
      queryClient.invalidateQueries({ queryKey: ["admin-facility-staff"] });
      setOpen(false);
      setEmail("");
      setPassword("");
      setFacilityId("");
      setRole("receptionist");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("facility_staff")
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-facility-staff"] });
      toast({ title: "Staff updated" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Facility Staff Accounts</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage staff accounts for approved facilities
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Staff Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="staff@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <Input
                  type="text"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Facility</Label>
                <Select value={facilityId} onValueChange={setFacilityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities?.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} ({f.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => createStaff.mutate()}
                disabled={!email || !password || !facilityId || createStaff.isPending}
              >
                {createStaff.isPending ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff</TableHead>
            <TableHead>Facility</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
            </TableRow>
          ) : !staffList?.length ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No staff accounts yet</TableCell>
            </TableRow>
          ) : (
            staffList.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{staff.user_name}</p>
                    <p className="text-xs text-muted-foreground">{staff.user_email}</p>
                  </div>
                </TableCell>
                <TableCell>{staff.facility_name}</TableCell>
                <TableCell className="capitalize">{staff.role}</TableCell>
                <TableCell>
                  <Badge variant={staff.is_active ? "default" : "secondary"}>
                    {staff.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant={staff.is_active ? "destructive" : "default"}
                    onClick={() => toggleActive.mutate({ id: staff.id, isActive: staff.is_active })}
                  >
                    {staff.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
