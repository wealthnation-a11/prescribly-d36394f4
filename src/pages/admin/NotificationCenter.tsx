import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Bell, Send, Users, AlertTriangle, CheckCircle, Clock, Plus, Search, Filter } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function NotificationCenter() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form states for creating notifications
  const [newNotification, setNewNotification] = useState({
    title: "",
    message: "",
    type: "info",
    targetAudience: "all",
    data: {}
  });

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["admin-notifications", searchTerm, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") {
        query = query.eq("type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.filter(notification => 
        !searchTerm || 
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase())
      ) || [];
    },
  });

  // Create notification mutation
  const createNotificationMutation = useMutation({
    mutationFn: async (notificationData: any) => {
      // If targeting all users, we need to get all user IDs
      if (notificationData.targetAudience === "all") {
        const { data: users } = await supabase.from("profiles").select("user_id");
        
        // Create notifications for all users
        const notifications = users?.map(user => ({
          user_id: user.user_id,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type,
          data: notificationData.data
        })) || [];

        const { error } = await supabase.from("notifications").insert(notifications);
        if (error) throw error;
      } else {
        // Handle specific user groups later
        const { error } = await supabase.from("notifications").insert(notificationData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Notification sent successfully!" });
      setIsCreateModalOpen(false);
      setNewNotification({ title: "", message: "", type: "info", targetAudience: "all", data: {} });
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to send notification", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success": return "bg-green-100 text-green-800";
      case "warning": return "bg-yellow-100 text-yellow-800";
      case "error": return "bg-red-100 text-red-800";
      case "info": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle className="h-4 w-4" />;
      case "warning": return <AlertTriangle className="h-4 w-4" />;
      case "error": return <AlertTriangle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const handleCreateNotification = () => {
    createNotificationMutation.mutate(newNotification);
  };

  return (
    <AdminLayout 
      title="Notification Center" 
      subtitle="Send and manage system notifications"
      showBackButton
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notifications?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {notifications?.filter(n => !n.read).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Notifications</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {notifications?.filter(n => n.type === "success").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {notifications?.filter(n => n.type === "error" || n.type === "warning").length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notification Management */}
        <Tabs defaultValue="send" className="space-y-4">
          <TabsList>
            <TabsTrigger value="send">Send Notifications</TabsTrigger>
            <TabsTrigger value="history">Notification History</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="send">
            <Card>
              <CardHeader>
                <CardTitle>Broadcast Notification</CardTitle>
                <CardDescription>
                  Send notifications to users across the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Notification title"
                      value={newNotification.title}
                      onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select 
                      value={newNotification.type} 
                      onValueChange={(value) => setNewNotification(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Notification message"
                    value={newNotification.message}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audience">Target Audience</Label>
                  <Select 
                    value={newNotification.targetAudience} 
                    onValueChange={(value) => setNewNotification(prev => ({ ...prev, targetAudience: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="patients">Patients Only</SelectItem>
                      <SelectItem value="doctors">Doctors Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleCreateNotification}
                  disabled={createNotificationMutation.isPending || !newNotification.title || !newNotification.message}
                  className="w-full"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {createNotificationMutation.isPending ? "Sending..." : "Send Notification"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Notification History</CardTitle>
                <CardDescription>
                  View and manage all sent notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search notifications..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          </TableRow>
                        ))
                      ) : notifications?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No notifications found
                          </TableCell>
                        </TableRow>
                      ) : (
                        notifications?.slice(0, 10).map((notification) => (
                          <TableRow key={notification.id}>
                            <TableCell>
                              <Badge className={getTypeColor(notification.type)}>
                                <span className="flex items-center gap-1">
                                  {getTypeIcon(notification.type)}
                                  {notification.type}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{notification.title}</TableCell>
                            <TableCell className="max-w-xs truncate">{notification.message}</TableCell>
                            <TableCell>
                              <Badge variant={notification.read ? "secondary" : "default"}>
                                {notification.read ? "Read" : "Unread"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(notification.created_at).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Notification Templates</CardTitle>
                <CardDescription>
                  Pre-defined notification templates for common scenarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    {
                      title: "Welcome Message",
                      description: "Welcome new users to the platform",
                      type: "success",
                      template: "Welcome to Prescribly! We're excited to have you on board."
                    },
                    {
                      title: "System Maintenance",
                      description: "Notify users about scheduled maintenance",
                      type: "warning",
                      template: "Scheduled maintenance will occur tonight from 2-4 AM. Some services may be temporarily unavailable."
                    },
                    {
                      title: "Security Alert",
                      description: "Alert users about security issues",
                      type: "error",
                      template: "Important security update: Please review your account settings and update your password."
                    },
                    {
                      title: "Feature Update",
                      description: "Announce new features or improvements",
                      type: "info",
                      template: "New feature available: Enhanced AI diagnosis with improved accuracy."
                    }
                  ].map((template, index) => (
                    <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{template.title}</CardTitle>
                          <Badge className={getTypeColor(template.type)}>
                            {template.type}
                          </Badge>
                        </div>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">{template.template}</p>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setNewNotification(prev => ({
                              ...prev,
                              title: template.title,
                              message: template.template,
                              type: template.type
                            }));
                          }}
                        >
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}