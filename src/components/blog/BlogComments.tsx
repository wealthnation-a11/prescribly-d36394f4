import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";

interface BlogComment {
  id: string;
  post_id: string;
  user_id: string | null;
  author_name: string;
  author_email: string;
  content: string;
  approved: boolean;
  created_at: string;
}

interface BlogCommentsProps {
  postId: string;
}

export default function BlogComments({ postId }: BlogCommentsProps) {
  const queryClient = useQueryClient();
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [content, setContent] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["blog-comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_comments")
        .select("*")
        .eq("post_id", postId)
        .eq("approved", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as BlogComment[];
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (commentData: { author_name: string; author_email: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("blog_comments").insert({
        post_id: postId,
        user_id: user?.id || null,
        author_name: commentData.author_name,
        author_email: commentData.author_email,
        content: commentData.content,
        approved: false,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-comments", postId] });
      toast.success("Comment submitted! It will appear after moderation.");
      setAuthorName("");
      setAuthorEmail("");
      setContent("");
    },
    onError: (error) => {
      toast.error(`Failed to submit comment: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authorName || !authorEmail || !content) {
      toast.error("Please fill in all fields");
      return;
    }
    
    createCommentMutation.mutate({ author_name: authorName, author_email: authorEmail, content });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-6">
          <MessageSquare className="h-6 w-6" />
          Comments ({comments?.length || 0})
        </h2>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="author_name">Name *</Label>
                  <Input
                    id="author_name"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    required
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <Label htmlFor="author_email">Email *</Label>
                  <Input
                    id="author_email"
                    type="email"
                    value={authorEmail}
                    onChange={(e) => setAuthorEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="content">Comment *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={4}
                  placeholder="Share your thoughts..."
                />
              </div>

              <Button type="submit" disabled={createCommentMutation.isPending}>
                {createCommentMutation.isPending ? "Submitting..." : "Post Comment"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Your comment will be reviewed before being published.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {isLoading && <p className="text-muted-foreground">Loading comments...</p>}
        
        {comments && comments.length === 0 && (
          <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
        )}
        
        {comments?.map((comment) => (
          <Card key={comment.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-foreground">{comment.author_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(comment.created_at), "MMMM dd, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
