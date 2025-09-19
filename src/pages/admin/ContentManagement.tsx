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
import { FileText, Plus, Edit, Trash2, Search, Calendar, Target, Trophy } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ContentManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateTipModalOpen, setIsCreateTipModalOpen] = useState(false);
  const [isCreateChallengeModalOpen, setIsCreateChallengeModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form states
  const [newTip, setNewTip] = useState({ tip: "" });
  const [newChallenge, setNewChallenge] = useState({
    title: "",
    description: "",
    challenge_type: "general",
    duration: 7,
    points_per_day: 5,
    start_date: "",
    end_date: ""
  });

  // Fetch health tips
  const { data: healthTips, isLoading: tipsLoading } = useQuery({
    queryKey: ["admin-health-tips", searchTerm],
    queryFn: async () => {
      let query = supabase.from("health_tips").select("*").order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return data?.filter(tip => 
        !searchTerm || tip.tip.toLowerCase().includes(searchTerm.toLowerCase())
      ) || [];
    },
  });

  // Fetch challenges
  const { data: challenges, isLoading: challengesLoading } = useQuery({
    queryKey: ["admin-challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Create health tip mutation
  const createTipMutation = useMutation({
    mutationFn: async (tipData: any) => {
      const { error } = await supabase.from("health_tips").insert(tipData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Health tip created successfully!" });
      setIsCreateTipModalOpen(false);
      setNewTip({ tip: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-health-tips"] });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to create health tip", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Create challenge mutation
  const createChallengeMutation = useMutation({
    mutationFn: async (challengeData: any) => {
      const { error } = await supabase.from("challenges").insert({
        ...challengeData,
        total_points: challengeData.duration * challengeData.points_per_day
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Challenge created successfully!" });
      setIsCreateChallengeModalOpen(false);
      setNewChallenge({
        title: "",
        description: "",
        challenge_type: "general",
        duration: 7,
        points_per_day: 5,
        start_date: "",
        end_date: ""
      });
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to create challenge", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getChallengeTypeColor = (type: string) => {
    switch (type) {
      case "hydration": return "bg-blue-100 text-blue-800";
      case "steps": return "bg-green-100 text-green-800";
      case "general": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AdminLayout 
      title="Content Management" 
      subtitle="Manage health tips, challenges, and platform content"
      showBackButton
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Health Tips</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthTips?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Published tips</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Challenges</CardTitle>
              <Trophy className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {challenges?.filter(c => c.active).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Running challenges</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Challenges</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{challenges?.length || 0}</div>
              <p className="text-xs text-muted-foreground">All time challenges</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Management Tabs */}
        <Tabs defaultValue="health-tips" className="space-y-4">
          <TabsList>
            <TabsTrigger value="health-tips">Health Tips</TabsTrigger>
            <TabsTrigger value="challenges">Health Challenges</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="health-tips">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Health Tips Management</CardTitle>
                    <CardDescription>Create and manage daily health tips</CardDescription>
                  </div>
                  <Dialog open={isCreateTipModalOpen} onOpenChange={setIsCreateTipModalOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Health Tip
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Health Tip</DialogTitle>
                        <DialogDescription>
                          Add a new health tip for users
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="tip">Health Tip</Label>
                          <Textarea
                            id="tip"
                            placeholder="Enter health tip content..."
                            value={newTip.tip}
                            onChange={(e) => setNewTip({ tip: e.target.value })}
                            rows={4}
                          />
                        </div>
                        <Button 
                          onClick={() => createTipMutation.mutate(newTip)}
                          disabled={createTipMutation.isPending || !newTip.tip}
                          className="w-full"
                        >
                          {createTipMutation.isPending ? "Creating..." : "Create Tip"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search health tips..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Tip Content</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tipsLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          </TableRow>
                        ))
                      ) : healthTips?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No health tips found
                          </TableCell>
                        </TableRow>
                      ) : (
                        healthTips?.map((tip) => (
                          <TableRow key={tip.id}>
                            <TableCell className="font-mono">{tip.id}</TableCell>
                            <TableCell className="max-w-md truncate">{tip.tip}</TableCell>
                            <TableCell>{new Date(tip.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-600">
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="challenges">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Health Challenges Management</CardTitle>
                    <CardDescription>Create and manage health challenges</CardDescription>
                  </div>
                  <Dialog open={isCreateChallengeModalOpen} onOpenChange={setIsCreateChallengeModalOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Challenge
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Create New Challenge</DialogTitle>
                        <DialogDescription>
                          Set up a new health challenge for users
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                              id="title"
                              placeholder="Challenge title"
                              value={newChallenge.title}
                              onChange={(e) => setNewChallenge(prev => ({ ...prev, title: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="type">Type</Label>
                            <Select 
                              value={newChallenge.challenge_type} 
                              onValueChange={(value) => setNewChallenge(prev => ({ ...prev, challenge_type: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="general">General</SelectItem>
                                <SelectItem value="hydration">Hydration</SelectItem>
                                <SelectItem value="steps">Steps</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            placeholder="Challenge description"
                            value={newChallenge.description}
                            onChange={(e) => setNewChallenge(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="duration">Duration (days)</Label>
                            <Input
                              id="duration"
                              type="number"
                              value={newChallenge.duration}
                              onChange={(e) => setNewChallenge(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="points">Points per day</Label>
                            <Input
                              id="points"
                              type="number"
                              value={newChallenge.points_per_day}
                              onChange={(e) => setNewChallenge(prev => ({ ...prev, points_per_day: parseInt(e.target.value) }))}
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="start_date">Start Date</Label>
                            <Input
                              id="start_date"
                              type="date"
                              value={newChallenge.start_date}
                              onChange={(e) => setNewChallenge(prev => ({ ...prev, start_date: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="end_date">End Date</Label>
                            <Input
                              id="end_date"
                              type="date"
                              value={newChallenge.end_date}
                              onChange={(e) => setNewChallenge(prev => ({ ...prev, end_date: e.target.value }))}
                            />
                          </div>
                        </div>

                        <Button 
                          onClick={() => createChallengeMutation.mutate(newChallenge)}
                          disabled={createChallengeMutation.isPending || !newChallenge.title || !newChallenge.description}
                          className="w-full"
                        >
                          {createChallengeMutation.isPending ? "Creating..." : "Create Challenge"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {challengesLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          </TableRow>
                        ))
                      ) : challenges?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No challenges found
                          </TableCell>
                        </TableRow>
                      ) : (
                        challenges?.map((challenge) => (
                          <TableRow key={challenge.id}>
                            <TableCell className="font-medium">{challenge.title}</TableCell>
                            <TableCell>
                              <Badge className={getChallengeTypeColor(challenge.challenge_type)}>
                                {challenge.challenge_type}
                              </Badge>
                            </TableCell>
                            <TableCell>{challenge.duration} days</TableCell>
                            <TableCell>{challenge.total_points} pts</TableCell>
                            <TableCell>
                              <Badge variant={challenge.active ? "default" : "secondary"}>
                                {challenge.active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(challenge.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-600">
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <Card>
              <CardHeader>
                <CardTitle>System Announcements</CardTitle>
                <CardDescription>
                  Manage platform-wide announcements and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Announcements Coming Soon</h3>
                  <p>This feature will allow you to create and manage system-wide announcements.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}