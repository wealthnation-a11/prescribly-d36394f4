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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Remedies</h1>
            <p className="text-muted-foreground">Manage your herbal remedies and submissions</p>
          </div>
          <Button onClick={() => setIsAdding(!isAdding)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add New Remedy
          </Button>
        </div>

        {isAdding && (
          <Card>
            <CardHeader>
              <CardTitle>Submit New Remedy</CardTitle>
              <CardDescription>Your remedy will be reviewed by admins before approval</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Remedy Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Healing Herbal Tea"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the remedy and its benefits"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ingredients">Ingredients (comma-separated)</Label>
                <Input
                  id="ingredients"
                  value={formData.ingredients}
                  onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                  placeholder="Ginger, Turmeric, Honey"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usage">Usage Instructions</Label>
                <Textarea
                  id="usage"
                  value={formData.usage_instructions}
                  onChange={(e) => setFormData({ ...formData, usage_instructions: e.target.value })}
                  placeholder="How to prepare and use this remedy"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="29.99"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => createRemedy.mutate(formData)} disabled={createRemedy.isPending}>
                  Submit for Approval
                </Button>
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">Loading remedies...</CardContent>
            </Card>
          ) : remedies?.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No remedies yet. Add your first remedy!</p>
              </CardContent>
            </Card>
          ) : (
            remedies?.map((remedy) => (
              <Card key={remedy.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {remedy.name}
                        {getStatusIcon(remedy.approval_status)}
                      </CardTitle>
                      <CardDescription>{remedy.description}</CardDescription>
                    </div>
                    {getStatusBadge(remedy.approval_status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
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
                    <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                      <strong className="text-destructive">Rejection Reason:</strong>
                      <p className="text-sm mt-1">{remedy.rejection_reason}</p>
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
