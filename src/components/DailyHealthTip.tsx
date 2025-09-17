import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DailyTip {
  tip: string;
}

export const DailyHealthTip = () => {
  const [dailyTip, setDailyTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyTip();
  }, []);

  const fetchDailyTip = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Query daily_tips joined with health_tips for current date
      const { data, error } = await supabase
        .from('daily_tips')
        .select(`
          health_tips (
            tip
          )
        `)
        .eq('date', today)
        .single();

      if (error) {
        console.error('Error fetching daily tip:', error);
        return;
      }

      if (data && data.health_tips) {
        setDailyTip((data.health_tips as DailyTip).tip);
      }
    } catch (error) {
      console.error('Error fetching daily tip:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading today's health tip...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dailyTip) {
    return null;
  }

  return (
    <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="rounded-full bg-primary/20 p-2 flex-shrink-0">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground mb-1">💡 Daily Health Tip</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{dailyTip}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};