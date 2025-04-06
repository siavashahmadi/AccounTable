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
        filter: `or(user_one.eq.${userId},user_two.eq.${userId})`,
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
        filter: `user_id=eq.${userId}`,
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    })
    return { data, error }
  },

  signIn: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },
}

// Database operations
export const db = {
  // Users
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) return { data: null, error }
    
    const { data, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
      
    return { data, error: profileError }
  },

  // Partnerships
  getPartnerships: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('partnerships')
      .select(`
        *,
        user_one:users!partnerships_user_one_fkey(*),
        user_two:users!partnerships_user_two_fkey(*)
      `)
      .or(`user_one.eq.${user.id},user_two.eq.${user.id}`)
    return { data, error }
  },

  // Goals
  getGoals: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
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
} 