import React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getCurrentUser, createUserProfile } from '../lib/supabase';

// Create the Auth Context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize the auth state on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get the current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        setSession(currentSession);
        
        if (currentSession?.user) {
          // Get user and profile data
          const fullUser = await getCurrentUser();
          setUser(fullUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      
      if (currentSession?.user) {
        // For sign_up and signed_in events, ensure the user record exists
        if (event === 'SIGNED_IN' || event === 'SIGNED_UP') {
          const fullUser = await getCurrentUser();
          setUser(fullUser);
        } else {
          setUser(currentSession.user);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    // Clean up the listener when the component unmounts
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Sign up function
  const signUp = async (email, password, userData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Register with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });
      
      if (signUpError) throw signUpError;
      
      if (!data?.user) {
        throw new Error('Registration failed - no user was created');
      }
      
      // Create user profile (this is a failsafe - the trigger should handle this,
      // but we'll do it manually as well to ensure it exists)
      await createUserProfile({
        ...data.user,
        email,
        user_metadata: userData
      });
      
      return data;
    } catch (err) {
      console.error('Error in signUp:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Sign in function
  const signIn = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) throw signInError;
      
      return data;
    } catch (err) {
      console.error('Error in signIn:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Sign out function
  const signOut = async () => {
    setError(null);
    
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (err) {
      console.error('Error in signOut:', err);
      setError(err);
      throw err;
    }
  };
  
  const value = {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 