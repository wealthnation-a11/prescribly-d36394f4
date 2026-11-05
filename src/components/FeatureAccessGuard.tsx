interface FeatureAccessGuardProps {
  children: React.ReactNode;
  featureName: string;
  requiredSubscription?: boolean;
}

/**
 * PrescriblyCare has no platform subscription. All dashboard features are free;
 * patients only pay per service (e.g. ₦3,500 consultation, ₦4,500 lab scan),
 * enforced inside those flows.
 */
export const FeatureAccessGuard = ({ children }: FeatureAccessGuardProps) => {
  return <>{children}</>;
};
