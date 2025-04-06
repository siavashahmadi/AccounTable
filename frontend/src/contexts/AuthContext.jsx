import { createContext, useContext, useState, useEffect } from 'react';
import { auth as supabaseAuth } from '../services/supabase';

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
        const { session: currentSession, error: sessionError } = await supabaseAuth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        setSession(currentSession);
        setUser(currentSession?.user || null);
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: authListener } = supabaseAuth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    // Clean up the listener when the component unmounts
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Sign up function
  const signUp = async (email, password, userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabaseAuth.signUp({ 
        email, 
        password, 
        ...userData 
      });
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error signing up:', err);
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
      const { data, error } = await supabaseAuth.signIn({ email, password });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error signing in:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabaseAuth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Define the value object to be provided to consumers
  const value = {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 