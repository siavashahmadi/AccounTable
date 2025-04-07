-- Create pending invitations table for tracking invitations to non-users
CREATE TABLE IF NOT EXISTS pending_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  inviter_id UUID REFERENCES users(id) NOT NULL,
  invitation_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired')),
  message TEXT,
  agreement JSONB,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_pending_invitations_email ON pending_invitations(email);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_token ON pending_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_inviter ON pending_invitations(inviter_id);

-- Add RLS policies
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- Only the inviter can see invitations they've sent
CREATE POLICY pending_invitations_select ON pending_invitations
  FOR SELECT
  USING (
    inviter_id = auth.uid()
  );

-- Users can create new invitations
CREATE POLICY pending_invitations_insert ON pending_invitations
  FOR INSERT
  WITH CHECK (
    inviter_id = auth.uid()
  );

-- Only the inviter can update their invitations
CREATE POLICY pending_invitations_update ON pending_invitations
  FOR UPDATE
  USING (
    inviter_id = auth.uid()
  );

-- Add is_user_exists flag to partnerships table to distinguish between existing and new partner invitations
ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS is_user_exists BOOLEAN DEFAULT TRUE; 