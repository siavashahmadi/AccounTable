import { createClient } from '@supabase/supabase-js'

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase environment variables')
  throw new Error('Missing Supabase environment variables')
}

console.log('Initializing Supabase client with URL:', supabaseUrl)

// Create Supabase client with consistent configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    // Add timeout to fetch requests
    fetch: (...args) => {
      const [url, options] = args
      const controller = new AbortController()
      const signal = controller.signal
      
      // 30 second timeout
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.error('Supabase request timed out')
      }, 30000)
      
      return fetch(url, { ...options, signal })
        .then(response => {
          clearTimeout(timeoutId)
          return response
        })
        .catch(error => {
          clearTimeout(timeoutId)
          console.error('Supabase fetch error:', error)
          throw error
        })
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  debug: import.meta.env.DEV
})

// Export database helper methods
export const db = {
  // Basic table access
  from: (table) => supabase.from(table),
  
  // Partnerships
  async getPartnerships() {
    const { data, error } = await supabase
      .from('partnerships')
      .select(`
        *,
        user1:users!partnerships_user1_id_fkey (
          id,
          email,
          first_name,
          last_name,
          avatar_url
        ),
        user2:users!partnerships_user2_id_fkey (
          id,
          email,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data, error: null };
  },
  
  async createPartnership(partnerEmail, message, agreement, isNewUser = false) {
    const { data, error } = await supabase.rpc('create_partnership', {
      partner_email: partnerEmail,
      invitation_message: message,
      agreement_data: agreement,
      is_new_user: isNewUser
    });
    
    if (error) throw error;
    return { data, error: null };
  },
  
  async acceptPartnership(partnershipId) {
    const { data, error } = await supabase
      .from('partnerships')
      .update({ status: 'trial' })
      .eq('id', partnershipId)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  },
  
  async declinePartnership(partnershipId) {
    const { data, error } = await supabase
      .from('partnerships')
      .update({ status: 'ended' })
      .eq('id', partnershipId)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  },
  
  async finalizePartnership(partnershipId) {
    const { data, error } = await supabase
      .from('partnerships')
      .update({ status: 'active' })
      .eq('id', partnershipId)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  },
  
  // Goals
  async getGoals() {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data, error: null };
  },
  
  async createGoal(goalData) {
    const { data, error } = await supabase
      .from('goals')
      .insert(goalData)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  },
  
  async updateGoal(goalId, updates) {
    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  },
  
  // Check-ins
  async getCheckIns(partnershipId) {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('partnership_id', partnershipId)
      .order('scheduled_at', { ascending: true });
    
    if (error) throw error;
    return { data, error: null };
  },
  
  async createCheckIn(checkInData) {
    const { data, error } = await supabase
      .from('check_ins')
      .insert(checkInData)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  },
  
  // User management
  async getUserByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return { data, error: null };
  },
  
  async updateUser(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  },
  
  // Invitations
  async getPendingInvitations() {
    const { data, error } = await supabase
      .from('pending_invitations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data, error: null };
  }
};

// Simple realtime subscription helper
export const setupRealtimeSubscriptions = (userId) => {
  if (!userId) {
    console.warn('Cannot set up realtime subscriptions without userId')
    return () => {}
  }
  
  console.log('Setting up realtime subscriptions for user:', userId)
  
  try {
    // Messages subscription
    const messagesSubscription = supabase
      .channel('messages-' + userId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          console.log('New message received:', payload.new)
          // Dispatch event for components to listen to
          window.dispatchEvent(new CustomEvent('new-message', { 
            detail: payload.new 
          }))
        }
      )
      .subscribe()
      
    // Return cleanup function
    return () => {
      console.log('Cleaning up realtime subscriptions')
      messagesSubscription.unsubscribe()
    }
  } catch (error) {
    console.error('Error setting up realtime subscriptions:', error)
    return () => {}
  }
} 