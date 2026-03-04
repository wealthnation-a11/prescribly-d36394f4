import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface RegistrationCodeDisplayProps {
  code: string;
  facilityName: string;
  expiresAt: string;
  onDone: () => void;
}

export const RegistrationCodeDisplay = ({ code, facilityName, expiresAt, onDone }: RegistrationCodeDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Registration code copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="max-w-md mx-auto text-center">
      <CardHeader>
        <CardTitle className="text-lg">Your Registration Code</CardTitle>
        <p className="text-sm text-muted-foreground">for {facilityName}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG value={code} size={180} />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-3xl font-mono font-bold tracking-[0.3em] text-primary">{code}</p>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <CheckCircle className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? 'Copied' : 'Copy Code'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Present this code at the facility. Expires: {new Date(expiresAt).toLocaleDateString()}
        </p>
        <Button onClick={onDone} className="w-full">Done</Button>
      </CardContent>
    </Card>
  );
};
