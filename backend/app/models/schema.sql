-- Enable necessary extensions
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

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

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

-- Enable Row Level Security
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;

-- Policies for partnerships table
CREATE POLICY "Users can view their partnerships"
    ON partnerships FOR SELECT
    USING (auth.uid() IN (user_one, user_two));

CREATE POLICY "Users can create partnerships"
    ON partnerships FOR INSERT
    WITH CHECK (auth.uid() = user_one);

CREATE POLICY "Partners can update their partnership"
    ON partnerships FOR UPDATE
    USING (auth.uid() IN (user_one, user_two));

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

-- Enable Row Level Security
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Policies for goals table
CREATE POLICY "Users can view their own goals and their partner's goals"
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
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own goals"
    ON goals FOR UPDATE
    USING (user_id = auth.uid());

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

-- Enable Row Level Security
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Policies for check-ins table
CREATE POLICY "Partners can view their check-ins"
    ON check_ins FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM partnerships
            WHERE id = check_ins.partnership_id
            AND (user_one = auth.uid() OR user_two = auth.uid())
        )
    );

CREATE POLICY "Partners can create check-ins"
    ON check_ins FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM partnerships
            WHERE id = partnership_id
            AND (user_one = auth.uid() OR user_two = auth.uid())
        )
    );

CREATE POLICY "Partners can update check-ins"
    ON check_ins FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM partnerships
            WHERE id = check_ins.partnership_id
            AND (user_one = auth.uid() OR user_two = auth.uid())
        )
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

-- Enable Row Level Security
ALTER TABLE progress_updates ENABLE ROW LEVEL SECURITY;

-- Policies for progress updates table
CREATE POLICY "Users can view progress updates for their partnerships"
    ON progress_updates FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM goals g
            JOIN partnerships p ON p.id = g.partnership_id
            WHERE g.id = progress_updates.goal_id
            AND (p.user_one = auth.uid() OR p.user_two = auth.uid())
        )
    );

CREATE POLICY "Users can create their own progress updates"
    ON progress_updates FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partnership_id UUID REFERENCES partnerships(id) NOT NULL,
    sender_id UUID REFERENCES users(id) NOT NULL,
    content TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies for messages table
CREATE POLICY "Partners can view their messages"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM partnerships
            WHERE id = messages.partnership_id
            AND (user_one = auth.uid() OR user_two = auth.uid())
        )
    );

CREATE POLICY "Users can send messages to their partnerships"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM partnerships
            WHERE id = partnership_id
            AND (user_one = auth.uid() OR user_two = auth.uid())
        )
    );

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partnerships_updated_at
    BEFORE UPDATE ON partnerships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_check_ins_updated_at
    BEFORE UPDATE ON check_ins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 