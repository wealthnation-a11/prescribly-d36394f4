import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
import { CheckCircle, XCircle, Clock, User, Stethoscope, Award } from "lucide-react";

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

  const verifyDoctorMutation = useMutation({
    mutationFn: async ({ doctorId, action, notes }: { doctorId: string; action: 'approve' | 'reject'; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke(`admin-doctors/${doctorId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, notes }),
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
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Mobile card view
  const MobileDoctorCard = ({ doctor }: { doctor: Doctor }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-medium">{doctor.profiles.first_name} {doctor.profiles.last_name}</p>
            <p className="text-sm text-muted-foreground truncate max-w-[180px]">{doctor.profiles.email}</p>
          </div>
          {getStatusBadge(doctor.verification_status)}
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Stethoscope className="h-3.5 w-3.5" />
            <span className="truncate">{doctor.specialization}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Award className="h-3.5 w-3.5" />
            <span>{doctor.years_of_experience} yrs exp</span>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground mb-3">
          License: {doctor.license_number || 'Not provided'}
        </div>
        
        {doctor.verification_status === 'pending' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => openActionDialog(doctor, 'approve')}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => openActionDialog(doctor, 'reject')}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1 p-1">
          <TabsTrigger value="pending" className="text-xs sm:text-sm px-2 py-2">
            <Clock className="w-3.5 h-3.5 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Pending</span>
            <span className="xs:hidden">Pend</span>
            <span className="ml-1">({doctors?.pending_verification || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs sm:text-sm px-2 py-2">
            <CheckCircle className="w-3.5 h-3.5 mr-1 sm:mr-2" />
            <span>Approved</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs sm:text-sm px-2 py-2">
            <XCircle className="w-3.5 h-3.5 mr-1 sm:mr-2" />
            <span>Rejected</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs sm:text-sm px-2 py-2">
            <User className="w-3.5 h-3.5 mr-1 sm:mr-2" />
            <span>All</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="block md:hidden">
                {doctors?.doctors?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No doctors found</p>
                ) : (
                  doctors?.doctors?.map((doctor: Doctor) => (
                    <MobileDoctorCard key={doctor.id} doctor={doctor} />
                  ))
                )}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block rounded-md border overflow-x-auto">
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
                            {doctor.verification_status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => openActionDialog(doctor, 'approve')}
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
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Confirmation Dialog */}
      <Dialog open={!!selectedDoctor && !!actionType} onOpenChange={() => {
        setSelectedDoctor(null);
        setActionType(null);
        setNotes("");
      }}>
        <DialogContent className="max-w-[90vw] sm:max-w-lg">
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

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => {
              setSelectedDoctor(null);
              setActionType(null);
              setNotes("");
            }}>
              Cancel
            </Button>
            <Button
              className={`w-full sm:w-auto ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}`}
              onClick={handleApproveReject}
              disabled={verifyDoctorMutation.isPending}
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
