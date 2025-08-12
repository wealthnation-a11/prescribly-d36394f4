import { usePageSEO } from "@/hooks/usePageSEO";

export default function Privacy() {
  usePageSEO({
    title: "Prescribly Privacy Policy",
    description: "Learn how Prescribly collects, uses, stores, and protects your data, including HIPAA safeguards for medical information.",
    canonicalPath: "/privacy",
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary/30 border-b border-border/50">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-4xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">Effective date: January 1, 2025</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-10">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">1. Overview</h2>
          <p className="text-muted-foreground">
            We are committed to protecting your privacy. This Policy explains what we collect, why we collect it, and how we handle it. For U.S. users, Protected Health Information (PHI) is handled pursuant to HIPAA where applicable.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">2. Data We Collect</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Account information (name, email, phone).</li>
            <li>Consultation and medical information (PHI) when using clinical features.</li>
            <li>Usage, device, and log data to improve performance and security.</li>
            <li>Cookies and similar technologies (see Cookies Policy).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">3. How We Use Data</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Provide and improve services and support.</li>
            <li>Authenticate users and secure accounts.</li>
            <li>Comply with legal obligations and healthcare regulations.</li>
            <li>Communicate important updates and service notices.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">4. How We Share Data</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>With clinicians you choose to engage for care.</li>
            <li>With service providers under strict contractual controls (including Business Associate Agreements where required).</li>
            <li>When required by law or to protect rights and safety.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">5. HIPAA and PHI</h2>
          <p className="text-muted-foreground">
            For HIPAA‑regulated activity, we implement administrative, technical, and physical safeguards to protect PHI, including encryption in transit and at rest, role‑based access controls, and audit logging. We execute Business Associate Agreements with relevant partners.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">6. Data Security</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Encryption in transit (TLS) and at rest.</li>
            <li>Access controls, least‑privilege permissions, and authentication safeguards.</li>
            <li>Monitoring, logging, and routine security reviews.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">7. Data Retention</h2>
          <p className="text-muted-foreground">
            We retain personal data for as long as necessary to provide services and meet legal obligations. PHI retention follows applicable healthcare regulations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">8. Your Rights</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Access, correction, or deletion of your data (subject to legal exceptions).</li>
            <li>Opt‑out of certain communications.</li>
            <li>For PHI, rights under HIPAA including access and accounting of disclosures.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">9. Children’s Privacy</h2>
          <p className="text-muted-foreground">
            Our services are not directed to children under 13 without appropriate consent as required by law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">10. Changes</h2>
          <p className="text-muted-foreground">We may update this Policy. We will post the updated date at the top of this page.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">11. Contact</h2>
          <p className="text-muted-foreground">Email: privacy@prescribly.com</p>
        </section>
      </main>
    </div>
  );
}
