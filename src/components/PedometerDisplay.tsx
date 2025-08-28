import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Footprints, Target, Zap } from "lucide-react";

interface PedometerDisplayProps {
  steps: number;
  goal: number;
  calories: number;
  distance: number;
}

export default function PedometerDisplay({ steps, goal, calories, distance }: PedometerDisplayProps) {
  const [animatedSteps, setAnimatedSteps] = useState(0);
  const progress = Math.min((steps / goal) * 100, 100);
  const circumference = 2 * Math.PI * 120; // radius of 120
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedSteps(steps);
    }, 100);
    return () => clearTimeout(timer);
  }, [steps]);

  return (
    <div className="relative flex flex-col items-center justify-center py-8">
      {/* Main Progress Circle */}
      <div className="relative w-64 h-64">
        <svg className="w-64 h-64 transform -rotate-90" viewBox="0 0 256 256">
          {/* Background Circle */}
          <circle
            cx="128"
            cy="128"
            r="120"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
            fill="none"
            opacity="0.3"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="128"
            cy="128"
            r="120"
            stroke="hsl(var(--primary))"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        
        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center"
          >
            <Footprints className="h-8 w-8 text-primary mx-auto mb-2" />
            <motion.div 
              className="text-4xl font-bold text-foreground"
              key={animatedSteps}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {animatedSteps.toLocaleString()}
            </motion.div>
            <div className="text-sm text-muted-foreground">
              / {goal.toLocaleString()} steps
            </div>
            <div className="text-lg font-semibold text-primary mt-1">
              {Math.round(progress)}%
            </div>
          </motion.div>
        </div>

        {/* Goal Indicator */}
        {progress >= 100 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute -top-2 -right-2"
          >
            <div className="bg-green-500 text-white rounded-full p-2">
              <Target className="h-6 w-6" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Stats Row */}
      <motion.div 
        className="grid grid-cols-3 gap-6 mt-6 w-full max-w-sm"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{steps}</div>
          <div className="text-xs text-muted-foreground">Steps Today</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{distance.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Distance (km)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{Math.round(calories)}</div>
          <div className="text-xs text-muted-foreground">Calories</div>
        </div>
      </motion.div>
    </div>
  );
}