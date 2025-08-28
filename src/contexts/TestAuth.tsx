import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface TestAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  useTestAccount: (email: string) => Promise<void>;
}

const TestAuthContext = createContext<TestAuthContextType | undefined>(undefined);

export const useTestAuth = () => {
  const context = useContext(TestAuthContext);
  if (context === undefined) {
    throw new Error('useTestAuth must be used within a TestAuthProvider');
  }
  return context;
};

const TEST_ACCOUNTS = [
  { email: 'test1@boom.com', password: 'boom1234', displayName: 'Tester One' },
  { email: 'test2@boom.com', password: 'boom1234', displayName: 'Tester Two' }
];

export const TestAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Console log for debug mode
    console.log('🔧 Phase 2 Testing - Auth Provider Initialized');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔧 Auth Event:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    console.log('🔧 Test SignUp:', email);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔧 Test SignIn:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    console.log('🔧 Test SignOut');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const useTestAccount = async (email: string) => {
    const testAccount = TEST_ACCOUNTS.find(acc => acc.email === email);
    if (!testAccount) return;
    
    console.log('🔧 Using Test Account:', email);
    await signIn(testAccount.email, testAccount.password);
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    useTestAccount,
  };

  return <TestAuthContext.Provider value={value}>{children}</TestAuthContext.Provider>;
};