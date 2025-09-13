import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { 
  Target, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import Player from 'react-lottie-player';

// Import Lottie animation
import doctorConsultation from '@/assets/animations/doctor-consultation.json';

interface ClarifyingQuestion {
  id: string;
  question: string;
  type: 'select' | 'text' | 'scale';
  options?: string[];
}

interface ClarifyingQuestionsProps {
  questions: ClarifyingQuestion[];
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, answer: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const ClarifyingQuestions: React.FC<ClarifyingQuestionsProps> = ({
  questions,
  answers,
  onAnswerChange,
  onSubmit,
  onBack,
  isLoading = false,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const currentQuestion = questions[currentQuestionIndex];
  const allAnswered = questions.every(q => answers[q.id]);
  const progress = ((Object.keys(answers).length) / questions.length) * 100;

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const canGoNext = answers[currentQuestion?.id] && currentQuestionIndex < questions.length - 1;
  const canSubmit = allAnswered;

  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mb-4">
          <Player
            play
            loop
            animationData={doctorConsultation}
            style={{ height: '100px', width: '100px' }}
            className="mx-auto opacity-80"
          />
        </div>
        <h3 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          Help Us Understand Better
        </h3>
        <p className="text-muted-foreground">
          A few quick questions to provide more accurate diagnosis
        </p>
      </motion.div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="text-primary font-medium">
            {Object.keys(answers).length} of {questions.length} answered
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <motion.div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <motion.div
        key={currentQuestionIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                {currentQuestionIndex + 1}
              </span>
              Question {currentQuestionIndex + 1} of {questions.length}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Question */}
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <p className="text-lg font-medium">
                {currentQuestion.question}
              </p>
            </div>

            {/* Answer Input */}
            {currentQuestion.type === 'select' && (
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={(value) => onAnswerChange(currentQuestion.id, value)}
                className="space-y-3"
              >
                {currentQuestion.options?.map((option, index) => (
                  <motion.div
                    key={option}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center space-x-2 p-3 rounded-lg border border-muted hover:bg-muted/50 cursor-pointer"
                    onClick={() => onAnswerChange(currentQuestion.id, option)}
                  >
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </motion.div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion.type === 'text' && (
              <Textarea
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => onAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="Please describe in detail..."
                className="min-h-[100px] border-primary/20 focus:border-primary/50"
              />
            )}

            {currentQuestion.type === 'scale' && (
              <div className="space-y-4">
                <div className="px-4">
                  <Slider
                    value={[parseInt(answers[currentQuestion.id]) || 1]}
                    onValueChange={(value) => onAnswerChange(currentQuestion.id, value[0].toString())}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>1 (Mild)</span>
                  <span className="text-lg font-bold text-primary">
                    {answers[currentQuestion.id] || '1'}
                  </span>
                  <span>10 (Severe)</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Answered Questions Summary */}
      {Object.keys(answers).length > 0 && (
        <Card className="bg-muted/30 border-muted">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Answered Questions ({Object.keys(answers).length})
            </h4>
            <div className="space-y-2">
              {questions.map((question, index) => {
                const answer = answers[question.id];
                if (!answer) return null;
                
                return (
                  <div key={question.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate flex-1 mr-2">
                      Q{index + 1}: {question.question}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {answer.length > 20 ? `${answer.substring(0, 20)}...` : answer}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Symptoms
        </Button>

        {currentQuestionIndex < questions.length - 1 ? (
          <Button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id]}
            className="flex-1"
          >
            Next Question
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            disabled={!canSubmit || isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2"
                >
                  <Target className="h-4 w-4" />
                </motion.div>
                Analyzing...
              </>
            ) : (
              <>
                Complete Analysis
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};