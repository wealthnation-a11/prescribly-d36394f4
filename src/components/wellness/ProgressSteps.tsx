import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
  className?: string;
}

export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  steps,
  currentStep,
  onStepClick,
  className
}) => {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between relative">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isClickable = onStepClick && step.id <= currentStep;
          const Icon = step.icon;
          
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center flex-1 relative"
            >
              {/* Step Circle */}
              <button
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all duration-300 border-2",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50",
                  {
                    'bg-primary text-primary-foreground border-primary': isCompleted,
                    'bg-primary/20 text-primary border-primary animate-pulse': isActive,
                    'bg-muted text-muted-foreground border-muted-foreground/20': !isActive && !isCompleted,
                    'cursor-pointer hover:scale-105': isClickable,
                    'cursor-not-allowed opacity-50': !isClickable
                  }
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <Icon className="h-6 w-6" />
                )}
              </button>

              {/* Step Content */}
              <div className="text-center max-w-24">
                <div className={cn(
                  "text-sm font-medium mb-1 transition-colors",
                  {
                    'text-primary': isActive,
                    'text-foreground': isCompleted,
                    'text-muted-foreground': !isActive && !isCompleted
                  }
                )}>
                  {step.title}
                </div>
                <div className="text-xs text-muted-foreground hidden sm:block">
                  {step.description}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute top-6 left-1/2 w-full h-0.5 -z-10">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      isCompleted ? 'bg-primary' : 'bg-muted'
                    )}
                    style={{ 
                      width: isCompleted ? '100%' : '0%',
                      marginLeft: '24px' 
                    }}
                  />
                  <div className="absolute top-0 w-full h-full bg-muted" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-6 w-full bg-muted rounded-full h-2">
        <motion.div
          className="bg-primary h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ 
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` 
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      {/* Step Counter */}
      <div className="text-center mt-4">
        <span className="text-sm text-muted-foreground">
          Step {currentStep} of {steps.length}
        </span>
      </div>
    </div>
  );
};