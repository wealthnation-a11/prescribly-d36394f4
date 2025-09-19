import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, Eye, Check, X, Star, Calendar, DollarSign, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function DoctorManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "suspended">("all");
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [approvalReason, setApprovalReason] = useState("");
  const queryClient = useQueryClient();

  const { data: doctors, isLoading } = useQuery({
    queryKey: ["admin-doctors", searchTerm, statusFilter],
    queryFn: async () => {
      // First get doctors
      const { data: doctors, error: doctorsError } = await supabase
        .from("doctors")
        .select("*")
        .order("created_at", { ascending: false });

      if (doctorsError) throw doctorsError;
      if (!doctors) return [];

      // Then get profiles for these doctors
      const userIds = doctors.map(d => d.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const doctorsWithProfiles = doctors.map(doctor => {
        const profile = profiles?.find(p => p.user_id === doctor.user_id);
        return {
          ...doctor,
          profiles: profile
        };
      });

      // Filter by status
      const filteredByStatus = statusFilter !== "all" 
        ? doctorsWithProfiles.filter(doctor => doctor.verification_status === statusFilter)
        : doctorsWithProfiles;

      // Filter by search term if provided
      if (searchTerm) {
        return filteredByStatus.filter(doctor => 
          doctor.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doctor.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doctor.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      return filteredByStatus;
    },
  });

  const approveDoctorMutation = useMutation({
    mutationFn: async ({ doctorId, status, reason }: { doctorId: string; status: "approved" | "rejected" | "pending" | "suspended"; reason?: string }) => {
      const { error } = await supabase
        .from("doctors")
        .update({ 
          verification_status: status,
          // Add any additional fields if needed
        })
        .eq("id", doctorId);
      
      if (error) throw error;
      
      // Create notification for the doctor
      const doctor = doctors?.find(d => d.id === doctorId);
      if (doctor) {
        await supabase.from("notifications").insert({
          user_id: doctor.user_id,
          title: `Application ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `Your doctor application has been ${status}. ${reason || ''}`,
          type: status === 'approved' ? 'approval' : 'rejection'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-doctors"] });
      toast.success("Doctor status updated successfully");
      setSelectedDoctor(null);
      setApprovalReason("");
    },
    onError: (error) => {
      toast.error("Failed to update doctor status");
      console.error(error);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <AdminLayout title="Doctor Management" subtitle="Review and approve doctor applications" showBackButton>
      <div className="space-y-6">
        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Doctor Applications</CardTitle>
            <CardDescription>
              Review doctor credentials and manage approvals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search doctors by name, email, or specialization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Doctors Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="animate-pulse">Loading doctors...</div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : doctors && doctors.length > 0 ? (
                    doctors.map((doctor) => (
                      <TableRow key={doctor.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={doctor.profiles?.avatar_url} />
                              <AvatarFallback>
                                {doctor.profiles?.first_name?.[0]}{doctor.profiles?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {doctor.profiles?.email}
                              </div>
                              {doctor.license_number && (
                                <div className="text-xs text-muted-foreground">
                                  License: {doctor.license_number}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{doctor.specialization}</div>
                          <div className="text-sm text-muted-foreground">
                            Fee: ${doctor.consultation_fee || 'Not set'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {doctor.years_of_experience} years
                          </div>
                          {doctor.rating > 0 && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {doctor.rating} ({doctor.total_reviews} reviews)
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(doctor.verification_status)}>
                            {doctor.verification_status?.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3" />
                            {formatDate(doctor.created_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedDoctor(doctor)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Doctor Application Review</DialogTitle>
                                <DialogDescription>
                                  Review credentials and approve or reject this application
                                </DialogDescription>
                              </DialogHeader>
                              {selectedDoctor && (
                                <div className="space-y-6">
                                  {/* Basic Information */}
                                  <div>
                                    <h3 className="font-semibold mb-3">Basic Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium">Full Name</label>
                                        <p className="text-sm text-muted-foreground">
                                          Dr. {selectedDoctor.profiles?.first_name} {selectedDoctor.profiles?.last_name}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Email</label>
                                        <p className="text-sm text-muted-foreground">{selectedDoctor.profiles?.email}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Specialization</label>
                                        <p className="text-sm text-muted-foreground">{selectedDoctor.specialization}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Years of Experience</label>
                                        <p className="text-sm text-muted-foreground">{selectedDoctor.years_of_experience} years</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">License Number</label>
                                        <p className="text-sm text-muted-foreground">{selectedDoctor.license_number || "Not provided"}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Consultation Fee</label>
                                        <p className="text-sm text-muted-foreground">${selectedDoctor.consultation_fee || 'Not set'}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Bio */}
                                  {selectedDoctor.bio && (
                                    <div>
                                      <h3 className="font-semibold mb-3">Professional Bio</h3>
                                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                                        {selectedDoctor.bio}
                                      </p>
                                    </div>
                                  )}

                                  {/* KYC Documents */}
                                  <div>
                                    <h3 className="font-semibold mb-3">Submitted Documents</h3>
                                    <div className="space-y-2">
                                      {selectedDoctor.kyc_documents ? (
                                        Object.entries(selectedDoctor.kyc_documents).map(([key, value]) => (
                                          <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded">
                                            <FileText className="w-4 h-4" />
                                            <span className="text-sm">{key}: {typeof value === 'string' ? value : 'Uploaded'}</span>
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-sm text-muted-foreground">No documents submitted</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Approval Actions */}
                                  {selectedDoctor.verification_status === 'pending' && (
                                    <div>
                                      <h3 className="font-semibold mb-3">Review Decision</h3>
                                      <div className="space-y-4">
                                        <Textarea
                                          placeholder="Add a note for the doctor (optional)..."
                                          value={approvalReason}
                                          onChange={(e) => setApprovalReason(e.target.value)}
                                        />
                                        <div className="flex gap-3">
                                          <Button
                                            onClick={() => approveDoctorMutation.mutate({
                                              doctorId: selectedDoctor.id,
                                              status: 'approved',
                                              reason: approvalReason
                                            })}
                                            disabled={approveDoctorMutation.isPending}
                                            className="bg-green-600 hover:bg-green-700"
                                          >
                                            <Check className="w-4 h-4 mr-2" />
                                            Approve Application
                                          </Button>
                                          <Button
                                            variant="destructive"
                                            onClick={() => approveDoctorMutation.mutate({
                                              doctorId: selectedDoctor.id,
                                              status: 'rejected',
                                              reason: approvalReason
                                            })}
                                            disabled={approveDoctorMutation.isPending}
                                          >
                                            <X className="w-4 h-4 mr-2" />
                                            Reject Application
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No doctors found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}