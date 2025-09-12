import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Activity, 
  TrendingUp,
  UserCheck
} from "lucide-react";

interface ValidationData {
  passed: boolean;
  confidence: {
    highest: number;
    average: number;
    threshold: number;
  };
  recommendedAction: string;
  details?: any;
}

interface ValidationIndicatorProps {
  validation: ValidationData;
  className?: string;
}

export const ValidationIndicator = ({ validation, className = "" }: ValidationIndicatorProps) => {
  const getActionInfo = (action: string) => {
    switch (action) {
      case 'proceed_with_ai_recommendation':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle2,
          title: 'High Confidence',
          message: 'AI diagnosis meets high confidence threshold. Recommendations can be reviewed.',
          severity: 'success'
        };
      case 'proceed_with_doctor_review':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: UserCheck,
          title: 'Doctor Review Required',
          message: 'AI diagnosis meets minimum threshold. Doctor review recommended before proceeding.',
          severity: 'info'
        };
      case 'consult_doctor_directly':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: AlertTriangle,
          title: 'Low Confidence',
          message: 'AI confidence below threshold. Please consult a doctor directly for proper evaluation.',
          severity: 'warning'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Activity,
          title: 'Unknown Action',
          message: 'Unable to determine recommended action.',
          severity: 'neutral'
        };
    }
  };

  const actionInfo = getActionInfo(validation.recommendedAction);
  const IconComponent = actionInfo.icon;
  
  const confidencePercentage = Math.round(validation.confidence.highest * 100);
  const thresholdPercentage = Math.round(validation.confidence.threshold * 100);

  return (
    <Card className={`border-2 ${actionInfo.color.includes('green') ? 'border-green-200' : 
      actionInfo.color.includes('blue') ? 'border-blue-200' : 
      actionInfo.color.includes('orange') ? 'border-orange-200' : 'border-gray-200'} ${className}`}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconComponent className="h-5 w-5" />
              <span className="font-semibold">{actionInfo.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={validation.passed ? 'default' : 'destructive'}
                className="flex items-center gap-1"
              >
                {validation.passed ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {validation.passed ? 'Validated' : 'Below Threshold'}
              </Badge>
            </div>
          </div>

          {/* Confidence Metrics */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Highest Confidence</span>
                <span className="text-sm font-bold">{confidencePercentage}%</span>
              </div>
              <div className="relative">
                <Progress 
                  value={confidencePercentage} 
                  className="h-3"
                />
                {/* Threshold indicator */}
                <div 
                  className="absolute top-0 h-3 w-0.5 bg-red-500 opacity-75"
                  style={{ left: `${thresholdPercentage}%` }}
                >
                  <div className="absolute -top-1 -left-2 text-xs text-red-600 font-bold">
                    {thresholdPercentage}%
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span>Threshold: {thresholdPercentage}%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Average:</span>
                <span className="ml-2 font-medium">{Math.round(validation.confidence.average * 100)}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Threshold:</span>
                <span className="ml-2 font-medium">{thresholdPercentage}%</span>
              </div>
            </div>
          </div>

          {/* Action Message */}
          <Alert className={`${actionInfo.color} border`}>
            <IconComponent className="h-4 w-4" />
            <AlertDescription className="font-medium">
              {actionInfo.message}
            </AlertDescription>
          </Alert>

          {/* Additional Details */}
          {validation.details && (
            <div className="text-xs text-muted-foreground bg-slate-50 p-3 rounded">
              <div className="font-medium mb-1">Validation Details:</div>
              <div className="space-y-1">
                {validation.details.total_conditions && (
                  <div>Conditions analyzed: {validation.details.total_conditions}</div>
                )}
                {validation.details.confidence_range && (
                  <div>
                    Confidence range: {Math.round(validation.details.confidence_range.min * 100)}% - {Math.round(validation.details.confidence_range.max * 100)}%
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};