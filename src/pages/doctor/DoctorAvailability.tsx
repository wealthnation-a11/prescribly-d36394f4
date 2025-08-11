import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Calendar, CheckCircle, Clock, Plus, Trash2 } from "lucide-react";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type Weekday = (typeof WEEKDAYS)[number];

type TimeRange = {
  start: string; // HH:mm
  end: string;   // HH:mm
};

export const DoctorAvailability = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<Record<Weekday, TimeRange[]>>(() => {
    return WEEKDAYS.reduce((acc, d) => ({ ...acc, [d]: [] }), {} as Record<Weekday, TimeRange[]>);
  });

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos";
    } catch {
      return "Africa/Lagos";
    }
  }, []);

  // Load existing availability
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("doctor_availability")
        .select("weekday,start_time,end_time")
        .eq("doctor_id", user.id)
        .order("weekday", { ascending: true });

      if (error) {
        console.error(error);
        toast({ title: "Failed to load availability", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      const next: Record<Weekday, TimeRange[]> = WEEKDAYS.reduce(
        (acc, d) => ({ ...acc, [d]: [] }),
        {} as Record<Weekday, TimeRange[]>
      );

      data?.forEach((row: any) => {
        const day = (row.weekday as Weekday) || "Monday";
        const start = (row.start_time as string)?.slice(0, 5) || "09:00";
        const end = (row.end_time as string)?.slice(0, 5) || "17:00";
        if (WEEKDAYS.includes(day)) next[day as Weekday].push({ start, end });
      });

      setAvailability(next);
      setLoading(false);
    };
    load();
  }, [user, toast]);

  const addRange = (day: Weekday) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: [...prev[day], { start: "09:00", end: "17:00" }],
    }));
  };

  const removeRange = (day: Weekday, idx: number) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== idx),
    }));
  };

  const updateRange = (day: Weekday, idx: number, field: keyof TimeRange, value: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: prev[day].map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    }));
  };

  const handleSave = async () => {
    if (!user) {
      toast({ title: "You must be logged in" });
      return;
    }

    setSaving(true);
    // Simple strategy: delete existing then insert current
    const { error: delErr } = await supabase
      .from("doctor_availability")
      .delete()
      .eq("doctor_id", user.id);

    if (delErr) {
      setSaving(false);
      toast({ title: "Save failed", description: delErr.message, variant: "destructive" });
      return;
    }

    const rows = WEEKDAYS.flatMap((day) =>
      availability[day].map((r) => ({
        doctor_id: user.id,
        weekday: day,
        start_time: r.start,
        end_time: r.end,
        is_available: true,
        timezone,
      }))
    );

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("doctor_availability").insert(rows);
      if (insErr) {
        setSaving(false);
        toast({ title: "Save failed", description: insErr.message, variant: "destructive" });
        return;
      }
    }

    setSaving(false);
    toast({ title: "Availability updated successfully" });
  };

  if (!user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Card className="max-w-xl w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-slate-700">Please log in to manage your availability.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Availability</h1>
        <p className="text-slate-600">Set your weekly availability</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-blue-600" />
            Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {WEEKDAYS.map((day) => (
              <AccordionItem key={day} value={day}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className="font-medium">{day}</span>
                    <span className="text-xs text-slate-500">{availability[day].length} time range(s)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {availability[day].map((range, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] items-end gap-3">
                        <div>
                          <Label className="text-sm text-slate-600">Start Time</Label>
                          <Input
                            type="time"
                            value={range.start}
                            onChange={(e) => updateRange(day, idx, "start", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-slate-600">End Time</Label>
                          <Input
                            type="time"
                            value={range.end}
                            onChange={(e) => updateRange(day, idx, "end", e.target.value)}
                          />
                        </div>
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => removeRange(day, idx)}
                          className="md:mb-0"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Remove
                        </Button>
                      </div>
                    ))}

                    <Button variant="secondary" type="button" onClick={() => addRange(day)}>
                      <Plus className="w-4 h-4 mr-2" /> Add Time Range
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle className="w-4 h-4" />
              <span>Timezone: {timezone}</span>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Availability"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!loading &&
        Object.values(availability).every((arr) => arr.length === 0) && (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3 animate-pulse" />
              <p className="text-slate-600">You have not set any availability yet. Add time ranges above.</p>
            </CardContent>
          </Card>
        )}
    </div>
  );
};

export default DoctorAvailability;
