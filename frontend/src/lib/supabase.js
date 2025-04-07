import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Real-time subscriptions setup
export const setupRealtimeSubscriptions = (userId) => {
  // Subscribe to messages
  const messagesSubscription = supabase
    .channel('messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        console.log('New message received:', payload)
        // Handle new message (implement your message handler)
      }
    )
    .subscribe()

  // Subscribe to partnership updates
  const partnershipsSubscription = supabase
    .channel('partnerships')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'partnerships',
        filter: `or(user1_id.eq.${userId},user2_id.eq.${userId})`,
      },
      (payload) => {
        console.log('Partnership update:', payload)
        // Handle partnership update (implement your handler)
      }
    )
    .subscribe()

  // Subscribe to goal updates
  const goalsSubscription = supabase
    .channel('goals')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'goals',
        filter: `owner_id=eq.${userId}`,
      },
      (payload) => {
        console.log('Goal update:', payload)
        // Handle goal update (implement your handler)
      }
    )
    .subscribe()

  // Return cleanup function
  return () => {
    messagesSubscription.unsubscribe()
    partnershipsSubscription.unsubscribe()
    goalsSubscription.unsubscribe()
  }
}

// Helper functions for common Supabase operations
export const auth = {
  signUp: async ({ email, password, ...userData }) => {
    try {
      // Create the auth user with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });
      
      if (error) throw error;
      
      // If signup succeeded but email confirmation is required
      if (data?.user && !data?.session) {
        return { 
          data: { 
            user: data.user,
            session: null,
            emailConfirmationRequired: true 
          }, 
          error: null 
        };
      }
      
      // If signup succeeded and no email confirmation is required
      if (data?.user && data?.session) {
        try {
          // Create a basic profile in our users table
          const { error: insertError, data: insertData } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              first_name: userData.first_name || '',
              last_name: userData.last_name || '',
              time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            })
            .select()
            .single();
          
          if (insertError) throw insertError;
          
          return { data, error: null };
        } catch (dbError) {
          throw dbError;
        }
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  signIn: async ({ email, password }) => {
    // Create a timeout promise to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Sign in timed out after 10 seconds'));
      }, 10000);
    });
    
    try {
      // Use Promise.race to either sign in or timeout
      const authResult = await Promise.race([
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        timeoutPromise
      ]);
      
      const { data, error } = authResult;
      
      if (error) throw error;
      
      // If we have a user but no session, something went wrong
      if (data?.user && !data?.session) {
        throw new Error('Login successful but no session created');
      }
      
      // Create minimal profile immediately to prevent login failures
      if (data?.user) {
        const minimalProfile = {
          id: data.user.id,
          email: data.user.email,
          first_name: data.user.user_metadata?.first_name || '',
          last_name: data.user.user_metadata?.last_name || '',
          is_minimal_profile: true
        };
        
        // Try to fetch actual profile but don't wait for it
        try {
          // No Promise.race here - let it run in the background without blocking
          const profilePromise = supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();
          
          // Set a manual timeout for this background fetch
          setTimeout(() => {}, 2000);
          
          return { data: { ...data, profile: minimalProfile }, error: null };
        } catch (profileError) {
          return { data: { ...data, profile: minimalProfile }, error: null };
        }
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  },

  getSession: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      return { session: data.session, error };
    } catch (error) {
      return { session: null, error };
    }
  },
}

// Database operations
export const db = {
  // Users
  getCurrentUser: async () => {
    // Create a timeout promise to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Profile fetch timed out after 8 seconds'));
      }, 8000);
    });
    
    try {
      // Use Promise.race to either get the user or timeout
      const userResult = await Promise.race([
        supabase.auth.getUser(),
        timeoutPromise
      ]);
      
      const { data: { user }, error: userError } = userResult;
      
      if (userError) {
        return { data: null, error: userError };
      }
      
      if (!user) {
        return { data: null, error: null };
      }
      
      // Create minimal user immediately to ensure we have something
      const minimalUser = {
        id: user.id,
        email: user.email,
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        is_minimal_profile: true
      };
      
      // Look up the user profile in the database
      try {
        const profileResult = await Promise.race([
          supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single(),
          timeoutPromise
        ]);
        
        const { data, error } = profileResult;
        
        // Return the user data if found
        if (data) {
          return { data, error: null };
        }
        
        // If no user found but auth exists, try to create one but don't wait for it to complete
        if (error && error.code === 'PGRST116') {
          // Create a new user profile in the background
          setTimeout(async () => {
            try {
              const newUser = {
                id: user.id,
                email: user.email,
                first_name: user.user_metadata?.first_name || '',
                last_name: user.user_metadata?.last_name || '',
                time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
              };
              
              await supabase
                .from('users')
                .insert(newUser)
                .select()
                .single();
                
            } catch (e) {
              // Silent error handling
            }
          }, 10);
          
          // Return minimal user immediately
          return { data: minimalUser, error: null };
        }
        
        return { data: minimalUser, error: null };
        
      } catch (profileError) {
        // Return minimal user object from auth data as fallback
        return { data: minimalUser, error: null };
      }
      
    } catch (error) {
      // Don't let auth failures block the UI
      return { data: null, error };
    }
  },
  
  // Partnerships
  getPartnerships: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('partnerships')
      .select(`
        *,
        user1:users!partnerships_user1_id_fkey(*),
        user2:users!partnerships_user2_id_fkey(*)
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    return { data, error }
  },

  // Get partnerships by user ID (for when you need to fetch partnerships for a specific user)
  getPartnershipsByUserId: async (userId) => {
    const { data, error } = await supabase
      .from('partnerships')
      .select(`
        *,
        user1:users!partnerships_user1_id_fkey(*),
        user2:users!partnerships_user2_id_fkey(*)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    return { data, error }
  },

  // Goals
  getGoals: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('owner_id', user.id)
    return { data, error }
  },
  
  // Get goals for a specific partnership
  getPartnershipGoals: async (partnershipId) => {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('partnership_id', partnershipId)
    return { data, error }
  },

  // Check-ins
  getUpcomingCheckIns: async (userId) => {
    const now = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('check_ins')
      .select(`
        *,
        partnership:partnerships (
          id,
          user1:users!partnerships_user1_id_fkey (id, first_name, last_name),
          user2:users!partnerships_user2_id_fkey (id, first_name, last_name)
        )
      `)
      .or(`partnership.user1_id.eq.${userId},partnership.user2_id.eq.${userId}`)
      .gte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(5)

    return { data, error }
  },
  
  // Progress updates
  getRecentProgressUpdates: async (userId) => {
    const { data, error } = await supabase
      .from('progress_updates')
      .select(`
        *,
        goal:goals (
          id, 
          title,
          partnership_id
        ),
        goal_owner:users (
          id,
          first_name,
          last_name
        )
      `)
      .eq('goal.partnership_id.user1_id', userId)
      .or(`goal.partnership_id.user1_id.eq.${userId},goal.partnership_id.user2_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(10)

    return { data, error }
  },

  // Messages
  getMessages: async (partnershipId, limit = 50) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:users!messages_sender_id_fkey(*)')
      .eq('partnership_id', partnershipId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },
  
  // Send a message
  sendMessage: async (partnershipId, senderId, content) => {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        partnership_id: partnershipId,
        sender_id: senderId,
        content: content,
      })
      .select()
      .single()

    return { data, error }
  },
} 