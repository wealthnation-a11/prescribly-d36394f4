import { useEffect, useState } from "react";

interface StatCounterProps {
  endValue: number;
  label: string;
  prefix?: string;
  suffix?: string;
  delay?: number;
}

export const StatCounter = ({ endValue, label, prefix = "", suffix = "", delay = 0 }: StatCounterProps) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasStarted(true);
      let start = 0;
      const increment = endValue / 50;
      const timer = setInterval(() => {
        start += increment;
        if (start >= endValue) {
          setCount(endValue);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 30);

      return () => clearInterval(timer);
    }, delay);

    return () => clearTimeout(timer);
  }, [endValue, delay]);

  return (
    <div className={`text-center fade-in-up ${hasStarted ? 'animate-[countUp_0.8s_ease-out]' : ''}`}>
      <div className="text-4xl font-bold text-primary mb-2">
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-muted-foreground font-medium">{label}</div>
    </div>
  );
};