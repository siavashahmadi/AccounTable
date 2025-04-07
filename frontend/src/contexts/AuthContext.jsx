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
      // Set a timeout to ensure the loading state gets reset
      const timeoutId = setTimeout(() => {
        setLoading(false);
      }, 5000);
      
      try {
        const { session: currentSession } = await auth.getSession();
        setSession(currentSession);
        
        if (currentSession?.user) {
          const { data: profile, error } = await db.getCurrentUser();
          if (!error && profile) {
            setUser(profile);
          }
        }
      } catch (error) {
        // Handle initialization errors silently
      } finally {
        clearTimeout(timeoutId); // Clear the timeout since we're done
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // Set a timeout to ensure the loading state gets reset
        const timeoutId = setTimeout(() => {
          setLoading(false);
        }, 5000);
        
        try {
          setSession(currentSession);
          
          if (currentSession?.user) {
            // Create a minimal profile early as a fallback
            const minimalProfile = {
              id: currentSession.user.id,
              email: currentSession.user.email,
              first_name: currentSession.user.user_metadata?.first_name || '',
              last_name: currentSession.user.user_metadata?.last_name || '',
              is_minimal_profile: true
            };
            
            // Set minimal profile right away so we have something
            setUser(minimalProfile);
            
            // Try to get a full profile
            const { data: profile, error } = await db.getCurrentUser();
            
            if (!error && profile) {
              // Only update if we got an actual profile
              setUser(profile);
            }
          } else {
            setUser(null);
          }
        } catch (error) {
          // Handle auth state change errors silently
          // Keep minimal profile if we set it, otherwise clear user
          if (!user && currentSession?.user) {
            const minimalProfile = {
              id: currentSession.user.id,
              email: currentSession.user.email,
              first_name: currentSession.user.user_metadata?.first_name || '',
              last_name: currentSession.user.user_metadata?.last_name || '',
              is_minimal_profile: true
            };
            setUser(minimalProfile);
          } else if (!currentSession) {
            setUser(null);
          }
        } finally {
          clearTimeout(timeoutId); // Clear the timeout since we're done
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
  
  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 