import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: any | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signUpWithOTP: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  resendOTP: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Fetch profile data when user logs in
        if (session?.user && event === 'SIGNED_IN') {
          fetchUserProfile(session.user.id);
        } else if (!session?.user) {
          setUserProfile(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Fetch profile for existing session
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    if (userProfile?.user_id === userId) return; // Already cached
    
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, role, first_name, last_name, email, is_legacy')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.debug('Auth: signIn attempted');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.debug('Auth: signIn completed');
      return { error };
    } catch (err) {
      console.error('Sign in error:', err);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      console.debug('Auth: signUp attempted');
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: userData,
        },
      });
      
      console.debug('Auth: signUp completed');
      
      // Handle specific error cases
      if (error) {
        if (error.message?.includes('User already registered')) {
          return { error: { ...error, message: 'An account with this email already exists. Please try logging in instead.' } };
        }
        if (error.message?.includes('email')) {
          return { error: { ...error, message: 'Please enter a valid email address.' } };
        }
      }
      
      return { error };
    } catch (err) {
      console.error('Sign up error:', err);
      return { error: err };
    }
  };

  const signUpWithOTP = async (email: string, password: string, userData?: any) => {
    try {
      console.debug('Auth: signUpWithOTP attempted');
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            ...userData,
            password, // Store password temporarily for after OTP verification
          },
        },
      });
      
      console.debug('Auth: signUpWithOTP completed');
      return { error };
    } catch (err) {
      console.error('Sign up with OTP error:', err);
      return { error: err };
    }
  };

  const resendOTP = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
      });
      return { error };
    } catch (err) {
      console.error('Resend OTP error:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    userProfile,
    loading,
    profileLoading,
    signIn,
    signUp,
    signUpWithOTP,
    resendOTP,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};