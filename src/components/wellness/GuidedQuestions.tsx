import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Compass, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';

interface GuidedQuestionsProps {
  onComplete: (data: {
    age?: number;
    gender?: string;
    symptoms: string[];
  }) => void;
  onBack: () => void;
}

interface Question {
  id: string;
  type: 'age' | 'gender' | 'text' | 'select';
  question: string;
  options?: string[];
}

const questions: Question[] = [
  {
    id: 'age',
    type: 'age',
    question: 'What is your age?'
  },
  {
    id: 'gender',
    type: 'gender',
    question: 'What is your gender?',
    options: ['Male', 'Female', 'Other', 'Prefer not to say']
  },
  {
    id: 'main_symptom',
    type: 'text',
    question: 'What is your main symptom or concern?'
  },
  {
    id: 'duration',
    type: 'select',
    question: 'How long have you been experiencing this?',
    options: ['Less than 1 day', '1-3 days', '3-7 days', '1-2 weeks', 'More than 2 weeks']
  },
  {
    id: 'severity',
    type: 'select',
    question: 'How would you rate the severity?',
    options: ['Mild', 'Moderate', 'Severe', 'Very severe']
  }
];

export const GuidedQuestions: React.FC<GuidedQuestionsProps> = ({
  onComplete,
  onBack
}) => {
  const { t } = useLanguage();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [age, setAge] = useState([25]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Complete the guided questions
      const symptoms: string[] = [];
      if (answers.main_symptom) {
        symptoms.push(answers.main_symptom);
      }
      if (answers.duration) {
        symptoms.push(`Duration: ${answers.duration}`);
      }
      if (answers.severity) {
        symptoms.push(`Severity: ${answers.severity}`);
      }

      onComplete({
        age: answers.age || age[0],
        gender: answers.gender,
        symptoms
      });
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      onBack();
    }
  };

  const canProceed = () => {
    const questionId = currentQuestion.id;
    if (questionId === 'age') {
      return answers.age || age[0];
    }
    return answers[questionId] !== undefined && answers[questionId] !== '';
  };

  const renderQuestionInput = () => {
    const questionId = currentQuestion.id;

    switch (currentQuestion.type) {
      case 'age':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-2xl font-bold text-primary">
                {answers.age || age[0]} years old
              </span>
            </div>
            <Slider
              value={answers.age ? [answers.age] : age}
              onValueChange={(value) => {
                setAge(value);
                handleAnswer(questionId, value[0]);
              }}
              max={100}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1</span>
              <span>100</span>
            </div>
          </div>
        );

      case 'gender':
        return (
          <RadioGroup
            value={answers[questionId] || ''}
            onValueChange={(value) => handleAnswer(questionId, value)}
          >
            {currentQuestion.options?.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={option} />
                <Label htmlFor={option} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'text':
        return (
          <Input
            value={answers[questionId] || ''}
            onChange={(e) => handleAnswer(questionId, e.target.value)}
            placeholder="Describe your symptoms..."
            className="w-full"
          />
        );

      case 'select':
        return (
          <RadioGroup
            value={answers[questionId] || ''}
            onValueChange={(value) => handleAnswer(questionId, value)}
          >
            {currentQuestion.options?.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={option} />
                <Label htmlFor={option} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Step {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-muted-foreground">
            {Math.round(progress)}% complete
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <motion.div
        key={currentQuestionIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              Guided Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                {currentQuestion.question}
              </h3>
              {renderQuestionInput()}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={handlePrevious}
          className="flex-1"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {currentQuestionIndex === 0 ? 'Back' : 'Previous'}
        </Button>
        <Button 
          onClick={handleNext}
          disabled={!canProceed()}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          {currentQuestionIndex === questions.length - 1 ? 'Complete' : 'Next'}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
};