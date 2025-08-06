import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageCircle, Phone, Video, Clock, User, Calendar, DollarSign } from "lucide-react";

export const DoctorMessages = () => {
  const [activeTab, setActiveTab] = useState("chat");

  // Mock data for call logs - will be replaced with actual Supabase data
  const callLogs = [
    {
      id: "1",
      patientName: "Sarah Johnson",
      date: "2024-01-15",
      duration: "15 mins",
      amountEarned: "₦2,500"
    },
    {
      id: "2", 
      patientName: "Michael Chen",
      date: "2024-01-14",
      duration: "20 mins",
      amountEarned: "₦3,000"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Patient Messages</h1>
        <p className="text-muted-foreground">Communicate with patients via chat or call</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
              <MessageCircle className="w-5 h-5 text-primary" />
              Unread Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-card-foreground">0</p>
            <p className="text-sm text-muted-foreground">new messages</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
              <Phone className="w-5 h-5 text-secondary" />
              Call Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-card-foreground">0</p>
            <p className="text-sm text-muted-foreground">pending calls</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
              <Video className="w-5 h-5 text-accent" />
              Total Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-card-foreground">{callLogs.length}</p>
            <p className="text-sm text-muted-foreground">this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Chat and Scheduled Calls */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-border">
              <TabsList className="grid w-full grid-cols-2 bg-muted">
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="calls" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Scheduled Calls
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="p-6">
              {/* Empty State for Chat */}
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-card-foreground mb-2">No patient messages yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  You'll see chats after a confirmed appointment. Patients can reach out to you through the secure messaging system.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="calls" className="p-6">
              {callLogs.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Phone className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-card-foreground">Audio Call Log</h3>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Patient Name
                        </TableHead>
                        <TableHead className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Date
                        </TableHead>
                        <TableHead className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Duration
                        </TableHead>
                        <TableHead className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Amount Earned
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {callLogs.map((call) => (
                        <TableRow key={call.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium text-card-foreground">
                            {call.patientName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(call.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {call.duration}
                          </TableCell>
                          <TableCell className="font-semibold text-secondary">
                            {call.amountEarned}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Phone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-card-foreground mb-2">No calls yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your audio call history will appear here once you start conducting patient consultations.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorMessages;