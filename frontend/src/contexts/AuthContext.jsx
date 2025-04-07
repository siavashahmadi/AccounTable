import React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, db, auth } from '../lib/supabase';

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

  // Initialize auth state and listen for changes
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { session: currentSession } = await auth.getSession();
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Create a minimal profile to ensure we always have something
          const minimalProfile = {
            id: currentSession.user.id,
            email: currentSession.user.email,
            first_name: currentSession.user.user_metadata?.first_name || '',
            last_name: currentSession.user.user_metadata?.last_name || '',
            is_minimal_profile: true
          };
          
          // Set minimal profile right away so user isn't blocked
          setUser(minimalProfile);
          
          // Try to get full profile but don't block on it
          try {
            const { data: profile } = await db.getCurrentUser();
            if (profile) {
              setUser(profile);
            }
          } catch (profileError) {
            console.error('Error fetching profile:', profileError);
            // Keep using minimal profile
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        
        try {
          if (currentSession?.user) {
            // Always set a minimal profile immediately
            const minimalProfile = {
              id: currentSession.user.id,
              email: currentSession.user.email,
              first_name: currentSession.user.user_metadata?.first_name || '',
              last_name: currentSession.user.user_metadata?.last_name || '',
              is_minimal_profile: true
            };
            setUser(minimalProfile);
            
            // Try to get full profile in background
            try {
              const { data: profile } = await db.getCurrentUser();
              if (profile) {
                setUser(profile);
              }
            } catch (profileError) {
              console.error('Error fetching profile on auth change:', profileError);
              // Keep using minimal profile
            }
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
        } finally {
          setLoading(false);
        }
      }
    );

    // Clean up on unmount
    return () => subscription?.unsubscribe();
  }, []);

  // Sign up function
  const signUp = async (userData) => {
    return await auth.signUp(userData);
  };
  
  // Sign in function
  const signIn = async (credentials) => {
    const result = await auth.signIn(credentials);
    
    // If sign-in was successful, handle it
    if (result.data?.session) {
      setSession(result.data.session);
      
      // Set user profile if available, even if minimal
      if (result.data?.profile) {
        setUser(result.data.profile);
      } else if (result.data?.user) {
        // Create a minimal profile from user data as a last resort
        const minimalProfile = {
          id: result.data.user.id,
          email: result.data.user.email,
          first_name: result.data.user.user_metadata?.first_name || '',
          last_name: result.data.user.user_metadata?.last_name || '',
          is_minimal_profile: true
        };
        setUser(minimalProfile);
      }
    }
    
    return result;
  };
  
  // Sign out function
  const signOut = async () => {
    try {
      const { error } = await auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };
  
  // Add a function to get current user that can be called from components
  const getCurrentUser = async () => {
    if (!session) {
      return { data: null, error: new Error('No active session') };
    }
    
    try {
      const { data, error } = await db.getCurrentUser();
      
      if (!error && data) {
        setUser(data);
      }
      
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  };
  
  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    getCurrentUser, // Add getCurrentUser to the context value
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 