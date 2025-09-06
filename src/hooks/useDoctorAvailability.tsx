import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TimeSlot {
  start: string;
  end: string;
  isAvailable: boolean;
}

export interface DoctorAvailability {
  doctorId: string;
  weekday: string;
  timeSlots: TimeSlot[];
}

export const useDoctorAvailability = (doctorId?: string) => {
  const [availability, setAvailability] = useState<DoctorAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!doctorId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('doctor_availability')
          .select('*')
          .eq('doctor_id', doctorId)
          .eq('is_available', true)
          .order('weekday', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) throw error;

        // Group by weekday
        const groupedAvailability = (data || []).reduce((acc: any, slot: any) => {
          const weekday = slot.weekday;
          if (!acc[weekday]) {
            acc[weekday] = {
              doctorId: slot.doctor_id,
              weekday: weekday,
              timeSlots: []
            };
          }
          
          acc[weekday].timeSlots.push({
            start: slot.start_time,
            end: slot.end_time,
            isAvailable: true
          });
          
          return acc;
        }, {});

        setAvailability(Object.values(groupedAvailability) as DoctorAvailability[]);
      } catch (error) {
        console.error('Error fetching doctor availability:', error);
        setAvailability([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [doctorId]);

  const isTimeSlotAvailable = (weekday: string, time: string) => {
    const dayAvailability = availability.find(av => av.weekday.toLowerCase() === weekday.toLowerCase());
    if (!dayAvailability) return false;

    return dayAvailability.timeSlots.some(slot => {
      const slotStart = new Date(`1970-01-01T${slot.start}:00`);
      const slotEnd = new Date(`1970-01-01T${slot.end}:00`);
      const requestedTime = new Date(`1970-01-01T${time}:00`);
      
      return requestedTime >= slotStart && requestedTime < slotEnd;
    });
  };

  const getAvailableTimeSlotsForDay = (weekday: string) => {
    const dayAvailability = availability.find(av => av.weekday.toLowerCase() === weekday.toLowerCase());
    return dayAvailability?.timeSlots || [];
  };

  return {
    availability,
    loading,
    isTimeSlotAvailable,
    getAvailableTimeSlotsForDay
  };
};