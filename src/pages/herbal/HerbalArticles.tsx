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
import { Plus, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function HerbalArticles() {
  const { user } = useAuth();
  const { practitioner } = useHerbalPractitioner();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
  });

  const { data: articles, isLoading } = useQuery({
    queryKey: ['herbal-articles', practitioner?.id],
    queryFn: async () => {
      if (!practitioner?.id) return [];
      const { data, error } = await supabase
        .from('herbal_articles')
        .select('*')
        .eq('practitioner_id', practitioner.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!practitioner?.id,
  });

  const createArticle = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!practitioner?.id) throw new Error('No practitioner found');
      const { error } = await supabase
        .from('herbal_articles')
        .insert({
          practitioner_id: practitioner.id,
          title: data.title,
          content: data.content,
          category: data.category,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Article submitted', description: 'Your article is pending approval' });
      queryClient.invalidateQueries({ queryKey: ['herbal-articles'] });
      setIsAdding(false);
      setFormData({ title: '', content: '', category: '' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to submit article', variant: 'destructive' });
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Articles</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Share your knowledge and expertise</p>
          </div>
          <Button onClick={() => setIsAdding(!isAdding)} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Write New Article
          </Button>
        </div>

        {isAdding && (
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">Submit New Article</CardTitle>
              <CardDescription className="text-sm">Your article will be reviewed by admins before publication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm">Article Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., The Benefits of Traditional Herbal Medicine"
                  className="h-11 sm:h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger className="h-11 sm:h-10">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="Herbal Medicine">Herbal Medicine</SelectItem>
                    <SelectItem value="Wellness Tips">Wellness Tips</SelectItem>
                    <SelectItem value="Traditional Remedies">Traditional Remedies</SelectItem>
                    <SelectItem value="Nutrition">Nutrition</SelectItem>
                    <SelectItem value="Lifestyle">Lifestyle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content" className="text-sm">Article Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your article content here..."
                  rows={10}
                  className="font-mono text-xs sm:text-sm"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => createArticle.mutate(formData)} disabled={createArticle.isPending} className="w-full sm:w-auto h-11 sm:h-10">
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
              <CardContent className="p-6 text-sm">Loading articles...</CardContent>
            </Card>
          ) : articles?.length === 0 ? (
            <Card>
              <CardContent className="p-6 sm:p-8 text-center">
                <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                <p className="text-sm sm:text-base text-muted-foreground">No articles yet. Write your first article!</p>
              </CardContent>
            </Card>
          ) : (
            articles?.map((article) => (
              <Card key={article.id}>
                <CardHeader className="px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <span className="line-clamp-2">{article.title}</span>
                        {getStatusIcon(article.approval_status)}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-1">
                        {article.category} • {new Date(article.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(article.approval_status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 px-4 sm:px-6">
                  <div className="prose prose-sm max-w-none line-clamp-3 text-xs sm:text-sm">
                    {article.content}
                  </div>
                  {article.rejection_reason && (
                    <div className="mt-3 sm:mt-4 p-3 bg-destructive/10 rounded-lg">
                      <strong className="text-destructive text-sm">Rejection Reason:</strong>
                      <p className="text-xs sm:text-sm mt-1">{article.rejection_reason}</p>
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
