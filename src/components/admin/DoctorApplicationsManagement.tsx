import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye, Clock, User } from "lucide-react";

interface Doctor {
  id: string;
  user_id: string;
  specialization: string;
  license_number: string;
  years_of_experience: number;
  consultation_fee: number;
  verification_status: 'pending' | 'approved' | 'rejected';
  bio: string;
  rating: number;
  total_reviews: number;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const DoctorApplicationsManagement = () => {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch doctors based on status
  const { data: doctors, isLoading } = useQuery({
    queryKey: ['admin-doctors', activeTab],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (activeTab !== 'all') {
        queryParams.append('status', activeTab);
      }
      queryParams.append('page', '1');
      queryParams.append('limit', '50');

      const { data, error } = await supabase.functions.invoke(`admin-doctors?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
  });

  // Mutation for approving/rejecting doctors
  const verifyDoctorMutation = useMutation({
    mutationFn: async ({ doctorId, action, notes }: { doctorId: string; action: 'approve' | 'reject'; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke(`admin-doctors/${doctorId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          notes,
        }),
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Success",
        description: `Doctor ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-doctors'] });
      setSelectedDoctor(null);
      setActionType(null);
      setNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update doctor status",
        variant: "destructive",
      });
    },
  });

  const handleApproveReject = () => {
    if (!selectedDoctor || !actionType) return;
    
    verifyDoctorMutation.mutate({
      doctorId: selectedDoctor.id,
      action: actionType,
      notes: notes.trim() || undefined,
    });
  };

  const openActionDialog = (doctor: Doctor, action: 'approve' | 'reject') => {
    setSelectedDoctor(doctor);
    setActionType(action);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            <Clock className="w-4 h-4 mr-2" />
            Pending ({doctors?.pending_verification || 0})
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle className="w-4 h-4 mr-2" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <XCircle className="w-4 h-4 mr-2" />
            Rejected
          </TabsTrigger>
          <TabsTrigger value="all">
            <User className="w-4 h-4 mr-2" />
            All Doctors
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>License</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors?.doctors?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No doctors found for this status
                      </TableCell>
                    </TableRow>
                  ) : (
                    doctors?.doctors?.map((doctor: Doctor) => (
                      <TableRow key={doctor.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {doctor.profiles.first_name} {doctor.profiles.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {doctor.profiles.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{doctor.specialization}</TableCell>
                        <TableCell>{doctor.years_of_experience} years</TableCell>
                        <TableCell className="font-mono text-sm">
                          {doctor.license_number || 'Not provided'}
                        </TableCell>
                        <TableCell>{getStatusBadge(doctor.verification_status)}</TableCell>
                        <TableCell>
                          {new Date(doctor.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {doctor.verification_status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => openActionDialog(doctor, 'approve')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => openActionDialog(doctor, 'reject')}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Confirmation Dialog */}
      <Dialog open={!!selectedDoctor && !!actionType} onOpenChange={() => {
        setSelectedDoctor(null);
        setActionType(null);
        setNotes("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Doctor Application
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionType} the application from{' '}
              {selectedDoctor?.profiles.first_name} {selectedDoctor?.profiles.last_name}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">
                {actionType === 'reject' ? 'Reason for rejection' : 'Additional notes'} (optional)
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  actionType === 'reject'
                    ? "Please provide a reason for rejection..."
                    : "Any additional comments..."
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedDoctor(null);
              setActionType(null);
              setNotes("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveReject}
              disabled={verifyDoctorMutation.isPending}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {verifyDoctorMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              ) : actionType === 'approve' ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorApplicationsManagement;