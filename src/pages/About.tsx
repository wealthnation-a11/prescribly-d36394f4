import { usePageSEO } from "@/hooks/usePageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Globe, Sparkles, Handshake, Heart, Stethoscope } from "lucide-react";

export default function About() {
  usePageSEO({
    title: "About Prescribly | Our Mission is Your Wellbeing",
    description: "Learn why Prescribly was founded and our mission to make quality healthcare accessible, secure, and trusted for everyone.",
    canonicalPath: "/about",
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary/30 border-b border-border/50">
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">Our Mission is Your Wellbeing</h1>
          <p className="mt-4 text-muted-foreground max-w-3xl mx-auto">
            Prescribly connects patients with trusted doctors anytime, anywhere. We believe modern care should be
            accessible, secure, and powered by compassionate clinicians supported by smart technology.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-16">
        <section className="grid md:grid-cols-2 gap-8 items-start">
          <article className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Our Story</h2>
            <p className="text-muted-foreground">
              Prescribly was founded to remove barriers between people and quality healthcare. After seeing patients wait
              days for appointments—or avoid care entirely—we set out to build a platform that offers immediate access to
              licensed doctors, secure records, and seamless follow‑up.
            </p>
            <p className="text-muted-foreground">
              Our vision is a world where geography, schedules, or device constraints never limit care. We combine secure
              infrastructure with human‑centered design so every consultation feels personal, private, and effective.
            </p>
            <p className="text-muted-foreground">
              Our mission is to connect patients with trusted doctors—anytime, anywhere.
            </p>
          </article>
          <Card className="card-gradient border-0 medical-shadow">
            <CardHeader>
              <CardTitle>What Drives Us</CardTitle>
              <CardDescription>Purpose and responsibility</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>• Reduce time‑to‑care from days to minutes.</p>
              <p>• Protect patient privacy with strong security.</p>
              <p>• Empower clinicians with modern tools.</p>
            </CardContent>
          </Card>
        </section>

        {/* Holistic Approach Section */}
        <section>
          <Card className="card-gradient border-0 medical-shadow overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
              <CardTitle className="text-2xl text-center">Bridging Traditional & Modern Medicine</CardTitle>
              <CardDescription className="text-center">Honoring ancient wisdom while embracing scientific innovation</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    At Prescribly, we recognize that healing has many paths. Our platform uniquely integrates herbal and traditional medicine with conventional healthcare, offering you comprehensive treatment options tailored to your preferences and cultural background.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Our licensed practitioners are trained in both modern medical protocols and evidence-based herbal therapies from around the world, including Traditional Chinese Medicine, Ayurveda, Western herbalism, and African traditional medicine.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    This integrated approach ensures you receive safe, effective care that respects your personal healing philosophy while maintaining the highest standards of medical safety and efficacy.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
                    <Heart className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Natural Remedies</h4>
                      <p className="text-sm text-muted-foreground">Access authenticated herbal formulations from global healing traditions, sourced from certified suppliers with rigorous quality testing</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
                    <Stethoscope className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Integrated Care</h4>
                      <p className="text-sm text-muted-foreground">Seamless combination of conventional and herbal treatments when appropriate, ensuring optimal therapeutic outcomes</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50">
                    <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Quality Assured</h4>
                      <p className="text-sm text-muted-foreground">All herbal products undergo third-party testing for purity, potency, and safety before recommendation</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-6">Our Values</h2>
          <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-6">
            <Card className="card-gradient border-0">
              <CardContent className="p-6 text-center space-y-2">
                <Globe className="w-6 h-6 mx-auto text-primary" />
                <h3 className="font-semibold">Accessibility</h3>
                <p className="text-sm text-muted-foreground">Care without barriers, on any device.</p>
              </CardContent>
            </Card>
            <Card className="card-gradient border-0">
              <CardContent className="p-6 text-center space-y-2">
                <Shield className="w-6 h-6 mx-auto text-trust-blue" />
                <h3 className="font-semibold">Security</h3>
                <p className="text-sm text-muted-foreground">Protecting data with rigorous controls.</p>
              </CardContent>
            </Card>
            <Card className="card-gradient border-0">
              <CardContent className="p-6 text-center space-y-2">
                <Handshake className="w-6 h-6 mx-auto text-primary" />
                <h3 className="font-semibold">Trust</h3>
                <p className="text-sm text-muted-foreground">Verified clinicians, transparent care.</p>
              </CardContent>
            </Card>
            <Card className="card-gradient border-0">
              <CardContent className="p-6 text-center space-y-2">
                <Sparkles className="w-6 h-6 mx-auto text-primary" />
                <h3 className="font-semibold">Innovation</h3>
                <p className="text-sm text-muted-foreground">Smart tools that elevate outcomes.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
