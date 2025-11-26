import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface HerbalArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  approval_status: string;
  created_at: string;
  practitioner_id: string;
  herbal_practitioners: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const HerbalArticlesModeration = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedArticle, setSelectedArticle] = useState<HerbalArticle | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: articles, isLoading } = useQuery({
    queryKey: ['herbal-articles-moderation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('herbal_articles')
        .select(`
          *,
          herbal_practitioners (
            first_name,
            last_name,
            email
          )
        `)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as HerbalArticle[];
    },
  });

  const updateArticleMutation = useMutation({
    mutationFn: async ({ articleId, status, notes }: { articleId: string; status: string; notes: string }) => {
      const updateData: any = {
        approval_status: status,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      };

      if (status === 'rejected') {
        updateData.rejection_reason = notes;
      } else if (status === 'approved') {
        updateData.published_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('herbal_articles')
        .update(updateData)
        .eq('id', articleId);

      if (updateError) throw updateError;

      // Create audit log
      const { error: auditError } = await supabase
        .from('herbal_article_audit')
        .insert({
          article_id: articleId,
          admin_id: user?.id,
          action: status,
          notes: notes,
        });

      if (auditError) throw auditError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['herbal-articles-moderation'] });
      toast.success('Article status updated successfully');
      setSelectedArticle(null);
      setActionType(null);
      setNotes('');
    },
    onError: (error) => {
      toast.error('Failed to update article status');
      console.error(error);
    },
  });

  const handleAction = (article: HerbalArticle, action: 'approve' | 'reject') => {
    setSelectedArticle(article);
    setActionType(action);
  };

  const handleConfirm = () => {
    if (!selectedArticle || !actionType) return;
    updateArticleMutation.mutate({
      articleId: selectedArticle.id,
      status: actionType === 'approve' ? 'approved' : 'rejected',
      notes,
    });
  };

  const handleViewDetails = (article: HerbalArticle) => {
    setSelectedArticle(article);
    setShowDetailsDialog(true);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Herbal Articles</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Article Title</TableHead>
              <TableHead>Practitioner</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles?.map((article) => (
              <TableRow key={article.id}>
                <TableCell className="font-medium">{article.title}</TableCell>
                <TableCell>
                  {article.herbal_practitioners.first_name} {article.herbal_practitioners.last_name}
                </TableCell>
                <TableCell>{article.category || 'Uncategorized'}</TableCell>
                <TableCell>{new Date(article.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewDetails(article)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="default" onClick={() => handleAction(article, 'approve')}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleAction(article, 'reject')}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Action Dialog */}
        <Dialog open={!!actionType} onOpenChange={() => { setActionType(null); setNotes(''); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'Approve' : 'Reject'} Article
              </DialogTitle>
              <DialogDescription>
                {actionType === 'approve' 
                  ? 'Are you sure you want to approve this article?' 
                  : 'Please provide a reason for rejection:'}
              </DialogDescription>
            </DialogHeader>
            {actionType === 'reject' && (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
              />
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setActionType(null); setNotes(''); }}>
                Cancel
              </Button>
              <Button onClick={handleConfirm}>
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedArticle?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Content</h4>
                <div className="text-sm text-muted-foreground prose prose-sm max-w-none">
                  {selectedArticle?.content}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
