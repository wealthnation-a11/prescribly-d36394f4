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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, CheckCircle, XCircle } from "lucide-react";

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
    const variants = {
      pending: "default",
      approved: "default",
      rejected: "destructive",
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Leaf className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Herbal Practitioners</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="border rounded-lg">
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
                              variant="default"
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
                          View Details
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve" : "Reject"} Application
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionType} this practitioner's application?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this decision..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setActionType(null);
                  setNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
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
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog
        open={!!selectedPractitioner && !actionType}
        onOpenChange={() => setSelectedPractitioner(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Practitioner Details</DialogTitle>
          </DialogHeader>

          {selectedPractitioner && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Name</Label>
                <p>
                  {selectedPractitioner.first_name} {selectedPractitioner.last_name}
                </p>
              </div>

              <div>
                <Label className="text-sm font-semibold">Email</Label>
                <p>{selectedPractitioner.email}</p>
              </div>

              {selectedPractitioner.phone && (
                <div>
                  <Label className="text-sm font-semibold">Phone</Label>
                  <p>{selectedPractitioner.phone}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold">Specialization</Label>
                <p>{selectedPractitioner.specialization}</p>
              </div>

              <div>
                <Label className="text-sm font-semibold">Practice Location</Label>
                <p>{selectedPractitioner.practice_location}</p>
              </div>

              {selectedPractitioner.license_number && (
                <div>
                  <Label className="text-sm font-semibold">License Number</Label>
                  <p>{selectedPractitioner.license_number}</p>
                </div>
              )}

              {selectedPractitioner.years_of_experience && (
                <div>
                  <Label className="text-sm font-semibold">Years of Experience</Label>
                  <p>{selectedPractitioner.years_of_experience} years</p>
                </div>
              )}

              {selectedPractitioner.bio && (
                <div>
                  <Label className="text-sm font-semibold">Bio</Label>
                  <p className="text-sm">{selectedPractitioner.bio}</p>
                </div>
              )}

              {selectedPractitioner.qualifications && (
                <div>
                  <Label className="text-sm font-semibold">Qualifications</Label>
                  <p className="text-sm">{JSON.stringify(selectedPractitioner.qualifications)}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold">Status</Label>
                <div className="mt-1">
                  {getStatusBadge(selectedPractitioner.verification_status)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
