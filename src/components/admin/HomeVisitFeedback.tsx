import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, User, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface Review {
  id: string;
  patient_id: string;
  doctor_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  patient_name?: string;
  doctor_name?: string;
}

const HomeVisitFeedback = () => {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['admin-home-visit-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_visit_reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get profiles for patients and doctors
      const userIds = [...new Set([
        ...(data || []).map(r => r.patient_id),
        ...(data || []).map(r => r.doctor_id),
      ])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      return (data || []).map(review => {
        const patient = profiles?.find(p => p.user_id === review.patient_id);
        const doctor = profiles?.find(p => p.user_id === review.doctor_id);
        return {
          ...review,
          patient_name: patient ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() : 'Unknown Patient',
          doctor_name: doctor ? `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() : 'Unknown Doctor',
        };
      }) as Review[];
    },
  });

  const averageRating = reviews?.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{reviews?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Total Reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <p className="text-2xl font-bold">{averageRating}</p>
            </div>
            <p className="text-xs text-muted-foreground">Avg Rating</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {reviews?.filter(r => r.rating >= 4).length || 0}
            </p>
            <p className="text-xs text-muted-foreground">Positive (4-5★)</p>
          </CardContent>
        </Card>
      </div>

      {/* Review List */}
      {!reviews?.length ? (
        <p className="text-center text-muted-foreground py-8">No home visit reviews yet</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{review.patient_name}</span>
                      <span className="text-muted-foreground text-xs">→</span>
                      <span className="text-sm">Dr. {review.doctor_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    Home Visit
                  </Badge>
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground mt-2">"{review.comment}"</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(review.created_at), 'MMM dd, yyyy • h:mm a')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeVisitFeedback;
