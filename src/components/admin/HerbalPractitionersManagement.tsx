import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, CheckCircle, XCircle, MapPin, Clock, Eye } from "lucide-react";

interface HerbalPractitioner {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  specialization: string;
  years_of_experience: number | null;
  bio: string | null;
  qualifications: any;
  license_number: string | null;
  practice_location: string;
  verification_status: "pending" | "approved" | "rejected";
  created_at: string;
}

export const HerbalPractitionersManagement = () => {
  const [selectedPractitioner, setSelectedPractitioner] = useState<HerbalPractitioner | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const queryClient = useQueryClient();

  const { data: practitioners, isLoading } = useQuery({
    queryKey: ["herbal-practitioners", activeTab],
    queryFn: async () => {
      let query = supabase.from("herbal_practitioners").select("*");

      if (activeTab !== "all") {
        query = query.eq("verification_status", activeTab as "pending" | "approved" | "rejected");
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data as HerbalPractitioner[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      practitionerId,
      status,
      notes,
    }: {
      practitionerId: string;
      status: "approved" | "rejected";
      notes: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("herbal_practitioners")
        .update({ verification_status: status })
        .eq("id", practitionerId);

      if (updateError) throw updateError;

      const { error: auditError } = await supabase
        .from("herbal_verification_audit")
        .insert({
          practitioner_id: practitionerId,
          admin_id: user.id,
          action: status,
          notes,
        });

      if (auditError) throw auditError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["herbal-practitioners"] });
      toast.success("Status updated successfully");
      setSelectedPractitioner(null);
      setActionType(null);
      setNotes("");
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    },
  });

  const handleApproveReject = () => {
    if (!selectedPractitioner || !actionType) return;

    const status = actionType === "approve" ? "approved" : "rejected";

    updateStatusMutation.mutate({
      practitionerId: selectedPractitioner.id,
      status: status as "approved" | "rejected",
      notes,
    });
  };

  const openActionDialog = (practitioner: HerbalPractitioner, action: "approve" | "reject") => {
    setSelectedPractitioner(practitioner);
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
  const MobilePractitionerCard = ({ practitioner }: { practitioner: HerbalPractitioner }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-medium">{practitioner.first_name} {practitioner.last_name}</p>
            <p className="text-sm text-muted-foreground truncate max-w-[180px]">{practitioner.email}</p>
          </div>
          {getStatusBadge(practitioner.verification_status)}
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Leaf className="h-3.5 w-3.5" />
            <span className="truncate">{practitioner.specialization}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{practitioner.years_of_experience || 0} yrs</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{practitioner.practice_location}</span>
        </div>
        
        <div className="flex gap-2">
          {practitioner.verification_status === "pending" && (
            <>
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => openActionDialog(practitioner, "approve")}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => openActionDialog(practitioner, "reject")}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedPractitioner(practitioner)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Leaf className="h-5 w-5 text-green-500" />
        <h2 className="text-lg sm:text-xl font-bold">Herbal Practitioners</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 h-auto gap-1 p-1">
          <TabsTrigger value="pending" className="text-xs sm:text-sm px-2 py-2">Pending</TabsTrigger>
          <TabsTrigger value="approved" className="text-xs sm:text-sm px-2 py-2">Approved</TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs sm:text-sm px-2 py-2">Rejected</TabsTrigger>
          <TabsTrigger value="all" className="text-xs sm:text-sm px-2 py-2">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {/* Mobile View */}
          <div className="block md:hidden">
            {practitioners?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No practitioners found</p>
            ) : (
              practitioners?.map((practitioner) => (
                <MobilePractitionerCard key={practitioner.id} practitioner={practitioner} />
              ))
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {practitioners?.map((practitioner) => (
                  <TableRow key={practitioner.id}>
                    <TableCell className="font-medium">
                      {practitioner.first_name} {practitioner.last_name}
                    </TableCell>
                    <TableCell>{practitioner.email}</TableCell>
                    <TableCell>{practitioner.specialization}</TableCell>
                    <TableCell>
                      {practitioner.years_of_experience
                        ? `${practitioner.years_of_experience} years`
                        : "N/A"}
                    </TableCell>
                    <TableCell>{practitioner.practice_location}</TableCell>
                    <TableCell>{getStatusBadge(practitioner.verification_status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {practitioner.verification_status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => openActionDialog(practitioner, "approve")}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openActionDialog(practitioner, "reject")}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPractitioner(practitioner)}
                        >
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {practitioners?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No practitioners found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog
        open={!!actionType && !!selectedPractitioner}
        onOpenChange={() => {
          setActionType(null);
          setNotes("");
        }}
      >
        <DialogContent className="max-w-[90vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve" : "Reject"} Application
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionType} this practitioner's application?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this decision..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setActionType(null);
                setNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              className={`w-full sm:w-auto ${actionType === "approve" ? "bg-green-600 hover:bg-green-700" : ""}`}
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleApproveReject}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending
                ? "Processing..."
                : actionType === "approve"
                ? "Approve"
                : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog
        open={!!selectedPractitioner && !actionType}
        onOpenChange={() => setSelectedPractitioner(null)}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Practitioner Details</DialogTitle>
          </DialogHeader>

          {selectedPractitioner && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Name</Label>
                  <p className="text-sm">
                    {selectedPractitioner.first_name} {selectedPractitioner.last_name}
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Email</Label>
                  <p className="text-sm break-all">{selectedPractitioner.email}</p>
                </div>

                {selectedPractitioner.phone && (
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Phone</Label>
                    <p className="text-sm">{selectedPractitioner.phone}</p>
                  </div>
                )}

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Specialization</Label>
                  <p className="text-sm">{selectedPractitioner.specialization}</p>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Location</Label>
                  <p className="text-sm">{selectedPractitioner.practice_location}</p>
                </div>

                {selectedPractitioner.license_number && (
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">License</Label>
                    <p className="text-sm">{selectedPractitioner.license_number}</p>
                  </div>
                )}

                {selectedPractitioner.years_of_experience && (
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Experience</Label>
                    <p className="text-sm">{selectedPractitioner.years_of_experience} years</p>
                  </div>
                )}

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedPractitioner.verification_status)}
                  </div>
                </div>
              </div>

              {selectedPractitioner.bio && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Bio</Label>
                  <p className="text-sm mt-1">{selectedPractitioner.bio}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
