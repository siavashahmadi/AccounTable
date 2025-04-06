-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    avatar_url TEXT,
    time_zone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partnerships Table
CREATE TABLE IF NOT EXISTS partnerships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_one UUID REFERENCES users(id) NOT NULL,
    user_two UUID REFERENCES users(id) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'trial', 'active', 'ended')),
    trial_end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_one, user_two)
);

-- Goals Table
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    partnership_id UUID REFERENCES partnerships(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'abandoned')),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    target_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check-ins Table
CREATE TABLE IF NOT EXISTS check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partnership_id UUID REFERENCES partnerships(id) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Progress Updates Table
CREATE TABLE IF NOT EXISTS progress_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID REFERENCES goals(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    description TEXT NOT NULL,
    progress_value NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partnership_id UUID REFERENCES partnerships(id) NOT NULL,
    sender_id UUID REFERENCES users(id) NOT NULL,
    content TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_partnerships_users ON partnerships(user_one, user_two);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_partnership ON goals(partnership_id);
CREATE INDEX IF NOT EXISTS idx_checkins_partnership ON check_ins(partnership_id);
CREATE INDEX IF NOT EXISTS idx_progress_goal ON progress_updates(goal_id);
CREATE INDEX IF NOT EXISTS idx_messages_partnership ON messages(partnership_id);

-- Add Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users RLS policies
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- Partnerships RLS policies
CREATE POLICY "Users can view their partnerships"
    ON partnerships FOR SELECT
    USING (auth.uid() IN (user_one, user_two));

CREATE POLICY "Users can create partnerships"
    ON partnerships FOR INSERT
    WITH CHECK (auth.uid() = user_one);

-- Goals RLS policies
CREATE POLICY "Users can view goals in their partnerships"
    ON goals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM partnerships
            WHERE id = goals.partnership_id
            AND (user_one = auth.uid() OR user_two = auth.uid())
        )
    );

CREATE POLICY "Users can create their own goals"
    ON goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Check-ins RLS policies
CREATE POLICY "Users can view check-ins in their partnerships"
    ON check_ins FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM partnerships
            WHERE id = check_ins.partnership_id
            AND (user_one = auth.uid() OR user_two = auth.uid())
        )
    );

-- Progress Updates RLS policies
CREATE POLICY "Users can view progress updates in their partnerships"
    ON progress_updates FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM goals
            WHERE id = progress_updates.goal_id
            AND EXISTS (
                SELECT 1 FROM partnerships
                WHERE id = goals.partnership_id
                AND (user_one = auth.uid() OR user_two = auth.uid())
            )
        )
    );

-- Messages RLS policies
CREATE POLICY "Users can view messages in their partnerships"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM partnerships
            WHERE id = messages.partnership_id
            AND (user_one = auth.uid() OR user_two = auth.uid())
        )
    );

CREATE POLICY "Users can send messages in their partnerships"
    ON messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM partnerships
            WHERE id = partnership_id
            AND (user_one = auth.uid() OR user_two = auth.uid())
        )
    ); 