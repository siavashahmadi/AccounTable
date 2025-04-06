-- Schema for Accountability Partner App
-- This file defines all necessary tables and RLS policies

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  avatar_url TEXT,
  time_zone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partnerships Table
CREATE TABLE IF NOT EXISTS public.partnerships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_one UUID REFERENCES public.users(id) NOT NULL,
  user_two UUID REFERENCES public.users(id) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'trial', 'active', 'ended')),
  trial_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) NOT NULL,
  UNIQUE(user_one, user_two)
);

-- Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  partnership_id UUID REFERENCES public.partnerships(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'abandoned')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  target_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check-ins Table
CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partnership_id UUID REFERENCES public.partnerships(id) NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Progress Updates Table
CREATE TABLE IF NOT EXISTS public.progress_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID REFERENCES public.goals(id) NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  description TEXT NOT NULL,
  progress_value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partnership_id UUID REFERENCES public.partnerships(id) NOT NULL,
  sender_id UUID REFERENCES public.users(id) NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id);

-- RLS Policies for partnerships table
CREATE POLICY "Users can view their own partnerships" 
  ON public.partnerships FOR SELECT 
  USING (auth.uid() = user_one OR auth.uid() = user_two);

CREATE POLICY "Users can create partnerships" 
  ON public.partnerships FOR INSERT 
  WITH CHECK (auth.uid() = user_one OR auth.uid() = user_two);

CREATE POLICY "Users can update their own partnerships" 
  ON public.partnerships FOR UPDATE 
  USING (auth.uid() = user_one OR auth.uid() = user_two);

-- RLS Policies for goals table
CREATE POLICY "Users can view goals in their partnerships" 
  ON public.goals FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT user_one FROM public.partnerships WHERE id = partnership_id
      UNION
      SELECT user_two FROM public.partnerships WHERE id = partnership_id
    )
  );

CREATE POLICY "Users can create their own goals" 
  ON public.goals FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" 
  ON public.goals FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS Policies for check-ins table
CREATE POLICY "Users can view check-ins in their partnerships" 
  ON public.check_ins FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT user_one FROM public.partnerships WHERE id = partnership_id
      UNION
      SELECT user_two FROM public.partnerships WHERE id = partnership_id
    )
  );

CREATE POLICY "Users can create check-ins in their partnerships" 
  ON public.check_ins FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT user_one FROM public.partnerships WHERE id = partnership_id
      UNION
      SELECT user_two FROM public.partnerships WHERE id = partnership_id
    )
  );

CREATE POLICY "Users can update check-ins in their partnerships" 
  ON public.check_ins FOR UPDATE 
  USING (
    auth.uid() IN (
      SELECT user_one FROM public.partnerships WHERE id = partnership_id
      UNION
      SELECT user_two FROM public.partnerships WHERE id = partnership_id
    )
  );

-- RLS Policies for progress_updates table
CREATE POLICY "Users can view progress updates for their goals or partnership goals" 
  ON public.progress_updates FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.goals g 
      JOIN public.partnerships p ON g.partnership_id = p.id
      WHERE g.id = goal_id AND (p.user_one = auth.uid() OR p.user_two = auth.uid())
    )
  );

CREATE POLICY "Users can create their own progress updates" 
  ON public.progress_updates FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for messages table
CREATE POLICY "Users can view messages in their partnerships" 
  ON public.messages FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT user_one FROM public.partnerships WHERE id = partnership_id
      UNION
      SELECT user_two FROM public.partnerships WHERE id = partnership_id
    )
  );

CREATE POLICY "Users can send messages in their partnerships" 
  ON public.messages FOR INSERT 
  WITH CHECK (
    auth.uid() = sender_id AND
    auth.uid() IN (
      SELECT user_one FROM public.partnerships WHERE id = partnership_id
      UNION
      SELECT user_two FROM public.partnerships WHERE id = partnership_id
    )
  );

-- Create a function to automatically create a user record when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, time_zone, created_at, updated_at)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'time_zone', 'UTC'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that runs the function when a new auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user(); 