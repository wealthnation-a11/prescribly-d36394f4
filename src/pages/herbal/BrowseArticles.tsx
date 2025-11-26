import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileText, Search, Calendar, BookOpen } from 'lucide-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileHeader } from '@/components/MobileHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DOMPurify from 'dompurify';

export default function BrowseArticles() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  const { data: articles, isLoading } = useQuery({
    queryKey: ['published-articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('herbal_articles')
        .select(`
          *,
          herbal_practitioners(first_name, last_name, specialization)
        `)
        .eq('approval_status', 'approved')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredArticles = articles?.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <MobileHeader title="Herbal Articles" />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Herbal Medicine Articles</h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Learn from expert practitioners and traditional wisdom
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 sm:h-10"
                />
              </div>

              <div className="grid gap-4 sm:gap-6">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-24 w-full" />
                      </CardContent>
                    </Card>
                  ))
                ) : filteredArticles?.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 sm:p-12 text-center">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm sm:text-base text-muted-foreground">
                        {searchQuery ? 'No articles found matching your search' : 'No articles published yet'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredArticles?.map((article) => (
                    <Card key={article.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="px-4 sm:px-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg sm:text-xl line-clamp-2">
                              {article.title}
                            </CardTitle>
                            <CardDescription className="flex flex-wrap items-center gap-2 mt-2 text-xs sm:text-sm">
                              <span>{article.herbal_practitioners?.first_name} {article.herbal_practitioners?.last_name}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(article.published_at).toLocaleDateString()}
                              </span>
                            </CardDescription>
                          </div>
                          {article.category && (
                            <Badge variant="secondary" className="flex-shrink-0 text-xs">
                              {article.category}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 sm:px-6 space-y-3">
                        <div className="prose prose-sm max-w-none line-clamp-4 text-xs sm:text-sm text-muted-foreground">
                          {article.content.substring(0, 200)}...
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full gap-2 h-9 text-sm"
                          onClick={() => setSelectedArticle(article)}
                        >
                          <BookOpen className="h-4 w-4" />
                          Read Full Article
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>

      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">{selectedArticle?.title}</DialogTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-2">
              <span>By {selectedArticle?.herbal_practitioners?.first_name} {selectedArticle?.herbal_practitioners?.last_name}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {selectedArticle?.published_at && new Date(selectedArticle.published_at).toLocaleDateString()}
              </span>
              {selectedArticle?.category && (
                <>
                  <span>•</span>
                  <Badge variant="secondary" className="text-xs">{selectedArticle.category}</Badge>
                </>
              )}
            </div>
          </DialogHeader>
          <div 
            className="prose prose-sm max-w-none mt-4 text-sm"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedArticle?.content || '') }}
          />
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
