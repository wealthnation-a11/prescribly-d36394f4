import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { format } from "date-fns";

interface BlogComment {
  id: string;
  post_id: string;
  author_name: string;
  author_email: string;
  content: string;
  approved: boolean;
  created_at: string;
  blog_posts: {
    title: string;
  } | null;
}

export default function CommentModeration() {
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ["admin-blog-comments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_comments")
        .select(`
          *,
          blog_posts!inner(title)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as BlogComment[];
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("blog_comments")
        .update({ approved })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-comments"] });
      toast.success("Comment status updated");
    },
    onError: (error) => {
      toast.error(`Failed to update comment: ${error.message}`);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blog_comments")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-comments"] });
      toast.success("Comment deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete comment: ${error.message}`);
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading comments...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Comment Moderation</h2>
        <p className="text-sm text-muted-foreground">Approve or reject blog comments</p>
      </div>

      <div className="grid gap-4">
        {comments?.map((comment) => (
          <Card key={comment.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {comment.author_name}
                    {comment.approved ? (
                      <Badge variant="default">Approved</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{comment.author_email}</p>
                  <p className="text-sm text-muted-foreground">
                    On: {comment.blog_posts?.title || "Unknown post"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(comment.created_at), "MMM dd, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!comment.approved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateCommentMutation.mutate({ id: comment.id, approved: true })}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  )}
                  {comment.approved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateCommentMutation.mutate({ id: comment.id, approved: false })}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Unapprove
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this comment?")) {
                        deleteCommentMutation.mutate(comment.id);
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!comments || comments.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No comments yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
