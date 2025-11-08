import { usePageSEO } from "@/hooks/usePageSEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import NewsletterSubscribe from "@/components/blog/NewsletterSubscribe";

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
  views: number;
  created_at: string;
}

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  usePageSEO({
    title: "Prescribly Blog | Insights on Digital Health",
    description: "Featured stories and insights on telemedicine, data privacy, and how Prescribly enhances virtual care.",
    canonicalPath: "/blog",
  });

  const { data: posts, isLoading } = useQuery({
    queryKey: ["published-blog-posts", selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true);
      
      if (selectedCategory) {
        query = query.eq("category", selectedCategory);
      }
      
      const { data, error } = await query.order("published_at", { ascending: false });
      
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("category")
        .eq("published", true)
        .not("category", "is", null);
      
      if (error) throw error;
      const uniqueCategories = [...new Set(data.map(p => p.category).filter(Boolean))];
      return uniqueCategories as string[];
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading blog posts...</p>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-secondary/30 border-b border-border/50">
          <div className="container mx-auto px-4 py-10">
            <h1 className="text-4xl font-bold text-foreground">Prescribly Blog</h1>
            <p className="text-muted-foreground mt-2">Featured articles and the latest posts</p>
          </div>
        </header>
        <main className="container mx-auto px-4 py-10">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No blog posts available yet. Check back soon!</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary/30 border-b border-border/50">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-4xl font-bold text-foreground">Prescribly Blog</h1>
          <p className="text-muted-foreground mt-2">Featured articles and the latest posts</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 space-y-8">
        {/* Category Filter */}
        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Badge>
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        )}

        {/* Newsletter Subscription */}
        <NewsletterSubscribe />
        {/* Featured */}
        <section>
          <div className="grid lg:grid-cols-2 gap-6 items-stretch">
            <Card className="overflow-hidden">
              <img 
                src={posts[0].cover_image || "/placeholder.svg"} 
                alt={posts[0].title} 
                className="w-full h-56 object-cover bg-secondary/50" 
                loading="lazy" 
              />
              <CardHeader>
                <CardTitle className="text-2xl">{posts[0].title}</CardTitle>
                <CardDescription>{posts[0].excerpt}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{posts[0].published_at ? format(new Date(posts[0].published_at), "MMM dd, yyyy") : ""}</span>
                  </div>
                </div>
                <Button variant="medical" asChild>
                  <Link to={`/blog/${posts[0].slug}`} aria-label={`Read more: ${posts[0].title}`}>Read more</Link>
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-6">
              {posts.slice(1, 3).map((p) => (
                <Card key={p.id} className="overflow-hidden">
                  <div className="grid sm:grid-cols-3 gap-0">
                    <img 
                      src={p.cover_image || "/placeholder.svg"} 
                      alt={p.title} 
                      className="sm:col-span-1 w-full h-full object-cover bg-secondary/50" 
                      loading="lazy" 
                    />
                    <div className="sm:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-xl">{p.title}</CardTitle>
                        <CardDescription>{p.excerpt}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                          <span>{p.published_at ? format(new Date(p.published_at), "MMM dd, yyyy") : ""}</span>
                        </div>
                        <Button variant="outline" asChild>
                          <Link to={`/blog/${p.slug}`} aria-label={`Read more: ${p.title}`}>Read more</Link>
                        </Button>
                      </CardContent>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Recent posts list */}
        {posts.length > 3 && (
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Recent Posts</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {posts.slice(3).map((p) => (
                <Card key={p.id} className="hover-lift">
                  <CardHeader>
                    <CardTitle className="text-lg">{p.title}</CardTitle>
                    <CardDescription>{p.excerpt}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                      <span>{p.published_at ? format(new Date(p.published_at), "MMM dd, yyyy") : ""}</span>
                    </div>
                    <Button variant="link" asChild>
                      <Link to={`/blog/${p.slug}`} aria-label={`Read more: ${p.title}`}>Read more →</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
