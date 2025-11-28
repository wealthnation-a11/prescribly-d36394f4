import { useState } from 'react';
import { HerbalPractitionerLayout } from '@/components/HerbalPractitionerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHerbalPractitioner } from '@/hooks/useHerbalPractitioner';
import { Plus, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function HerbalRemedies() {
  const { user } = useAuth();
  const { practitioner } = useHerbalPractitioner();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ingredients: '',
    usage_instructions: '',
    price: '',
  });

  const { data: remedies, isLoading } = useQuery({
    queryKey: ['herbal-remedies', practitioner?.id],
    queryFn: async () => {
      if (!practitioner?.id) return [];
      const { data, error } = await supabase
        .from('herbal_remedies')
        .select('*')
        .eq('practitioner_id', practitioner.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!practitioner?.id,
  });

  const createRemedy = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!practitioner?.id) throw new Error('No practitioner found');
      const { error } = await supabase
        .from('herbal_remedies')
        .insert({
          practitioner_id: practitioner.id,
          name: data.name,
          description: data.description,
          ingredients: data.ingredients.split(',').map(i => i.trim()),
          usage_instructions: data.usage_instructions,
          price: parseFloat(data.price),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Remedy submitted', description: 'Your remedy is pending approval' });
      queryClient.invalidateQueries({ queryKey: ['herbal-remedies'] });
      setIsAdding(false);
      setFormData({ name: '', description: '', ingredients: '', usage_instructions: '', price: '' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to submit remedy', variant: 'destructive' });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      approved: 'default',
      pending: 'secondary',
      rejected: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <HerbalPractitionerLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Remedies</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your herbal remedies and submissions</p>
          </div>
          <Button onClick={() => setIsAdding(!isAdding)} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Add New Remedy
          </Button>
        </div>

        {isAdding && (
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">Submit New Remedy</CardTitle>
              <CardDescription className="text-sm">Your remedy will be reviewed by admins before approval</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">Remedy Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Healing Herbal Tea"
                  className="h-11 sm:h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the remedy and its benefits"
                  rows={3}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ingredients" className="text-sm">Ingredients (comma-separated)</Label>
                <Input
                  id="ingredients"
                  value={formData.ingredients}
                  onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                  placeholder="Ginger, Turmeric, Honey"
                  className="h-11 sm:h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usage" className="text-sm">Usage Instructions</Label>
                <Textarea
                  id="usage"
                  value={formData.usage_instructions}
                  onChange={(e) => setFormData({ ...formData, usage_instructions: e.target.value })}
                  placeholder="How to prepare and use this remedy"
                  rows={3}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price" className="text-sm">Price (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="29.99"
                  className="h-11 sm:h-10"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => createRemedy.mutate(formData)} disabled={createRemedy.isPending} className="w-full sm:w-auto h-11 sm:h-10">
                  Submit for Approval
                </Button>
                <Button variant="outline" onClick={() => setIsAdding(false)} className="w-full sm:w-auto h-11 sm:h-10">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3 sm:gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-sm">Loading remedies...</CardContent>
            </Card>
          ) : remedies?.length === 0 ? (
            <Card>
              <CardContent className="p-6 sm:p-8 text-center space-y-4">
                <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">No Remedies Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start building your herbal remedy catalog! Add your first remedy and it will be reviewed by our admin team.
                  </p>
                  <Button onClick={() => setIsAdding(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Your First Remedy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            remedies?.map((remedy) => (
              <Card key={remedy.id}>
                <CardHeader className="px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <span className="truncate">{remedy.name}</span>
                        {getStatusIcon(remedy.approval_status)}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">{remedy.description}</CardDescription>
                    </div>
                    {getStatusBadge(remedy.approval_status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 px-4 sm:px-6 text-sm">
                  <div>
                    <strong>Ingredients:</strong> {Array.isArray(remedy.ingredients) ? remedy.ingredients.join(', ') : 'N/A'}
                  </div>
                  <div>
                    <strong>Usage:</strong> {remedy.usage_instructions}
                  </div>
                  <div>
                    <strong>Price:</strong> ${remedy.price?.toFixed(2)}
                  </div>
                  {remedy.rejection_reason && (
                    <div className="mt-3 sm:mt-4 p-3 bg-destructive/10 rounded-lg">
                      <strong className="text-destructive text-sm">Rejection Reason:</strong>
                      <p className="text-xs sm:text-sm mt-1">{remedy.rejection_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </HerbalPractitionerLayout>
  );
}
