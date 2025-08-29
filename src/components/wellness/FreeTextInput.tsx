import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Mic, Send, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';

interface FreeTextInputProps {
  onSymptomsFound: (symptomIds: string[]) => void;
  onNoSymptomsFound: () => void;
  onBack: () => void;
}

export const FreeTextInput: React.FC<FreeTextInputProps> = ({
  onSymptomsFound,
  onNoSymptomsFound,
  onBack
}) => {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;

    setLoading(true);

    try {
      // Call parse-symptoms function
      const { data, error } = await supabase.functions.invoke('parse-symptoms', {
        body: {
          text: text.trim(),
          locale: 'en' // TODO: Get from language context
        }
      });

      if (error) throw error;

      const { symptoms } = data;

      if (symptoms && symptoms.length > 0) {
        // Extract symptom IDs
        const symptomIds = symptoms.map((s: any) => s.id);
        onSymptomsFound(symptomIds);
        
        toast.success(`Found ${symptoms.length} matching symptoms`);
      } else {
        // No symptoms found, redirect to guided questions
        toast.info('No specific symptoms detected. Let\'s ask some questions to help you better.');
        onNoSymptomsFound();
      }

      // Log analytics
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('analytics_events').insert({
          user_id: user.id,
          event_type: 'free_text_submitted',
          payload: {
            text_length: text.length,
            symptoms_found: symptoms?.length || 0
          }
        });
      }

    } catch (error) {
      console.error('Error parsing symptoms:', error);
      toast.error('Unable to process your symptoms. Let\'s try guided questions instead.');
      onNoSymptomsFound();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Describe Your Symptoms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Tell us about your symptoms in your own words. Be as detailed as possible.
            </p>
            <div className="space-y-4">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="For example: 'I have a bad headache and feel nauseous. Started this morning and getting worse...'"
                className="min-h-[120px] resize-none"
                disabled={loading}
              />
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {text.length}/500 characters
                </span>
                <span>
                  Press Ctrl+Enter to submit
                </span>
              </div>
            </div>
          </div>

          {/* Example prompts */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Need help getting started? Try these examples:</p>
            <div className="grid gap-2">
              {[
                "I have a headache and feel tired",
                "My stomach hurts and I feel nauseous",
                "I have a cough and sore throat"
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => setText(example)}
                  className="text-left p-2 rounded border border-muted hover:border-primary hover:bg-primary/5 transition-colors text-sm"
                  disabled={loading}
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={onBack} 
          className="flex-1"
          disabled={loading}
        >
          Back
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!text.trim() || loading}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Analyze Symptoms
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};