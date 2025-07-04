import { useState, useEffect } from "react";
import { Check, X } from "lucide-react";

interface PasswordValidatorProps {
  password: string;
  confirmPassword: string;
  onValidationChange: (isValid: boolean) => void;
}

interface PasswordRule {
  text: string;
  isValid: boolean;
}

export const PasswordValidator = ({ password, confirmPassword, onValidationChange }: PasswordValidatorProps) => {
  const [rules, setRules] = useState<PasswordRule[]>([
    { text: "At least 8 characters long", isValid: false },
    { text: "Contains uppercase letter (A-Z)", isValid: false },
    { text: "Contains lowercase letter (a-z)", isValid: false },
    { text: "Contains a number (0-9)", isValid: false },
    { text: "Contains a symbol (!@#$%^&*)", isValid: false },
  ]);
  
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  useEffect(() => {
    const newRules = [
      { text: "At least 8 characters long", isValid: password.length >= 8 },
      { text: "Contains uppercase letter (A-Z)", isValid: /[A-Z]/.test(password) },
      { text: "Contains lowercase letter (a-z)", isValid: /[a-z]/.test(password) },
      { text: "Contains a number (0-9)", isValid: /\d/.test(password) },
      { text: "Contains a symbol (!@#$%^&*)", isValid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];
    
    setRules(newRules);
    
    const allRulesValid = newRules.every(rule => rule.isValid);
    const passwordsMatchValid = password === confirmPassword && confirmPassword.length > 0;
    
    setPasswordsMatch(passwordsMatchValid || confirmPassword.length === 0);
    onValidationChange(allRulesValid && passwordsMatchValid);
  }, [password, confirmPassword, onValidationChange]);

  return (
    <div className="space-y-3">
      {/* Password Requirements */}
      <div className="bg-accent/50 p-4 rounded-lg border border-accent">
        <h4 className="font-medium text-sm mb-3">Password Requirements:</h4>
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div key={index} className="flex items-center space-x-2">
              {rule.isValid ? (
                <Check className="w-4 h-4 text-success-green" />
              ) : (
                <X className="w-4 h-4 text-muted-foreground" />
              )}
              <span className={`text-sm ${
                rule.isValid ? 'text-success-green' : 'text-muted-foreground'
              }`}>
                {rule.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Password Match Validation */}
      {confirmPassword.length > 0 && (
        <div className="flex items-center space-x-2">
          {passwordsMatch ? (
            <>
              <Check className="w-4 h-4 text-success-green" />
              <span className="text-sm text-success-green">Passwords match</span>
            </>
          ) : (
            <>
              <X className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">Passwords do not match</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};