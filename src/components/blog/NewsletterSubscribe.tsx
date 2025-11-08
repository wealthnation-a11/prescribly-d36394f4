import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail } from "lucide-react";

export default function NewsletterSubscribe() {
  const [email, setEmail] = useState("");

  const subscribeMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email });
      
      if (error) {
        if (error.code === '23505') {
          throw new Error("You're already subscribed to our newsletter!");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Successfully subscribed to our newsletter!");
      setEmail("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    subscribeMutation.mutate(email);
  };

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Subscribe to Our Newsletter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Get the latest health tips and articles delivered to your inbox.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
          />
          <Button type="submit" disabled={subscribeMutation.isPending}>
            {subscribeMutation.isPending ? "Subscribing..." : "Subscribe"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
