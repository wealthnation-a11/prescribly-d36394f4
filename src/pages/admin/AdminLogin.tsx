import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Stethoscope, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, signUp } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  // If user is already logged in as admin, redirect to dashboard
  useEffect(() => {
    if (!roleLoading && isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, roleLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Admin login attempt for:', email);
      
      // First try to sign in
      let result = await signIn(email, password);
      
      // If user doesn't exist, try to sign up (for demo@prescribly.com)
      if (result.error && result.error.message && result.error.message.includes('Invalid login credentials') && email === 'demo@prescribly.com') {
        console.log('User not found, attempting to create admin account');
        const signUpResult = await signUp(email, password);
        if (signUpResult.error) {
          console.error('Sign up failed:', signUpResult.error);
          setError(`Failed to create admin account: ${signUpResult.error.message || signUpResult.error}`);
          return;
        }
        // After successful signup, try to sign in again
        result = await signIn(email, password);
        if (result.error) {
          console.error('Sign in after signup failed:', result.error);
          setError(`Login failed after account creation: ${result.error.message || result.error}`);
          return;
        }
      } else if (result.error) {
        console.error('Sign in failed:', result.error);
        setError(`Login failed: ${result.error.message || result.error}`);
        return;
      }

      console.log('Login successful');
      // Success - let the auth state change handle the redirect
      toast({
        title: "Welcome, Admin!",
        description: "Successfully logged into admin dashboard.",
      });

    } catch (err: any) {
      console.error('Unexpected error during login:', err);
      setError(`An unexpected error occurred: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Admin Login</CardTitle>
          <p className="text-slate-600 mt-2">Access the Prescribly admin dashboard</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <Lock className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-600">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="demo@prescribly.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Not an admin?{' '}
              <a href="/" className="text-primary hover:underline">
                Go to main site
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};