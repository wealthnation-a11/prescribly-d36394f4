import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DoctorRatingModalProps {
  open: boolean;
  onClose: () => void;
  doctorId: string;
  doctorName: string;
  appointmentId: string;
}

const DoctorRatingModal = ({ open, onClose, doctorId, doctorName, appointmentId }: DoctorRatingModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0 || !user?.id) return;
    setSubmitting(true);
    try {
      // Insert review
      await supabase.from('doctor_reviews').insert({
        doctor_id: doctorId,
        patient_id: user.id,
        appointment_id: appointmentId,
        rating,
        comment: comment || null,
      });

      // Update doctor's average rating
      const { data: reviews } = await supabase
        .from('doctor_reviews')
        .select('rating')
        .eq('doctor_id', doctorId);

      if (reviews && reviews.length > 0) {
        const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        await supabase
          .from('doctors')
          .update({ rating: Math.round(avg * 10) / 10, total_reviews: reviews.length })
          .eq('user_id', doctorId);
      }

      toast({ title: 'Thank you!', description: 'Your rating has been submitted.' });
      onClose();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to submit rating.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rate Dr. {doctorName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                onClick={() => setRating(i)}
                onMouseEnter={() => setHoveredRating(i)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    i <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {rating === 0 ? 'Tap a star to rate' : `${rating} out of 5 stars`}
          </p>
          <Textarea
            placeholder="Leave a comment (optional)..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
          />
          <Button onClick={handleSubmit} disabled={rating === 0 || submitting} className="w-full">
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DoctorRatingModal;
