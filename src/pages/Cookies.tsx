import { usePageSEO } from "@/hooks/usePageSEO";

export default function Cookies() {
  usePageSEO({
    title: "Prescribly Cookies Policy",
    description: "Understand how Prescribly uses cookies and similar technologies, and how to manage your preferences.",
    canonicalPath: "/cookies",
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary/30 border-b border-border/50">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-4xl font-bold text-foreground">Cookies Policy</h1>
          <p className="text-muted-foreground mt-2">Effective date: January 1, 2025</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-10">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">1. What Are Cookies?</h2>
          <p className="text-muted-foreground">
            Cookies are small text files stored on your device that help websites remember information about your visit and improve your experience.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">2. Types of Cookies We Use</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Strictly Necessary: Required for core functionality like authentication and security.</li>
            <li>Performance/Analytics: Help us understand usage and improve the product.</li>
            <li>Functional: Remember preferences such as language and region.</li>
            <li>Advertising: Used to deliver relevant content; you can opt out where available.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">3. How We Use Cookies</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Maintain your session and keep you signed in.</li>
            <li>Measure performance and detect errors.</li>
            <li>Improve features and personalize content.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">4. Managing Preferences</h2>
          <p className="text-muted-foreground">
            You can control cookies through your browser settings and, where available, in‑product preferences. Disabling certain cookies may impact functionality.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">5. Do Not Track</h2>
          <p className="text-muted-foreground">
            Our services may not respond to Do Not Track signals due to a lack of industry standards.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">6. Updates</h2>
          <p className="text-muted-foreground">We may update this policy and will post the latest version here.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">7. Contact</h2>
          <p className="text-muted-foreground">Email: privacy@prescribly.com</p>
        </section>
      </main>
    </div>
  );
}
