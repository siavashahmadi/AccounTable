import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  getUser: async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
  },

  // Partnerships
  getPartnerships: async (userId) => {
    const { data, error } = await supabase
      .from('partnerships')
      .select(`
        *,
        user_one:users!partnerships_user_one_fkey(*),
        user_two:users!partnerships_user_two_fkey(*)
      `)
      .or(`user_one.eq.${userId},user_two.eq.${userId}`)
    return { data, error }
  },

  // Goals
  getGoals: async (userId) => {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
    return { data, error }
  },

  // Check-ins
  getUpcomingCheckins: async (partnershipId) => {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('partnership_id', partnershipId)
      .gt('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
    return { data, error }
  },
} 