import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Compass, ChevronRight, ChevronLeft, Brain, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';

interface EnhancedGuidedQuestionsProps {
  onComplete: (data: {
    age?: number;
    gender?: string;
    symptoms: string[];
    clinicalData: Record<string, any>;
  }) => void;
  onBack: () => void;
}

interface Question {
  id: string;
  type: 'age' | 'gender' | 'text' | 'select' | 'multiselect' | 'boolean' | 'scale';
  question: string;
  options?: string[];
  condition?: string; // Show question only if this condition is met
  followUp?: string; // Previous question ID this depends on
}

const baseQuestions: Question[] = [
  {
    id: 'age',
    type: 'age',
    question: 'What is your age?'
  },
  {
    id: 'gender',
    type: 'gender',
    question: 'What is your biological sex?',
    options: ['Male', 'Female', 'Other', 'Prefer not to say']
  },
  {
    id: 'main_concern',
    type: 'text',
    question: 'What is your main health concern today?'
  },
  {
    id: 'duration',
    type: 'select',
    question: 'How long have you been experiencing your main symptom?',
    options: ['Less than 1 hour', '1-6 hours', '6-24 hours', '1-3 days', '3-7 days', '1-2 weeks', 'More than 2 weeks']
  },
  {
    id: 'severity',
    type: 'scale',
    question: 'On a scale of 1-10, how severe are your symptoms? (1=barely noticeable, 10=worst imaginable)'
  },
  {
    id: 'body_location',
    type: 'select',
    question: 'Where in your body are you experiencing symptoms?',
    options: ['Head/Face', 'Neck', 'Chest', 'Upper back', 'Lower back', 'Abdomen/Stomach', 'Arms/Hands', 'Legs/Feet', 'Whole body', 'Multiple areas']
  },
  {
    id: 'pain_character',
    type: 'select',
    question: 'If you have pain, how would you describe it?',
    options: ['Sharp/Stabbing', 'Dull/Aching', 'Throbbing', 'Burning', 'Cramping', 'Pressure/Squeezing', 'No pain']
  }
];

// Branching questions based on symptoms
const branchingQuestions: Record<string, Question[]> = {
  chest_pain: [
    {
      id: 'chest_radiation',
      type: 'multiselect',
      question: 'Does the chest pain spread to any other areas?',
      options: ['Left arm', 'Right arm', 'Both arms', 'Jaw', 'Neck', 'Back', 'Stomach', 'No radiation']
    },
    {
      id: 'chest_triggers',
      type: 'multiselect',
      question: 'What makes the chest pain worse?',
      options: ['Physical activity', 'Deep breathing', 'Eating', 'Stress', 'Lying down', 'Cold weather', 'Nothing specific']
    },
    {
      id: 'associated_chest_symptoms',
      type: 'multiselect',
      question: 'Do you have any of these symptoms with your chest pain?',
      options: ['Shortness of breath', 'Sweating', 'Nausea', 'Dizziness', 'Palpitations', 'Cough', 'None']
    }
  ],
  headache: [
    {
      id: 'headache_location',
      type: 'select',
      question: 'Where is your headache located?',
      options: ['One side of head', 'Both sides', 'Forehead', 'Back of head', 'Top of head', 'Around eyes', 'Whole head']
    },
    {
      id: 'headache_character',
      type: 'select',
      question: 'How would you describe your headache?',
      options: ['Throbbing/Pulsating', 'Steady ache', 'Sharp/Stabbing', 'Pressure/Tight band', 'Burning']
    },
    {
      id: 'headache_triggers',
      type: 'multiselect',
      question: 'Do any of these trigger or worsen your headache?',
      options: ['Bright lights', 'Loud sounds', 'Strong smells', 'Stress', 'Certain foods', 'Weather changes', 'Screen time', 'None']
    },
    {
      id: 'associated_head_symptoms',
      type: 'multiselect',
      question: 'Do you experience any of these with your headache?',
      options: ['Nausea/Vomiting', 'Visual changes', 'Sensitivity to light', 'Sensitivity to sound', 'Neck stiffness', 'Fever', 'None']
    }
  ],
  fever: [
    {
      id: 'fever_pattern',
      type: 'select',
      question: 'How has your fever behaved?',
      options: ['Constant high fever', 'Comes and goes', 'Getting progressively worse', 'Getting better', 'Only at night']
    },
    {
      id: 'fever_symptoms',
      type: 'multiselect',
      question: 'What other symptoms do you have with fever?',
      options: ['Chills/Shivering', 'Night sweats', 'Body aches', 'Fatigue', 'Loss of appetite', 'Sore throat', 'Cough', 'None']
    }
  ],
  abdominal_pain: [
    {
      id: 'abdominal_location',
      type: 'select',
      question: 'Where exactly is your abdominal pain?',
      options: ['Upper right', 'Upper left', 'Upper center', 'Lower right', 'Lower left', 'Lower center', 'Around navel', 'Whole abdomen']
    },
    {
      id: 'abdominal_character',
      type: 'select',
      question: 'How would you describe the abdominal pain?',
      options: ['Sharp/Stabbing', 'Cramping', 'Burning', 'Dull ache', 'Bloating/Gas', 'Twisting/Colicky']
    },
    {
      id: 'associated_gi_symptoms',
      type: 'multiselect',
      question: 'Do you have any of these symptoms?',
      options: ['Nausea', 'Vomiting', 'Diarrhea', 'Constipation', 'Loss of appetite', 'Bloating', 'Gas', 'None']
    }
  ]
};

