-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL,
  plan TEXT NOT NULL DEFAULT 'team' CHECK (plan IN ('team', 'agency', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team roles enum
CREATE TYPE public.team_role AS ENUM ('owner', 'manager', 'editor', 'uploader', 'viewer');

-- Create team members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.team_role NOT NULL DEFAULT 'viewer',
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create team invitations table
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.team_role NOT NULL DEFAULT 'viewer',
  invited_by UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, email)
);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Users can view teams they belong to" 
ON public.teams 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = teams.id 
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create teams" 
ON public.teams 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = owner_id);

CREATE POLICY "Team owners and managers can update teams" 
ON public.teams 
FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = teams.id 
    AND team_members.user_id = auth.uid() 
    AND team_members.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Team owners can delete teams" 
ON public.teams 
FOR DELETE 
USING (
  auth.role() = 'authenticated' AND 
  owner_id = auth.uid()
);

-- RLS Policies for team_members
CREATE POLICY "Users can view team members of their teams" 
ON public.team_members 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Team owners and managers can manage team members" 
ON public.team_members 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'manager')
  )
);

-- RLS Policies for team_invitations
CREATE POLICY "Team members can view invitations for their teams" 
ON public.team_invitations 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND 
  (
    invited_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_members.team_id = team_invitations.team_id 
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'manager')
    )
  )
);

CREATE POLICY "Team managers can create invitations" 
ON public.team_invitations 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND 
  invited_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = team_invitations.team_id 
    AND team_members.user_id = auth.uid() 
    AND team_members.role IN ('owner', 'manager')
  )
);

-- Update brand_templates for team sharing
ALTER TABLE public.brand_templates ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.brand_templates ADD COLUMN is_team_shared BOOLEAN DEFAULT false;

-- Update brand templates policies for team access
DROP POLICY IF EXISTS "Users can view their own brand templates" ON public.brand_templates;
DROP POLICY IF EXISTS "Users can view public brand templates" ON public.brand_templates;

CREATE POLICY "Users can view their own brand templates" 
ON public.brand_templates 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND 
  (
    auth.uid() = user_id OR
    is_public = true OR
    (
      is_team_shared = true AND 
      team_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_members.team_id = brand_templates.team_id 
        AND team_members.user_id = auth.uid()
      )
    )
  )
);

-- Add team_id to other relevant tables
ALTER TABLE public.jobs_new ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.clip_performances ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add triggers for updated_at
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX idx_brand_templates_team_id ON public.brand_templates(team_id);
CREATE INDEX idx_jobs_new_team_id ON public.jobs_new(team_id);

-- Function to get user's role in a team
CREATE OR REPLACE FUNCTION public.get_user_team_role(team_uuid UUID, user_uuid UUID)
RETURNS public.team_role AS $$
DECLARE
  user_role public.team_role;
BEGIN
  SELECT role INTO user_role
  FROM public.team_members
  WHERE team_id = team_uuid AND user_id = user_uuid;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;