import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, User, Stethoscope, Award, FileText, Eye, Download, Loader2 } from "lucide-react";

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
  kyc_documents: Record<string, string> | null;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const DOC_LABELS: Record<string, string> = {
  governmentId: "Government ID",
  degreecert: "Medical Degree",
  license: "Professional License",
  specialization: "Specialization Certificate",
  cv: "CV / Resume",
  photo: "Photo",
};

const DoctorApplicationsManagement = () => {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [viewingDocsFor, setViewingDocsFor] = useState<Doctor | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingDocs, setLoadingDocs] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['admin-doctors', activeTab],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-doctors', {
        body: { action: 'list', status: activeTab !== 'all' ? activeTab : undefined, page: 1, limit: 50 },
      });
      if (error) throw error;
      return data;
    },
  });

  const verifyDoctorMutation = useMutation({
    mutationFn: async ({ doctorId, action, notes }: { doctorId: string; action: 'approve' | 'reject'; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-doctors', {
        body: { action: 'verify', doctorId, verificationAction: action, notes },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({ title: "Success", description: `Doctor ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['admin-doctors'] });
      setSelectedDoctor(null);
      setActionType(null);
      setNotes("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update doctor status", variant: "destructive" });
    },
  });

  const handleApproveReject = () => {
    if (!selectedDoctor || !actionType) return;
    verifyDoctorMutation.mutate({ doctorId: selectedDoctor.id, action: actionType, notes: notes.trim() || undefined });
  };

  const openActionDialog = (doctor: Doctor, action: 'approve' | 'reject') => {
    setSelectedDoctor(doctor);
    setActionType(action);
  };

  const viewDocuments = async (doctor: Doctor) => {
    setViewingDocsFor(doctor);
    setSignedUrls({});
    setLoadingDocs(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-doctors', {
        body: { action: 'getDocuments', doctorId: doctor.id },
      });
      if (error) throw error;
      setSignedUrls(data?.documents || {});
    } catch (err: any) {
      toast({ title: "Error loading documents", description: err.message, variant: "destructive" });
    } finally {
      setLoadingDocs(false);
    }
  };

  const hasDocuments = (doctor: Doctor) => {
    return doctor.kyc_documents && Object.keys(doctor.kyc_documents).filter(k => k !== 'full_name').length > 0;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

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
        <div className="flex gap-2 flex-wrap">
          {hasDocuments(doctor) && (
            <Button size="sm" variant="outline" onClick={() => viewDocuments(doctor)}>
              <FileText className="w-4 h-4 mr-1" />KYC Docs
            </Button>
          )}
          {doctor.verification_status === 'pending' && (
            <>
              <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => openActionDialog(doctor, 'approve')}>
                <CheckCircle className="w-4 h-4 mr-1" />Approve
              </Button>
              <Button size="sm" variant="destructive" className="flex-1" onClick={() => openActionDialog(doctor, 'reject')}>
                <XCircle className="w-4 h-4 mr-1" />Reject
              </Button>
            </>
          )}
        </div>
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
            <CheckCircle className="w-3.5 h-3.5 mr-1 sm:mr-2" />Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs sm:text-sm px-2 py-2">
            <XCircle className="w-3.5 h-3.5 mr-1 sm:mr-2" />Rejected
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs sm:text-sm px-2 py-2">
            <User className="w-3.5 h-3.5 mr-1 sm:mr-2" />All
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <>
              <div className="block md:hidden">
                {doctors?.doctors?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No doctors found</p>
                ) : (
                  doctors?.doctors?.map((doctor: Doctor) => (
                    <MobileDoctorCard key={doctor.id} doctor={doctor} />
                  ))
                )}
              </div>

              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>License</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctors?.doctors?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No doctors found for this status
                        </TableCell>
                      </TableRow>
                    ) : (
                      doctors?.doctors?.map((doctor: Doctor) => (
                        <TableRow key={doctor.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{doctor.profiles.first_name} {doctor.profiles.last_name}</div>
                              <div className="text-sm text-muted-foreground">{doctor.profiles.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>{doctor.specialization}</TableCell>
                          <TableCell>{doctor.years_of_experience} years</TableCell>
                          <TableCell className="font-mono text-sm">{doctor.license_number || 'N/A'}</TableCell>
                          <TableCell>
                            {hasDocuments(doctor) ? (
                              <Button size="sm" variant="outline" className="h-8" onClick={() => viewDocuments(doctor)}>
                                <Eye className="w-3.5 h-3.5 mr-1" />View
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(doctor.verification_status)}</TableCell>
                          <TableCell>{new Date(doctor.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {doctor.verification_status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openActionDialog(doctor, 'approve')}>
                                  <CheckCircle className="w-4 h-4 mr-1" />Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => openActionDialog(doctor, 'reject')}>
                                  <XCircle className="w-4 h-4 mr-1" />Reject
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

      {/* KYC Documents Viewer Dialog */}
      <Dialog open={!!viewingDocsFor} onOpenChange={() => setViewingDocsFor(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              KYC Documents — {viewingDocsFor?.profiles.first_name} {viewingDocsFor?.profiles.last_name}
            </DialogTitle>
            <DialogDescription>
              Review uploaded verification documents before approving this doctor.
            </DialogDescription>
          </DialogHeader>

          {loadingDocs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : Object.keys(signedUrls).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No documents uploaded</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(signedUrls).map(([docType, url]) => {
                const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)/i) || docType === 'photo';
                return (
                  <Card key={docType} className="overflow-hidden border-border/50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{DOC_LABELS[docType] || docType}</span>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex">
                          <Button size="sm" variant="ghost" className="h-7 px-2">
                            <Download className="h-3.5 w-3.5 mr-1" />Open
                          </Button>
                        </a>
                      </div>
                      {isImage ? (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={url}
                            alt={DOC_LABELS[docType] || docType}
                            className="w-full h-40 object-cover rounded-md border border-border/30 hover:opacity-90 transition-opacity cursor-pointer"
                          />
                        </a>
                      ) : (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center h-40 rounded-md border border-border/30 bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                        >
                          <div className="text-center">
                            <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                            <span className="text-sm text-primary">Click to view</span>
                          </div>
                        </a>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {viewingDocsFor?.verification_status === 'pending' && Object.keys(signedUrls).length > 0 && (
            <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
              <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" onClick={() => { setViewingDocsFor(null); openActionDialog(viewingDocsFor!, 'approve'); }}>
                <CheckCircle className="w-4 h-4 mr-2" />Approve Doctor
              </Button>
              <Button variant="destructive" className="w-full sm:w-auto" onClick={() => { setViewingDocsFor(null); openActionDialog(viewingDocsFor!, 'reject'); }}>
                <XCircle className="w-4 h-4 mr-2" />Reject Doctor
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={!!selectedDoctor && !!actionType} onOpenChange={() => { setSelectedDoctor(null); setActionType(null); setNotes(""); }}>
        <DialogContent className="max-w-[90vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{actionType === 'approve' ? 'Approve' : 'Reject'} Doctor Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionType} the application from {selectedDoctor?.profiles.first_name} {selectedDoctor?.profiles.last_name}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">{actionType === 'reject' ? 'Reason for rejection' : 'Additional notes'} (optional)</Label>
              <Textarea
                id="notes"
                placeholder={actionType === 'reject' ? "Please provide a reason for rejection..." : "Any additional comments..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setSelectedDoctor(null); setActionType(null); setNotes(""); }}>Cancel</Button>
            <Button
              className={`w-full sm:w-auto ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}`}
              onClick={handleApproveReject}
              disabled={verifyDoctorMutation.isPending}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {verifyDoctorMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : actionType === 'approve' ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorApplicationsManagement;
