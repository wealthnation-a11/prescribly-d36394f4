import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Sparkles, X } from 'lucide-react';

interface SubscriptionRenewalCelebrationProps {
  isVisible: boolean;
  onClose: () => void;
  newExpirationDate: string;
  plan: string;
}

export const SubscriptionRenewalCelebration = ({
  isVisible,
  onClose,
  newExpirationDate,
  plan
}: SubscriptionRenewalCelebrationProps) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          {/* Confetti particles */}
          {showConfetti && (
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
              {[...Array(50)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    opacity: 1,
                    x: '50vw',
                    y: '50vh',
                    scale: 0
                  }}
                  animate={{
                    opacity: [1, 1, 0],
                    x: `${Math.random() * 100}vw`,
                    y: `${Math.random() * 100}vh`,
                    scale: [0, 1, 0.5],
                    rotate: Math.random() * 720
                  }}
                  transition={{
                    duration: 2 + Math.random(),
                    ease: "easeOut"
                  }}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'][Math.floor(Math.random() * 6)]
                  }}
                />
              ))}
            </div>
          )}

          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="w-full max-w-md border-2 border-primary/20 shadow-2xl bg-card">
              <CardContent className="p-8 text-center relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>

                {/* Success Animation */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2, duration: 0.6 }}
                  className="relative mx-auto w-24 h-24 mb-6"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 rounded-full bg-primary/20"
                  />
                  <div className="relative flex items-center justify-center w-full h-full rounded-full bg-gradient-to-br from-primary to-primary/80">
                    <CheckCircle className="w-12 h-12 text-primary-foreground" />
                  </div>
                  
                  {/* Sparkles */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-2 -right-2"
                  >
                    <Sparkles className="w-6 h-6 text-yellow-500" />
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Subscription Renewed!
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Thank you for continuing with us
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-muted/50 rounded-lg p-4 mb-6"
                >
                  <p className="text-sm text-muted-foreground mb-1">
                    {plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    Valid until {formatDate(newExpirationDate)}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <Button onClick={onClose} className="w-full">
                    Continue to Dashboard
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
