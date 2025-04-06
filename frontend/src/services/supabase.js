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

  getUserByEmail: async (email) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    return { data, error }
  },

  updateUser: async (userId, userData) => {
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', userId)
      .select()
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

  getPartnership: async (partnershipId) => {
    const { data, error } = await supabase
      .from('partnerships')
      .select(`
        *,
        user_one:users!partnerships_user_one_fkey(*),
        user_two:users!partnerships_user_two_fkey(*)
      `)
      .eq('id', partnershipId)
      .single()
    return { data, error }
  },

  createPartnership: async (partnershipData) => {
    const { data, error } = await supabase
      .from('partnerships')
      .insert(partnershipData)
      .select()
      .single()
    return { data, error }
  },

  updatePartnership: async (partnershipId, updateData) => {
    const { data, error } = await supabase
      .from('partnerships')
      .update(updateData)
      .eq('id', partnershipId)
      .select()
      .single()
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
  
  getGoal: async (goalId) => {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single()
    return { data, error }
  },
  
  createGoal: async (goalData) => {
    const { data, error } = await supabase
      .from('goals')
      .insert(goalData)
      .select()
      .single()
    return { data, error }
  },
  
  updateGoal: async (goalId, updateData) => {
    const { data, error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', goalId)
      .select()
      .single()
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
  
  getCheckins: async (partnershipId) => {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('partnership_id', partnershipId)
      .order('scheduled_at', { ascending: false })
    return { data, error }
  },
  
  createCheckin: async (checkinData) => {
    const { data, error } = await supabase
      .from('check_ins')
      .insert(checkinData)
      .select()
      .single()
    return { data, error }
  },
  
  completeCheckin: async (checkinId, notes) => {
    const { data, error } = await supabase
      .from('check_ins')
      .update({ 
        completed_at: new Date().toISOString(),
        notes
      })
      .eq('id', checkinId)
      .select()
      .single()
    return { data, error }
  },
  
  // Progress updates
  getProgressUpdates: async (goalId) => {
    const { data, error } = await supabase
      .from('progress_updates')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false })
    return { data, error }
  },
  
  createProgressUpdate: async (updateData) => {
    const { data, error } = await supabase
      .from('progress_updates')
      .insert(updateData)
      .select()
      .single()
    return { data, error }
  },
  
  // Messages
  getMessages: async (partnershipId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:users!messages_sender_id_fkey(*)')
      .eq('partnership_id', partnershipId)
      .order('created_at', { ascending: false })
    return { data, error }
  },
  
  sendMessage: async (messageData) => {
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()
    return { data, error }
  },
  
  markMessageAsRead: async (messageId) => {
    const { data, error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .select()
      .single()
    return { data, error }
  }
} 