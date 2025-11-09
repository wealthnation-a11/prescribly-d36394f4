import { usePageSEO } from "@/hooks/usePageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Careers() {
  usePageSEO({
    title: "Careers | Join the Team Revolutionizing Healthcare",
    description: "Explore culture, benefits, and open roles at Prescribly. Build the future of accessible healthcare.",
    canonicalPath: "/careers",
  });

  const jobs = [
    {
      title: "Doctor Onboarding Specialist",
      desc: "Guide clinicians through credentialing and ensure a world‑class onboarding experience.",
      slug: "doctor-onboarding-specialist"
    },
    {
      title: "Full Stack Developer(React/React Native)",
      desc: "Build elegant, performant interfaces and backend systems that clinicians and patients love.",
      slug: "fullstack-developer-react"
    },
    {
      title: "Patient Support Agent",
      desc: "Support patients with compassion and resolve issues quickly across channels.",
      slug: "patient-support-agent"
    },
    {
      title: "UI/UX Designer",
      desc: "Design intuitive healthcare experiences that prioritize user needs and accessibility.",
      slug: "ui-ux-designer"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary/30 border-b border-border/50">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-4xl font-bold text-foreground">Join the Team Revolutionizing Healthcare</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">We are a mission‑driven team building accessible, secure, and trusted healthcare experiences for everyone.</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-12">
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-4">Culture & Benefits</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="card-gradient border-0">
              <CardHeader>
                <CardTitle>Remote‑first</CardTitle>
                <CardDescription>Flexible schedules, async collaboration.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="card-gradient border-0">
              <CardHeader>
                <CardTitle>Healthcare & Wellness</CardTitle>
                <CardDescription>Comprehensive plans and wellbeing stipend.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="card-gradient border-0">
              <CardHeader>
                <CardTitle>Learning Budget</CardTitle>
                <CardDescription>Annual stipend for courses and conferences.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-4">Open Roles</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {jobs.map((j) => (
              <Card key={j.title} className="hover-lift">
                <CardHeader>
                  <CardTitle className="text-lg">{j.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{j.desc}</p>
                  <Button asChild variant="medical">
                    <Link 
                      to={j.title === "Doctor Onboarding Specialist" ? "/doctor-register" : `/careers/apply/${j.slug}`} 
                      aria-label={`Apply now: ${j.title}`}
                    >
                      Apply Now
                    </Link>
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
