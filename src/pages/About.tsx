import { Link } from "react-router-dom";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Globe, Sparkles, Handshake, Heart, Stethoscope, Pill, Building2, Activity, Video } from "lucide-react";

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

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-2">What's New on Prescribly</h2>
          <p className="text-muted-foreground mb-6 max-w-3xl">
            Prescribly is now a complete care network — doctors, hospitals and pharmacies working together in one app.
          </p>
          <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-6">
            <Card className="card-gradient border-0">
              <CardContent className="p-6 space-y-2">
                <Video className="w-6 h-6 text-primary" />
                <h3 className="font-semibold">Consult in chat, voice or video</h3>
                <p className="text-sm text-muted-foreground">
                  A guided symptom intake matches you with a verified doctor, then a secure 20-minute session — ₦3,500 per
                  consultation, or book one for later.
                </p>
              </CardContent>
            </Card>
            <Card className="card-gradient border-0">
              <CardContent className="p-6 space-y-2">
                <Pill className="w-6 h-6 text-primary" />
                <h3 className="font-semibold">Pharmacies on Prescribly</h3>
                <p className="text-sm text-muted-foreground">
                  Send your prescription to a nearby verified pharmacy, compare prices, chat with the pharmacist and track
                  delivery.
                </p>
              </CardContent>
            </Card>
            <Card className="card-gradient border-0">
              <CardContent className="p-6 space-y-2">
                <Building2 className="w-6 h-6 text-primary" />
                <h3 className="font-semibold">Hospitals & home visits</h3>
                <p className="text-sm text-muted-foreground">
                  Find clinics near you, check in with a secure code, or request a doctor to come to your home.
                </p>
              </CardContent>
            </Card>
            <Card className="card-gradient border-0">
              <CardContent className="p-6 space-y-2">
                <Heart className="w-6 h-6 text-primary" />
                <h3 className="font-semibold">Women's Health with Gift</h3>
                <p className="text-sm text-muted-foreground">
                  Cycle, ovulation and pregnancy tracking with a private PIN-locked space — and optional access for a
                  trusted partner.
                </p>
              </CardContent>
            </Card>
            <Card className="card-gradient border-0">
              <CardContent className="p-6 space-y-2">
                <Activity className="w-6 h-6 text-primary" />
                <h3 className="font-semibold">Daily wellness tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Sleep, water, steps, medication and meditation in one hub, with streaks, points and daily challenges.
                </p>
              </CardContent>
            </Card>
            <Card className="card-gradient border-0">
              <CardContent className="p-6 space-y-2">
                <Stethoscope className="w-6 h-6 text-primary" />
                <h3 className="font-semibold">Free to join as a partner</h3>
                <p className="text-sm text-muted-foreground">
                  Doctors, pharmacies and hospitals can register free and get verified by our team.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="medical" asChild>
                    <Link to="/pharmacy-portal">Register a Pharmacy</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/doctor-register">Join as a Doctor</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
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
