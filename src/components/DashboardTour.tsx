import { useEffect, useState } from 'react';
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from 'react-joyride';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DashboardTourProps {
  run: boolean;
  onComplete: () => void;
  steps: Step[];
  userRole?: 'patient' | 'doctor' | 'admin';
}

export const DashboardTour = ({ run, onComplete, steps, userRole = 'patient' }: DashboardTourProps) => {
  const { user } = useAuth();
  const [tourRun, setTourRun] = useState(false);

  useEffect(() => {
    setTourRun(run);
  }, [run]);

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setTourRun(false);
      
      // Mark tour as completed in database
      if (user?.id) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              dashboard_tour_completed: true,
              onboarding_completed: true 
            })
            .eq('user_id', user.id);

          if (error) throw error;
          
          toast.success('Tour completed! You can always access help from the sidebar.');
        } catch (error) {
          console.error('Error updating tour status:', error);
        }
      }
      
      onComplete();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={tourRun}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          backgroundColor: 'hsl(var(--background))',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          arrowColor: 'hsl(var(--background))',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: '8px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
};

// Predefined tour steps for different roles
export const getUserDashboardSteps = (): Step[] => [
  {
    target: '[data-tour="stats-overview"]',
    content: 'Here you can see your health metrics at a glance - appointments, prescriptions, and more.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="quick-actions"]',
    content: 'Quick access to our main features: Health Diagnostic, AI Health Companion, and more!',
    placement: 'bottom',
  },
  {
    target: '[data-tour="appointments"]',
    content: 'View and manage your upcoming appointments with doctors.',
    placement: 'top',
  },
  {
    target: '[data-tour="health-tip"]',
    content: 'Get daily personalized health tips to improve your wellness.',
    placement: 'top',
  },
  {
    target: '[data-tour="sidebar"]',
    content: 'Use the sidebar to navigate between different sections of your dashboard.',
    placement: 'right',
  },
  {
    target: '[data-tour="notifications"]',
    content: 'Click here to view your notifications and stay updated.',
    placement: 'bottom',
  },
];

export const getDoctorDashboardSteps = (): Step[] => [
  {
    target: '[data-tour="earnings"]',
    content: 'Track your earnings and financial performance.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="appointments"]',
    content: 'Manage your patient appointments and schedule.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="patients"]',
    content: 'View and manage your patient list.',
    placement: 'top',
  },
  {
    target: '[data-tour="availability"]',
    content: 'Set your availability so patients can book appointments.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar"]',
    content: 'Navigate through different sections using the sidebar.',
    placement: 'right',
  },
];

export const getAdminDashboardSteps = (): Step[] => [
  {
    target: '[data-tour="stats"]',
    content: 'Monitor platform statistics including users, doctors, and appointments.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="tabs"]',
    content: 'Switch between different management sections using these tabs.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="analytics"]',
    content: 'View detailed analytics about platform usage and performance.',
    placement: 'top',
  },
  {
    target: '[data-tour="users"]',
    content: 'Manage all platform users from this section.',
    placement: 'top',
  },
];
