import { Button } from "@/components/ui/button";

export type AdaptiveQuestion = {
  id: string;
  text: string;
  options: Array<{ value: string; label: string }>;
};

export const AdaptiveQuestionView = ({
  question,
  onAnswer,
  disabled,
}: {
  question: AdaptiveQuestion;
  onAnswer: (value: string) => void;
  disabled?: boolean;
}) => {
  if (!question) return null;
  return (
    <div className="space-y-3">
      <h2 className="text-base font-medium">{question.text}</h2>
      <div className="grid grid-cols-2 gap-2">
        {question.options.map((opt) => (
          <Button
            key={opt.value}
            variant="outline"
            className="justify-center"
            onClick={() => onAnswer(opt.value)}
            disabled={disabled}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
