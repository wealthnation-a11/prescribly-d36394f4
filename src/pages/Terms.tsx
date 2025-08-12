import { usePageSEO } from "@/hooks/usePageSEO";

export default function Terms() {
  usePageSEO({
    title: "Prescribly Terms of Use",
    description: "Read the Prescribly Terms of Use covering acceptable use, intellectual property, disclaimers, and limitations of liability.",
    canonicalPath: "/terms",
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary/30 border-b border-border/50">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-4xl font-bold text-foreground">Terms of Use</h1>
          <p className="text-muted-foreground mt-2">Effective date: January 1, 2025</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-10">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By accessing or using Prescribly, you agree to these Terms. If you do not agree, do not use the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">2. Eligibility and Accounts</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>You must provide accurate account information and maintain its security.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>Healthcare guidance provided on Prescribly does not replace in‑person emergency care. Call local emergency services in an emergency.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">3. Acceptable Use</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>No misuse, reverse engineering, or interference with the platform.</li>
            <li>No unlawful, harmful, or deceptive activity.</li>
            <li>No attempts to access data you are not authorized to view.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">4. Intellectual Property</h2>
          <p className="text-muted-foreground">
            Prescribly, including content, logos, software, and materials, is protected by intellectual property laws. You may not copy, modify, or distribute our materials without permission.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">5. Disclaimers</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Services are provided on an "as is" and "as available" basis.</li>
            <li>We do not warrant uninterrupted or error‑free operation.</li>
            <li>Information provided by clinicians on Prescribly is for medical consultation purposes but may not be suitable for emergencies.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">6. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            To the maximum extent permitted by law, Prescribly and its affiliates are not liable for indirect, incidental, special, or consequential damages, or any loss of profits or data.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">7. Indemnification</h2>
          <p className="text-muted-foreground">
            You agree to defend, indemnify, and hold harmless Prescribly from claims arising out of your use of the services or violation of these Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">8. Governing Law</h2>
          <p className="text-muted-foreground">
            These Terms are governed by applicable U.S. federal and state laws without regard to conflict of law principles.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">9. Changes to the Terms</h2>
          <p className="text-muted-foreground">
            We may update these Terms periodically. Material changes will be posted with an updated effective date.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">10. Contact Us</h2>
          <p className="text-muted-foreground">Email: support@prescribly.com</p>
        </section>
      </main>
    </div>
  );
}
