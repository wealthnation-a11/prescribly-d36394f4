import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Target, CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClarifyingQuestionsScreenProps {
  symptoms: string[];
  onSubmit: (questions: any[], answers: Record<string, string>) => void;
  loading?: boolean;
}

export const ClarifyingQuestionsScreen: React.FC<ClarifyingQuestionsScreenProps> = ({
  symptoms,
  onSubmit,
  loading = false
}) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // Load clarifying questions based on symptoms
  useEffect(() => {
    const loadQuestions = async () => {
      setQuestionsLoading(true);
      try {
        // First, get related conditions for the symptoms
        const { data: conditionsData, error: conditionsError } = await supabase
          .from('conditions')
          .select('id, name')
          .limit(5);

        if (conditionsError) throw conditionsError;

        // Since clarifying_questions table doesn't exist, use hardcoded questions
        const questionsData = [
          {
            id: 'duration',
            question: 'How long have you been experiencing these symptoms?',
            condition_id: null
          },
          {
            id: 'severity',
            question: 'How would you rate the severity of your symptoms on a scale of 1-10?',
            condition_id: null
          },
          {
            id: 'onset',
            question: 'Did your symptoms start suddenly or gradually?',
            condition_id: null
          },
          {
            id: 'triggers',
            question: 'Have you noticed any triggers that make your symptoms worse?',
            condition_id: null
          },
          {
            id: 'relief',
            question: 'Have you tried anything that provides relief?',
            condition_id: null
          }
        ];

        // Use our predefined questions
        if (questionsData && questionsData.length > 0) {
          setQuestions(questionsData);
        }
      } catch (error) {
        console.error('Error loading questions:', error);
        toast.error('Failed to load clarifying questions');
        
        // Fallback to generic questions
        const genericQuestions = [
          {
            id: 'duration',
            question: 'How long have you been experiencing these symptoms?',
            condition_id: null
          },
          {
            id: 'severity',
            question: 'How would you rate the severity of your symptoms on a scale of 1-10?',
            condition_id: null
          },
          {
            id: 'onset',
            question: 'Did your symptoms start suddenly or gradually?',
            condition_id: null
          }
        ];
        setQuestions(genericQuestions);
      } finally {
        setQuestionsLoading(false);
      }
    };

    loadQuestions();
  }, [symptoms]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = () => {
    const unansweredQuestions = questions.filter(q => !answers[q.id]);
    
    if (unansweredQuestions.length > 0) {
      toast.error('Please answer all questions to continue.');
      return;
    }

    onSubmit(questions, answers);
  };

  const progress = (Object.keys(answers).length / questions.length) * 100;

  if (questionsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-lg text-muted-foreground">Loading personalized questions...</p>
        </div>
      </div>
    );
  }

  const getQuestionOptions = (questionId: string, question: string) => {
    const lowerQ = question.toLowerCase();
    
    if (lowerQ.includes('duration') || lowerQ.includes('how long')) {
      return ['Less than 1 day', '1-3 days', '4-7 days', '1-2 weeks', 'More than 2 weeks'];
    }
    
    if (lowerQ.includes('severity') || lowerQ.includes('scale')) {
      return ['1-2 (Mild)', '3-4 (Mild-Moderate)', '5-6 (Moderate)', '7-8 (Severe)', '9-10 (Very Severe)'];
    }
    
    if (lowerQ.includes('sudden') || lowerQ.includes('gradual') || lowerQ.includes('onset')) {
      return ['Suddenly (within minutes)', 'Gradually over hours', 'Gradually over days', 'Not sure'];
    }
    
    if (lowerQ.includes('trigger') || lowerQ.includes('worse')) {
      return ['Physical activity', 'Stress', 'Certain foods', 'Weather changes', 'No specific triggers', 'Not sure'];
    }
    
    if (lowerQ.includes('relief') || lowerQ.includes('better')) {
      return ['Rest', 'Medication', 'Heat/Cold therapy', 'Movement/Exercise', 'Nothing helps', 'Haven\'t tried anything'];
    }
    
    // Default yes/no options
    return ['Yes', 'No', 'Not sure'];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <Target className="h-16 w-16 text-primary mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-2">Additional Questions</h2>
        <p className="text-muted-foreground text-lg">
          Help us provide more accurate diagnosis by answering these questions
        </p>
      </motion.div>

      {/* Selected Symptoms Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Your symptoms:</p>
          <div className="flex flex-wrap gap-2">
            {symptoms.map((symptom) => (
              <Badge key={symptom} variant="secondary" className="bg-primary/10 text-primary">
                {symptom}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

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

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question, index) => {
          const options = getQuestionOptions(question.id, question.question);
          const isAnswered = answers[question.id];
          
          return (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`border-2 ${isAnswered ? 'border-green-200 bg-green-50/50' : 'border-muted'}`}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className={`rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold ${
                      isAnswered ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'
                    }`}>
                      {isAnswered ? <CheckCircle className="h-4 w-4" /> : index + 1}
                    </span>
                    Question {index + 1} of {questions.length}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                    <p className="text-lg font-medium">
                      {question.question}
                    </p>
                  </div>

                  <RadioGroup
                    value={answers[question.id] || ''}
                    onValueChange={(value) => handleAnswerChange(question.id, value)}
                    className="space-y-3"
                  >
                    {options.map((option, optionIndex) => (
                      <motion.div
                        key={option}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (index * 0.1) + (optionIndex * 0.05) }}
                        className="flex items-center space-x-3 p-3 rounded-lg border border-muted hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleAnswerChange(question.id, option)}
                      >
                        <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                        <Label 
                          htmlFor={`${question.id}-${option}`} 
                          className="flex-1 cursor-pointer text-sm"
                        >
                          {option}
                        </Label>
                      </motion.div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Action Button */}
      <div className="flex justify-center pt-6">
        <Button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length !== questions.length || loading}
          size="lg"
          className="px-12"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Get Diagnosis
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};