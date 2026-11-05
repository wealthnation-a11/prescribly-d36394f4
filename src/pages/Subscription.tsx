import { Logo } from "@/components/Logo";
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

const Subscription = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3"><Logo size="md" withLink /></div>
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">PrescriblyCare is Free</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Registration and access to PrescriblyCare are completely free. You only pay
            when you book a service:
          </p>
          <div className="rounded-lg border bg-muted/30 p-4 text-left space-y-2">
            <div className="flex justify-between"><span>Doctor Consultation</span><span className="font-semibold">₦3,500</span></div>
            <div className="flex justify-between"><span>Lab Result Interpretation</span><span className="font-semibold">₦4,500</span></div>
          </div>
          <Button className="w-full" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Subscription;
