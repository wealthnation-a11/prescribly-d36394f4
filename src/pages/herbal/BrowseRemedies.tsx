import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Package, Search, ShoppingCart } from 'lucide-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileHeader } from '@/components/MobileHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useShoppingCart } from '@/hooks/useShoppingCart';

export default function BrowseRemedies() {
  const [searchQuery, setSearchQuery] = useState('');
  const { addToCart } = useShoppingCart();

  const { data: remedies, isLoading } = useQuery({
    queryKey: ['approved-remedies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('herbal_remedies')
        .select(`
          *,
          herbal_practitioners(first_name, last_name, specialization)
        `)
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredRemedies = remedies?.filter((remedy) =>
    remedy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    remedy.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <MobileHeader title="Herbal Remedies" />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Herbal Remedies</h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Discover natural remedies from certified practitioners
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search remedies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 sm:h-10"
                />
              </div>

              <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full mt-2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))
                ) : filteredRemedies?.length === 0 ? (
                  <div className="col-span-full">
                    <Card>
                      <CardContent className="p-8 sm:p-12 text-center">
                        <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm sm:text-base text-muted-foreground">
                          {searchQuery ? 'No remedies found matching your search' : 'No remedies available yet'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  filteredRemedies?.map((remedy) => (
                    <Card key={remedy.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="px-4 sm:px-6">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base sm:text-lg line-clamp-2">{remedy.name}</CardTitle>
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100 flex-shrink-0">
                            ${remedy.price?.toFixed(2)}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs sm:text-sm line-clamp-2">
                          {remedy.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 sm:px-6 text-sm">
                        <div>
                          <strong className="text-xs sm:text-sm">Practitioner:</strong>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {remedy.herbal_practitioners?.first_name} {remedy.herbal_practitioners?.last_name}
                          </p>
                        </div>
                        <div>
                          <strong className="text-xs sm:text-sm">Ingredients:</strong>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                            {Array.isArray(remedy.ingredients) ? remedy.ingredients.join(', ') : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <strong className="text-xs sm:text-sm">Usage:</strong>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">
                            {remedy.usage_instructions}
                          </p>
                        </div>
                        <Button 
                          onClick={() => addToCart(remedy.id)}
                          className="w-full gap-2 h-10 sm:h-9 text-sm" 
                          variant="outline"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Add to Cart
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
    </SidebarProvider>
  );
}
