import { Card, CardContent } from "@/components/ui/card";

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  avatar: string;
}

export const TestimonialCard = ({ quote, author, role, avatar }: TestimonialCardProps) => {
  return (
    <Card className="card-gradient border-0 medical-shadow p-6">
      <CardContent className="space-y-4">
        <div className="flex items-center gap-1 text-primary">
          {[...Array(5)].map((_, i) => (
            <span key={i}>⭐</span>
          ))}
        </div>
        <blockquote className="text-foreground italic">
          "{quote}"
        </blockquote>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg">{avatar}</span>
          </div>
          <div>
            <p className="font-semibold text-foreground">{author}</p>
            <p className="text-sm text-muted-foreground">{role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};