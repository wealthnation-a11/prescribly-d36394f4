import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Star, 
  Sparkles,
  Droplets,
  Footprints,
  Flame,
  Heart,
  Brain,
  Moon,
  Medal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AchievementUnlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: {
    name: string;
    description: string;
    type: string;
    points: number;
  } | null;
}

const BADGE_ICONS: { [key: string]: React.ElementType } = {
  'hydration': Droplets,
  'steps': Footprints,
  'streak': Flame,
  'challenge': Trophy,
  'meditation': Brain,
  'sleep': Moon,
  'health': Heart,
  'default': Medal
};

const CONFETTI_COLORS = ['#0077b6', '#48cae4', '#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7'];

const Confetti = () => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    delay: number;
    duration: number;
    color: string;
    rotation: number;
  }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * 360
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-3 h-3"
          style={{
            left: `${particle.x}%`,
            top: '-10px',
            backgroundColor: particle.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0%',
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{
            y: '100vh',
            opacity: [1, 1, 0],
            rotate: particle.rotation + 720,
            x: Math.sin(particle.id) * 50
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: 'easeOut'
          }}
        />
      ))}
    </div>
  );
};

export const AchievementUnlockedModal = ({
  isOpen,
  onClose,
  achievement
}: AchievementUnlockedModalProps) => {
  if (!achievement) return null;

  const IconComponent = BADGE_ICONS[achievement.type.toLowerCase()] || BADGE_ICONS.default;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 overflow-hidden">
        <AnimatePresence>
          {isOpen && (
            <>
              <Confetti />
              
              <motion.div
                className="text-center py-6"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", duration: 0.6 }}
              >
                {/* Stars Background */}
                <motion.div
                  className="absolute top-4 left-1/2 -translate-x-1/2"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <Sparkles className="w-8 h-8 text-yellow-500" />
                </motion.div>

                {/* Badge Icon */}
                <motion.div
                  className="relative mx-auto mb-6"
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  <motion.div
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 flex items-center justify-center mx-auto shadow-lg"
                    animate={{
                      boxShadow: [
                        '0 0 20px rgba(255, 215, 0, 0.5)',
                        '0 0 40px rgba(255, 215, 0, 0.8)',
                        '0 0 20px rgba(255, 215, 0, 0.5)'
                      ]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <IconComponent className="w-12 h-12 text-white" />
                  </motion.div>

                  {/* Rotating Ring */}
                  <motion.div
                    className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-4 border-dashed border-yellow-400/50"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  />
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-semibold text-yellow-600 uppercase tracking-wider">
                      Achievement Unlocked!
                    </span>
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {achievement.name}
                  </h2>
                  
                  <p className="text-muted-foreground mb-4">
                    {achievement.description}
                  </p>

                  <motion.div
                    className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                  >
                    <Trophy className="w-5 h-5 text-primary" />
                    <span className="font-bold text-primary">+{achievement.points} Points</span>
                  </motion.div>
                </motion.div>

                {/* Close Button */}
                <motion.div
                  className="mt-6"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <Button onClick={onClose} className="w-full">
                    Awesome! 🎉
                  </Button>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
