-- Fix anonymous access policies for team-related tables
-- Drop existing policies and recreate with proper authentication checks

DROP POLICY IF EXISTS "Users can view teams they belong to" ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners and managers can update teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can delete teams" ON public.teams;

DROP POLICY IF EXISTS "Users can view team members of their teams" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and managers can manage team members" ON public.team_members;

DROP POLICY IF EXISTS "Team members can view invitations for their teams" ON public.team_invitations;
DROP POLICY IF EXISTS "Team managers can create invitations" ON public.team_invitations;

-- Recreate team policies with proper authentication
CREATE POLICY "Authenticated users can view teams they belong to" 
ON public.teams 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = teams.id 
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create teams" 
ON public.teams 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners and managers can update teams" 
ON public.teams 
FOR UPDATE 
TO authenticated
USING (
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
TO authenticated
USING (owner_id = auth.uid());

-- Recreate team_members policies with proper authentication
CREATE POLICY "Authenticated users can view team members of their teams" 
ON public.team_members 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Team owners and managers can manage team members" 
ON public.team_members 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'manager')
  )
);

-- Recreate team_invitations policies with proper authentication
CREATE POLICY "Authenticated users can view invitations for their teams" 
ON public.team_invitations 
FOR SELECT 
TO authenticated
USING (
  invited_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = team_invitations.team_id 
    AND team_members.user_id = auth.uid()
    AND team_members.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Team managers can create invitations" 
ON public.team_invitations 
FOR INSERT 
TO authenticated
WITH CHECK (
  invited_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = team_invitations.team_id 
    AND team_members.user_id = auth.uid() 
    AND team_members.role IN ('owner', 'manager')
  )
);