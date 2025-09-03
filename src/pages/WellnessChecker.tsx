import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageSEO } from '@/hooks/usePageSEO';
import EnhancedWellnessChecker from './EnhancedWellnessChecker';

const WellnessChecker = () => {
  const navigate = useNavigate();
  
  usePageSEO({
    title: 'Prescribly | Enhanced Wellness Checker - AI Doctor with 1,200+ Conditions',
    description: 'Advanced AI health diagnosis using 1,200+ medical conditions database. Bayesian analysis with 85-95% accuracy. Get instant symptoms analysis and treatment recommendations.'
  });

  // Redirect to enhanced version
  React.useEffect(() => {
    navigate('/enhanced-wellness-checker', { replace: true });
  }, [navigate]);

  return <EnhancedWellnessChecker />;
};

export default WellnessChecker;