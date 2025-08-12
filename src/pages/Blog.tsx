import { usePageSEO } from "@/hooks/usePageSEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Blog() {
  usePageSEO({
    title: "Prescribly Blog | Insights on Digital Health",
    description: "Featured stories and insights on telemedicine, data privacy, and how Prescribly enhances virtual care.",
    canonicalPath: "/blog",
  });

  const posts = [
    {
      title: "5 Ways Telemedicine is Transforming Healthcare in 2025",
      excerpt: "From faster triage to continuous care, telemedicine is reshaping patient experience and outcomes.",
      img: "/placeholder.svg",
    },
    {
      title: "The Importance of Data Privacy in Digital Health",
      excerpt: "As care moves online, patient trust depends on strong security and transparent data practices.",
      img: "/placeholder.svg",
    },
    {
      title: "How Prescribly Doctors Deliver Better Consultations",
      excerpt: "Tools that reduce admin overhead, surface context instantly, and keep visits focused on care.",
      img: "/placeholder.svg",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary/30 border-b border-border/50">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-4xl font-bold text-foreground">Prescribly Blog</h1>
          <p className="text-muted-foreground mt-2">Featured articles and the latest posts</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 space-y-12">
        {/* Featured */}
        <section>
          <div className="grid lg:grid-cols-2 gap-6 items-stretch">
            <Card className="overflow-hidden">
              <img src={posts[0].img} alt={posts[0].title} className="w-full h-56 object-cover bg-secondary/50" loading="lazy" />
              <CardHeader>
                <CardTitle className="text-2xl">{posts[0].title}</CardTitle>
                <CardDescription>{posts[0].excerpt}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="medical" asChild>
                  <a href="#" aria-label={`Read more: ${posts[0].title}`}>Read more</a>
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-6">
              {posts.slice(1).map((p) => (
                <Card key={p.title} className="overflow-hidden">
                  <div className="grid sm:grid-cols-3 gap-0">
                    <img src={p.img} alt={p.title} className="sm:col-span-1 w-full h-full object-cover bg-secondary/50" loading="lazy" />
                    <div className="sm:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-xl">{p.title}</CardTitle>
                        <CardDescription>{p.excerpt}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" asChild>
                          <a href="#" aria-label={`Read more: ${p.title}`}>Read more</a>
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
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-4">Recent Posts</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {posts.map((p) => (
              <Card key={`recent-${p.title}`} className="hover-lift">
                <CardHeader>
                  <CardTitle className="text-lg">{p.title}</CardTitle>
                  <CardDescription>{p.excerpt}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="link" asChild>
                    <a href="#" aria-label={`Read more: ${p.title}`}>Read more →</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
