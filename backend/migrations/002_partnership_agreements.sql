-- Create partnership agreements table
CREATE TABLE IF NOT EXISTS partnership_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partnership_id UUID REFERENCES partnerships(id) NOT NULL,
  communication_frequency TEXT NOT NULL CHECK (communication_frequency IN ('daily', 'weekly', 'bi-weekly', 'monthly')),
  check_in_days TEXT[] DEFAULT '{}',
  expectations TEXT,
  commitment_level TEXT NOT NULL CHECK (commitment_level IN ('casual', 'moderate', 'strict')),
  feedback_style TEXT NOT NULL CHECK (feedback_style IN ('direct', 'gentle', 'balanced')),
  created_by UUID REFERENCES users(id) NOT NULL,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add is_invitation_message column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_invitation_message BOOLEAN DEFAULT FALSE;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_partnership_agreements_partnership_id ON partnership_agreements(partnership_id);

-- Add RLS policies for partnership agreements
ALTER TABLE partnership_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY partnership_agreements_select ON partnership_agreements 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM partnerships 
      WHERE partnerships.id = partnership_agreements.partnership_id
      AND (partnerships.user_one = auth.uid() OR partnerships.user_two = auth.uid())
    )
  );

CREATE POLICY partnership_agreements_insert ON partnership_agreements 
  FOR INSERT 
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM partnerships 
      WHERE partnerships.id = partnership_agreements.partnership_id
      AND (partnerships.user_one = auth.uid() OR partnerships.user_two = auth.uid())
    )
  );

CREATE POLICY partnership_agreements_update ON partnership_agreements 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM partnerships 
      WHERE partnerships.id = partnership_agreements.partnership_id
      AND (partnerships.user_one = auth.uid() OR partnerships.user_two = auth.uid())
    )
  )
  WITH CHECK (
    updated_by = auth.uid()
  ); 