import { HerbalPractitionerLayout } from '@/components/HerbalPractitionerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHerbalPractitioner } from '@/hooks/useHerbalPractitioner';
import { Leaf, FileText, Calendar, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const HerbalPractitionerDashboard = () => {
  const { practitioner, isApproved, isPending } = useHerbalPractitioner();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['herbal-stats', practitioner?.id],
    queryFn: async () => {
      if (!practitioner?.id) return null;

      const [remediesRes, articlesRes, consultationsRes] = await Promise.all([
        supabase.from('herbal_remedies').select('*', { count: 'exact', head: true }).eq('practitioner_id', practitioner.id),
        supabase.from('herbal_articles').select('*', { count: 'exact', head: true }).eq('practitioner_id', practitioner.id),
        supabase.from('herbal_consultations').select('*', { count: 'exact', head: true }).eq('practitioner_id', practitioner.id),
      ]);

      return {
        totalRemedies: remediesRes.count || 0,
        totalArticles: articlesRes.count || 0,
        totalConsultations: consultationsRes.count || 0,
      };
    },
    enabled: !!practitioner?.id && isApproved,
  });

  if (isPending) {
    return (
      <HerbalPractitionerLayout>
        <div className="max-w-4xl mx-auto">
          <Alert>
            <AlertDescription>
              Your herbal practitioner application is pending approval. You'll be notified once an admin reviews your application.
            </AlertDescription>
          </Alert>
        </div>
      </HerbalPractitionerLayout>
    );
  }

  if (!isApproved) {
    return (
      <HerbalPractitionerLayout>
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>
              Your herbal practitioner application was not approved. Please contact support for more information.
            </AlertDescription>
          </Alert>
        </div>
      </HerbalPractitionerLayout>
    );
  }

  return (
    <HerbalPractitionerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Herbal Practitioner Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome back, {practitioner?.first_name}!</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Remedies</CardTitle>
              <Leaf className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalRemedies || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalArticles || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consultations</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalConsultations || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦0</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={() => navigate('/herbal-remedies')}>
                <Leaf className="mr-2 h-4 w-4" />
                Add New Remedy
              </Button>
              <Button className="w-full" variant="outline" onClick={() => navigate('/herbal-articles')}>
                <FileText className="mr-2 h-4 w-4" />
                Write Article
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </HerbalPractitionerLayout>
  );
};

export default HerbalPractitionerDashboard;
