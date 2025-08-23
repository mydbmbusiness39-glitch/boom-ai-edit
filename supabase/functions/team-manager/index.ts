import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTeamRequest {
  name: string;
  description?: string;
  plan: 'team' | 'agency' | 'enterprise';
}

interface InviteMemberRequest {
  teamId: string;
  email: string;
  role: 'manager' | 'editor' | 'uploader' | 'viewer';
}

interface UpdateMemberRoleRequest {
  teamId: string;
  userId: string;
  role: 'manager' | 'editor' | 'uploader' | 'viewer';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Set the auth context
    supabaseClient.auth.setAuth(authHeader.replace('Bearer ', ''));

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    switch (path) {
      case 'create-team':
        return await createTeam(req, supabaseClient, user.id);
      
      case 'invite-member':
        return await inviteMember(req, supabaseClient, user.id);
      
      case 'update-role':
        return await updateMemberRole(req, supabaseClient, user.id);
      
      case 'accept-invitation':
        return await acceptInvitation(req, supabaseClient, user.id);
      
      case 'get-teams':
        return await getUserTeams(supabaseClient, user.id);
      
      case 'get-team-members':
        return await getTeamMembers(req, supabaseClient, user.id);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid endpoint' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Team manager error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createTeam(req: Request, supabase: any, userId: string) {
  const { name, description, plan }: CreateTeamRequest = await req.json();

  // Create team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      name,
      description,
      plan,
      owner_id: userId
    })
    .select()
    .single();

  if (teamError) throw teamError;

  // Add owner as team member
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: team.id,
      user_id: userId,
      role: 'owner',
      joined_at: new Date().toISOString()
    });

  if (memberError) throw memberError;

  return new Response(
    JSON.stringify({ team }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function inviteMember(req: Request, supabase: any, userId: string) {
  const { teamId, email, role }: InviteMemberRequest = await req.json();

  // Check if user has permission to invite
  const { data: userRole } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (!userRole || !['owner', 'manager'].includes(userRole.role)) {
    throw new Error('Insufficient permissions to invite members');
  }

  // Check if invitation already exists
  const { data: existingInvitation } = await supabase
    .from('team_invitations')
    .select('id')
    .eq('team_id', teamId)
    .eq('email', email)
    .single();

  if (existingInvitation) {
    throw new Error('Invitation already sent to this email');
  }

  // Create invitation
  const { data: invitation, error } = await supabase
    .from('team_invitations')
    .insert({
      team_id: teamId,
      email,
      role,
      invited_by: userId
    })
    .select()
    .single();

  if (error) throw error;

  return new Response(
    JSON.stringify({ invitation }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateMemberRole(req: Request, supabase: any, userId: string) {
  const { teamId, userId: targetUserId, role }: UpdateMemberRoleRequest = await req.json();

  // Check if user has permission to update roles
  const { data: userRole } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (!userRole || !['owner', 'manager'].includes(userRole.role)) {
    throw new Error('Insufficient permissions to update member roles');
  }

  // Update member role
  const { data, error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('team_id', teamId)
    .eq('user_id', targetUserId)
    .select()
    .single();

  if (error) throw error;

  return new Response(
    JSON.stringify({ member: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function acceptInvitation(req: Request, supabase: any, userId: string) {
  const { invitationId } = await req.json();

  // Get user's email
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('User email not found');

  // Get invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('id', invitationId)
    .eq('email', user.email)
    .single();

  if (inviteError || !invitation) {
    throw new Error('Invalid invitation');
  }

  if (invitation.accepted_at) {
    throw new Error('Invitation already accepted');
  }

  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error('Invitation has expired');
  }

  // Add user to team
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: invitation.team_id,
      user_id: userId,
      role: invitation.role,
      joined_at: new Date().toISOString()
    });

  if (memberError) throw memberError;

  // Mark invitation as accepted
  const { error: updateError } = await supabase
    .from('team_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitationId);

  if (updateError) throw updateError;

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getUserTeams(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      team_members!inner(role)
    `)
    .eq('team_members.user_id', userId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ teams: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getTeamMembers(req: Request, supabase: any, userId: string) {
  const url = new URL(req.url);
  const teamId = url.searchParams.get('teamId');

  if (!teamId) {
    throw new Error('Team ID is required');
  }

  // Check if user is a member of the team
  const { data: userMembership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (!userMembership) {
    throw new Error('Not a member of this team');
  }

  const { data, error } = await supabase
    .from('team_members')
    .select(`
      *,
      profiles!inner(email)
    `)
    .eq('team_id', teamId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ members: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}