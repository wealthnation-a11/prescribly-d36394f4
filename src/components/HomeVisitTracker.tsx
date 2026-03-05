import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Clock, MapPin, CheckCircle, Truck, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const statusSteps = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle },
  { key: 'in_transit', label: 'On the Way', icon: Truck },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
];

const HomeVisitTracker = () => {
  const { user } = useAuth();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['patient-home-visits', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('home_visit_requests')
        .select('*')
        .eq('patient_id', user.id)
        .in('status', ['pending', 'accepted', 'in_transit'])
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;

      const withDoctors = await Promise.all(
        data.map(async (req) => {
          const { data: doctor } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', req.doctor_id)
            .single();
          return { ...req, doctor };
        })
      );
      return withDoctors;
    },
    enabled: !!user?.id,
  });

  if (isLoading) return null;
  if (requests.length === 0) return null;

  const getStepIndex = (status: string) => {
    const idx = statusSteps.findIndex(s => s.key === status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Home className="w-5 h-5 text-primary" />
        Active Home Visits
      </h2>
      {requests.map((req) => {
        const currentStep = getStepIndex(req.status || 'pending');
        return (
          <Card key={req.id} className="shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    Dr. {req.doctor?.first_name} {req.doctor?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {req.address}
                  </p>
                </div>
                <Badge className={
                  req.status === 'in_transit' ? 'bg-purple-100 text-purple-800' :
                  req.status === 'accepted' ? 'bg-green-100 text-green-800' :
                  'bg-orange-100 text-orange-800'
                }>
                  {req.status === 'in_transit' ? 'On the Way' : req.status || 'pending'}
                </Badge>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center gap-1">
                {statusSteps.map((step, i) => {
                  const isActive = i <= currentStep;
                  const isCurrent = i === currentStep;
                  return (
                    <div key={step.key} className="flex items-center flex-1">
                      <div className={`flex flex-col items-center flex-1 ${isActive ? 'text-primary' : 'text-muted-foreground/40'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                          isCurrent ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' :
                          isActive ? 'bg-primary/20 text-primary' : 'bg-muted'
                        }`}>
                          {isCurrent && req.status !== 'completed' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <step.icon className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-[10px] mt-1 text-center">{step.label}</span>
                      </div>
                      {i < statusSteps.length - 1 && (
                        <div className={`h-0.5 flex-1 mx-1 ${i < currentStep ? 'bg-primary' : 'bg-muted'}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground">
                Requested {req.created_at ? format(new Date(req.created_at), 'PPP') : 'N/A'}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default HomeVisitTracker;
