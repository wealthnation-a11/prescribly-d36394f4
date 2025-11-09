import { useParams, Link } from "react-router-dom";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Calendar, Share2, Facebook, Twitter, Linkedin, Copy } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BlogComments from "@/components/blog/BlogComments";
import { Helmet } from "react-helmet";
import DOMPurify from "dompurify";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author_id: string;
  published: boolean;
  published_at: string | null;
  category: string | null;
  tags: string[] | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
  og_image: string | null;
  views: number;
  created_at: string;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [hasIncrementedView, setHasIncrementedView] = useState(false);

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      console.log('Fetching blog post with slug:', slug);
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .single();
      
      if (error) {
        console.error('Error fetching blog post:', error);
        throw error;
      }
      
      console.log('Blog post data:', data);
      return data as BlogPost;
    },
    enabled: !!slug,
  });

  // Increment view count
  useMutation({
    mutationFn: async () => {
      if (!post?.id || hasIncrementedView) return;
      
      const { error } = await supabase
        .from("blog_posts")
        .update({ views: (post.views || 0) + 1 })
        .eq("id", post.id);
      
      if (error) throw error;
      setHasIncrementedView(true);
    },
    onSuccess: () => {
      // Silent success
    },
  }).mutate();

  usePageSEO({
    title: post ? `${post.title} | Prescribly Blog` : "Blog Post | Prescribly",
    description: post?.meta_description || post?.excerpt || "Read our latest blog post",
    canonicalPath: `/blog/${slug}`,
  });

  // Set meta tags for SEO and social sharing
  useEffect(() => {
    if (!post) return;

    const metaKeywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
    if (metaKeywords && post.meta_keywords) {
      metaKeywords.content = post.meta_keywords.join(", ");
    } else if (post.meta_keywords) {
      const meta = document.createElement("meta");
      meta.name = "keywords";
      meta.content = post.meta_keywords.join(", ");
      document.head.appendChild(meta);
    }
  }, [post]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = post?.title || "";

  const handleShareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const handleShareFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const handleShareLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading blog post...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Blog post error:', error);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Error Loading Post</h1>
          <p className="text-muted-foreground mb-6">There was an error loading this blog post.</p>
          <Button asChild>
            <Link to="/blog">Back to Blog</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-6">The blog post you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/blog">Back to Blog</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.meta_description || post.excerpt || ""} />
        <meta property="og:image" content={post.og_image || post.cover_image || ""} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={shareUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.meta_description || post.excerpt || ""} />
        <meta name="twitter:image" content={post.og_image || post.cover_image || ""} />
      </Helmet>
      <div className="min-h-screen bg-background">
        <header className="bg-secondary/30 border-b border-border/50">
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/blog">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-foreground mb-4">{post.title}</h1>
              <div className="flex items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{post.published_at ? format(new Date(post.published_at), "MMMM dd, yyyy") : ""}</span>
                </div>
                {post.category && (
                  <span className="px-3 py-1 bg-primary/10 rounded-full text-sm">{post.category}</span>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShareTwitter}>
                  <Twitter className="h-4 w-4 mr-2" />
                  Share on Twitter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareFacebook}>
                  <Facebook className="h-4 w-4 mr-2" />
                  Share on Facebook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareLinkedIn}>
                  <Linkedin className="h-4 w-4 mr-2" />
                  Share on LinkedIn
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <article className="max-w-4xl mx-auto">
          {post.cover_image && (
            <img 
              src={post.cover_image} 
              alt={post.title} 
              className="w-full h-96 object-cover rounded-lg mb-8" 
              loading="lazy"
            />
          )}
          
          {post.content && (
            <div 
              className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
            />
          )}

          {!post.content && (
            <p className="text-muted-foreground">No content available for this post.</p>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="mt-8 flex gap-2 flex-wrap">
              {post.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-secondary/50 rounded-full text-sm text-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" asChild>
                  <Link to="/blog">More Articles</Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleShareTwitter}>
                      <Twitter className="h-4 w-4 mr-2" />
                      Twitter
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShareFacebook}>
                      <Facebook className="h-4 w-4 mr-2" />
                      Facebook
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShareLinkedIn}>
                      <Linkedin className="h-4 w-4 mr-2" />
                      LinkedIn
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-sm text-muted-foreground">{post.views} views</p>
            </div>
          </div>

          {/* Comments Section */}
          <div className="mt-16 pt-8 border-t border-border">
            <BlogComments postId={post.id} />
          </div>
        </article>
      </main>
      </div>
    </>
  );
}