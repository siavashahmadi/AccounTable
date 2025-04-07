import React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
  const [authError, setAuthError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Debug function to log auth state safely
  const logAuthState = (prefix, state = {}) => {
    console.log(`${prefix}:`, {
      sessionExists: !!state.session,
      userExists: !!state.user,
      loading: state.loading,
      error: state.error?.message,
      timestamp: new Date().toISOString(),
      ...state
    });
  };

  // Single function to load user profile
  const loadUserProfile = async (userId) => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return profile;
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    }
  };
  
  // Function to create a new user profile if needed
  const createUserProfile = async (sessionUser) => {
    try {
      const { data: newProfile, error } = await supabase
        .from('users')
        .insert({
          id: sessionUser.id,
          email: sessionUser.email,
          first_name: sessionUser.user_metadata?.first_name || '',
          last_name: sessionUser.user_metadata?.last_name || '',
          time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return newProfile;
    } catch (error) {
      console.error('Error creating profile:', error);
      return null;
    }
  };

  // Initialize auth state and set up listener
  useEffect(() => {
    let mounted = true;
    
    const handleAuthStateChange = async (event, currentSession) => {
      if (!mounted) return;
      
      try {
        setSession(currentSession);
        
        if (!currentSession) {
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        
        const sessionUser = currentSession.user;
        
        // First try to load existing profile
        let userProfile = await loadUserProfile(sessionUser.id);
        
        // If no profile exists and this is a new sign in, create one
        if (!userProfile && event === 'SIGNED_IN') {
          userProfile = await createUserProfile(sessionUser);
        }
        
        // Set the user state with profile or basic info
        if (userProfile) {
          setUser(userProfile);
        } else {
          setUser({
            id: sessionUser.id,
            email: sessionUser.email,
            first_name: sessionUser.user_metadata?.first_name || '',
            last_name: sessionUser.user_metadata?.last_name || '',
            is_basic_profile: true
          });
        }
        
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error handling auth state change:', error);
        setAuthError(error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange('INITIAL_SESSION', session);
    });
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
    
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);
  
  // Sign up function
  const signUp = async (userData) => {
    try {
      const { email, password, first_name, last_name, time_zone, invitation_token } = userData;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            first_name, 
            last_name, 
            time_zone,
            invitation_token
          }
        }
      });
      
      if (error) throw error;
      
      return {
        data: {
          ...data,
          emailConfirmationRequired: Boolean(data?.user && !data?.session)
        },
        error: null
      };
    } catch (error) {
      return { data: null, error };
    }
  };
  
  // Sign in function
  const signIn = async (credentials) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };
  
  // Sign out function
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };
  
  // Update profile function
  const updateProfile = async (updates) => {
    try {
      if (!user?.id) throw new Error('No user found');
      
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      setUser(data);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const value = {
    user,
    session,
    loading,
    authError,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 