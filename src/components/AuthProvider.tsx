import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabase, resetSupabaseClient } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase, setSupabase] = useState<SupabaseClient>(getSupabase());
  const [state, setState] = useState<AuthState>({
    user: null,
    isAdmin: false,
    isLoading: true
  });

  useEffect(() => {
    const currentSupabase = supabase;
    
    const checkAdminStatus = async (user: User) => {
      try {
        console.log('Starting admin check...');
        console.log('User metadata:', user.app_metadata);
        
        // First check the user's metadata directly
        if (user.app_metadata?.is_admin === true) {
          console.log('Admin status found in user metadata');
          return true;
        }

        // Fallback to RPC call
        const { data: isAdmin, error } = await currentSupabase.rpc('is_admin');
        console.log('Admin check result:', { isAdmin, error, userId: user.id });
        
        if (error) throw error;
        return !!isAdmin;
      } catch (error) {
        console.error('Admin check failed:', error, 'for user:', user.id);
        return false;
      }
    };

    let isMounted = true;

    const initAuth = async () => {
      try {
        console.log('Starting session check...');
        const { data: { session }, error: sessionError } = await currentSupabase.auth.getSession();
        
        console.log('Session check result:', { session, sessionError });
        
        if (!isMounted) return;
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          const isAdmin = await checkAdminStatus(session.user);
          if (isMounted) {
            console.log('Setting initial state:', { 
              user: session.user,
              userId: session.user.id,
              isAdmin,
              isLoading: false 
            });
            setState({
              user: session.user,
              isAdmin,
              isLoading: false
            });
          }
        } else if (isMounted) {
          setState(s => ({ ...s, isLoading: false }));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setState(s => ({ ...s, isLoading: false }));
        }
      }
    };

    initAuth();

    const { data: { subscription } } = currentSupabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        if (!isMounted) return;
        
        try {
          if (session?.user) {
            const isAdmin = await checkAdminStatus(session.user);
            if (isMounted) {
              setState({
                user: session.user,
                isAdmin,
                isLoading: false
              });
            }
          } else if (isMounted) {
            setState({
              user: null,
              isAdmin: false,
              isLoading: false
            });
          }
        } catch (error) {
          console.error('Auth state change error:', error);
          if (isMounted) {
            setState(s => ({
              ...s,
              isLoading: false
            }));
          }
        }
      }
    );

    return () => {
      console.log('Cleaning up auth provider');
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase]);

  // ... rest of the component



  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in for:', email);
    resetSupabaseClient(); // Reset client before sign in
    setSupabase(getSupabase());
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    console.log('Sign in result:', error ? 'Error: ' + error.message : 'Success');
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    console.log('Attempting sign up for:', email);
    resetSupabaseClient(); // Reset client before sign up
    setSupabase(getSupabase());
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
        data: { role: 'user' }
      }
    });
    console.log('Sign up result:', error ? 'Error: ' + error.message : 'Success');
    if (error) throw error;
  };

  const signOut = async () => {
    console.log('Attempting sign out...');
    const { error } = await supabase.auth.signOut();
    if (!error) {
      resetSupabaseClient(); // Reset client after successful sign out
      setSupabase(getSupabase());
    }
    console.log('Sign out result:', error ? 'Error: ' + error.message : 'Success');
    if (error) throw error;
  };

  const renderContent = () => {
    console.log('Rendering content, isLoading:', state.isLoading);
    if (state.isLoading) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading...</span>
          </div>
        </div>
      );
    }

    return (
      <AuthContext.Provider
        value={{
          ...state,
          signIn,
          signUp,
          signOut
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  };

  return renderContent();
}

export default AuthProvider;