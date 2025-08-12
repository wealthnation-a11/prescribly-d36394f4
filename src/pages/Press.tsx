import { usePageSEO } from "@/hooks/usePageSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Press() {
  usePageSEO({
    title: "Press | Prescribly in the News",
    description: "Press resources, media mentions, awards, and contact information for journalists.",
    canonicalPath: "/press",
  });

  const mentions = [
    { outlet: "TechCrunch", note: "Featured Startup", img: "/placeholder.svg" },
    { outlet: "HealthTech Awards", note: "Best Telemedicine Platform 2025", img: "/placeholder.svg" },
    { outlet: "Forbes", note: "Ones to Watch in Digital Health", img: "/placeholder.svg" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary/30 border-b border-border/50">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-4xl font-bold text-foreground">Prescribly in the News</h1>
          <p className="text-muted-foreground mt-2">Press kit and media resources</p>
          <div className="mt-4">
            <Button asChild variant="medical">
              <a href="#" download>Download Press Kit</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-12">
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-6">Media Mentions & Awards</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentions.map((m) => (
              <Card key={m.outlet} className="hover-lift">
                <CardHeader>
                  <CardTitle className="text-lg">{m.outlet}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                  <img src={m.img} alt={`${m.outlet} logo`} width={64} height={64} loading="lazy" className="rounded bg-secondary/40" />
                  <p className="text-muted-foreground">{m.note}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-6">For Media Inquiries</h2>
          <form className="grid gap-4 max-w-2xl">
            <label className="grid gap-2">
              <span className="text-sm text-foreground">Name</span>
              <input className="border rounded-md bg-background px-3 py-2" placeholder="Your name" required aria-label="Name" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-foreground">Email</span>
              <input type="email" className="border rounded-md bg-background px-3 py-2" placeholder="you@example.com" required aria-label="Email" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-foreground">Message</span>
              <textarea className="border rounded-md bg-background px-3 py-2 min-h-[120px]" placeholder="How can we help?" required aria-label="Message" />
            </label>
            <div>
              <Button type="submit" variant="medical">Send</Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