export const EnhancedGuidedQuestions: React.FC<EnhancedGuidedQuestionsProps> = ({
  onComplete,
  onBack
}) => {
  const { t } = useLanguage();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [age, setAge] = useState([25]);
  const [severity, setSeverity] = useState([5]);
  const [questions, setQuestions] = useState(baseQuestions);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Detect symptoms and add branching questions
  const addBranchingQuestions = (mainConcern: string) => {
    const concern = mainConcern.toLowerCase();
    const newQuestions = [...baseQuestions];
    
    // Detect symptom type and add relevant questions
    if (concern.includes('chest') || concern.includes('heart')) {
      newQuestions.push(...branchingQuestions.chest_pain);
    }
    if (concern.includes('head') || concern.includes('migraine')) {
      newQuestions.push(...branchingQuestions.headache);
    }
    if (concern.includes('fever') || concern.includes('temperature')) {
      newQuestions.push(...branchingQuestions.fever);
    }
    if (concern.includes('stomach') || concern.includes('abdomen') || concern.includes('belly')) {
      newQuestions.push(...branchingQuestions.abdominal_pain);
    }
    
    // Add general risk factor questions
    newQuestions.push({
      id: 'risk_factors',
      type: 'multiselect',
      question: 'Do any of these apply to you?',
      options: ['Recent travel', 'Chronic medical conditions', 'Taking medications', 'Smoker', 'Pregnant', 'Recent injury', 'Stress', 'None']
    });

    setQuestions(newQuestions);
  };

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));

    // Trigger branching questions when main concern is answered
    if (questionId === 'main_concern' && answer) {
      addBranchingQuestions(answer);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Complete the guided questions
      const symptoms: string[] = [];
      const clinicalData: Record<string, any> = {};
      
      // Process all answers into symptoms and clinical data
      Object.entries(answers).forEach(([key, value]) => {
        if (value && value !== 'None' && value !== 'No pain') {
          if (Array.isArray(value)) {
            symptoms.push(...value.filter(v => v !== 'None'));
          } else {
            symptoms.push(`${key}: ${value}`);
          }
          clinicalData[key] = value;
        }
      });

      onComplete({
        age: answers.age || age[0],
        gender: answers.gender,
        symptoms,
        clinicalData
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
    if (questionId === 'severity') {
      return answers.severity || severity[0];
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
              <span className="text-3xl font-bold text-[hsl(205,100%,36%)]">
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

      case 'scale':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-3xl font-bold text-[hsl(205,100%,36%)]">
                {answers.severity || severity[0]}/10
              </span>
              <p className="text-sm text-muted-foreground mt-1">
                {(answers.severity || severity[0]) <= 3 ? 'Mild' : 
                 (answers.severity || severity[0]) <= 6 ? 'Moderate' : 
                 (answers.severity || severity[0]) <= 8 ? 'Severe' : 'Very Severe'}
              </p>
            </div>
            <Slider
              value={answers.severity ? [answers.severity] : severity}
              onValueChange={(value) => {
                setSeverity(value);
                handleAnswer(questionId, value[0]);
              }}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1 - Mild</span>
              <span>10 - Severe</span>
            </div>
          </div>
        );

      case 'gender':
      case 'select':
        return (
          <RadioGroup
            value={answers[questionId] || ''}
            onValueChange={(value) => handleAnswer(questionId, value)}
            className="space-y-3"
          >
            {currentQuestion.options?.map(option => (
              <div key={option} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                <RadioGroupItem value={option} id={option} />
                <Label htmlFor={option} className="cursor-pointer flex-1">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'multiselect':
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map(option => (
              <div key={option} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                <Checkbox
                  id={option}
                  checked={answers[questionId]?.includes(option) || false}
                  onCheckedChange={(checked) => {
                    const current = answers[questionId] || [];
                    if (checked) {
                      handleAnswer(questionId, [...current, option]);
                    } else {
                      handleAnswer(questionId, current.filter((item: string) => item !== option));
                    }
                  }}
                />
                <Label htmlFor={option} className="cursor-pointer flex-1">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'text':
        return (
          <Input
            value={answers[questionId] || ''}
            onChange={(e) => handleAnswer(questionId, e.target.value)}
            placeholder="Please describe in detail..."
            className="w-full text-base p-4"
          />
        );

      case 'boolean':
        return (
          <RadioGroup
            value={answers[questionId] || ''}
            onValueChange={(value) => handleAnswer(questionId, value === 'yes')}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="yes" />
              <Label htmlFor="yes" className="cursor-pointer">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="no" />
              <Label htmlFor="no" className="cursor-pointer">No</Label>
            </div>
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
          <span className="text-muted-foreground flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Step {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-[hsl(205,100%,36%)] font-medium">
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
        <Card className="border-[hsl(205,100%,36%)]/20">
          <CardHeader className="bg-gradient-to-r from-[hsl(205,100%,36%)]/5 to-[hsl(199,89%,64%)]/5">
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-[hsl(205,100%,36%)]" />
              Clinical Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div>
              <h3 className="text-xl font-semibold mb-6 text-[hsl(205,100%,36%)]">
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
          className="flex-1 border-[hsl(205,100%,36%)]/30 hover:bg-[hsl(205,100%,36%)]/5"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {currentQuestionIndex === 0 ? 'Back' : 'Previous'}
        </Button>
        <Button 
          onClick={handleNext}
          disabled={!canProceed()}
          className="flex-1 bg-[hsl(205,100%,36%)] hover:bg-[hsl(205,100%,36%)]/90"
        >
          {currentQuestionIndex === questions.length - 1 ? 'Complete Assessment' : 'Next'}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
};