import { usePageSEO } from "@/hooks/usePageSEO";

export default function HipaaCompliance() {
  usePageSEO({
    title: "Prescribly HIPAA Compliance",
    description: "Learn how Prescribly safeguards PHI with HIPAA-aligned administrative, technical, and physical controls.",
    canonicalPath: "/hipaa-compliance",
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary/30 border-b border-border/50">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-4xl font-bold text-foreground">HIPAA Compliance</h1>
          <p className="text-muted-foreground mt-2">How we protect Protected Health Information (PHI)</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-10">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">1. Overview</h2>
          <p className="text-muted-foreground">
            Prescribly maintains administrative, technical, and physical safeguards designed to meet HIPAA requirements for protecting PHI. We continually evaluate and enhance our controls.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">2. Safeguards</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li><span className="font-medium text-foreground">Administrative:</span> policies, workforce training, risk assessments, and vendor management.</li>
            <li><span className="font-medium text-foreground">Technical:</span> encryption in transit and at rest, access controls, audit logging, and monitoring.</li>
            <li><span className="font-medium text-foreground">Physical:</span> secure facilities and device management practices.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">3. Encryption</h2>
          <p className="text-muted-foreground">
            We use strong cryptography to protect PHI in transit (TLS) and at rest. Keys are managed securely with limited access.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">4. Access Controls</h2>
          <p className="text-muted-foreground">
            Access follows least‑privilege and is tightly controlled through authentication, authorization, and periodic reviews.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">5. Business Associate Agreements</h2>
          <p className="text-muted-foreground">
            We execute Business Associate Agreements (BAAs) with relevant partners handling PHI on our behalf.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">6. Breach Notification</h2>
          <p className="text-muted-foreground">
            We maintain incident response procedures and comply with applicable HIPAA breach notification requirements.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">7. Your Rights Under HIPAA</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Right to access and obtain a copy of your PHI.</li>
            <li>Right to request corrections to your PHI.</li>
            <li>Right to receive an accounting of disclosures.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">8. Contact</h2>
          <p className="text-muted-foreground">Email: privacy@prescribly.com</p>
          <p className="text-xs text-muted-foreground mt-2">This information is provided for transparency and does not constitute legal advice.</p>
        </section>
      </main>
    </div>
  );
}
