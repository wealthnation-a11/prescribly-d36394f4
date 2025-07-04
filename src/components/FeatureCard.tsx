import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  details: string;
  delay?: string;
}

export const FeatureCard = ({ icon: Icon, title, description, details, delay = "" }: FeatureCardProps) => {
  return (
    <Card className={`hover-lift card-gradient border-0 medical-shadow group cursor-pointer fade-in-up ${delay}`}>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-xl font-bold text-foreground">{title}</CardTitle>
        <CardDescription className="text-muted-foreground">{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {details}
        </p>
      </CardContent>
    </Card>
  );
};