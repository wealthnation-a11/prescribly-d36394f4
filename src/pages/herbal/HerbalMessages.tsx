import { HerbalPractitionerLayout } from '@/components/HerbalPractitionerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

export default function HerbalMessages() {
  return (
    <HerbalPractitionerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">Communicate with your patients</p>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Messaging Coming Soon</h3>
            <p className="text-muted-foreground">
              Patient messaging functionality will be available soon
            </p>
          </CardContent>
        </Card>
      </div>
    </HerbalPractitionerLayout>
  );
}
