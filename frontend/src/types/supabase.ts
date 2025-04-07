export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          avatar_url: string | null
          bio: string | null
          time_zone: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          avatar_url?: string | null
          bio?: string | null
          time_zone: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          avatar_url?: string | null
          bio?: string | null
          time_zone?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      partnerships: {
        Row: {
          id: string
          user_one: string
          user_two: string
          status: 'pending' | 'active' | 'paused' | 'completed'
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_one: string
          user_two: string
          status?: 'pending' | 'active' | 'paused' | 'completed'
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_one?: string
          user_two?: string
          status?: 'pending' | 'active' | 'paused' | 'completed'
          created_at?: string
          updated_at?: string | null
        }
      }
      goals: {
        Row: {
          id: string
          partnership_id: string
          user_id: string
          title: string
          description: string | null
          status: 'active' | 'completed' | 'abandoned'
          target_date: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          partnership_id: string
          user_id: string
          title: string
          description?: string | null
          status?: 'active' | 'completed' | 'abandoned'
          target_date?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          partnership_id?: string
          user_id?: string
          title?: string
          description?: string | null
          status?: 'active' | 'completed' | 'abandoned'
          target_date?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      check_ins: {
        Row: {
          id: string
          partnership_id: string
          scheduled_at: string
          duration_minutes: number | null
          notes: string | null
          status: 'scheduled' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          partnership_id: string
          scheduled_at: string
          duration_minutes?: number | null
          notes?: string | null
          status?: 'scheduled' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          partnership_id?: string
          scheduled_at?: string
          duration_minutes?: number | null
          notes?: string | null
          status?: 'scheduled' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string | null
        }
      }
      progress_updates: {
        Row: {
          id: string
          goal_id: string
          content: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          goal_id: string
          content: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          goal_id?: string
          content?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          partnership_id: string
          sender_id: string
          content: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          partnership_id: string
          sender_id: string
          content: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          partnership_id?: string
          sender_id?: string
          content?: string
          created_at?: string
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 