import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Settings, Mail, Crown, Shield, Edit, Eye, Upload } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description: string;
  plan: string;
  owner_id: string;
  team_members: Array<{ role: string }>;
}

interface TeamMember {
  id: string;
  role: string;
  user_id: string;
  joined_at: string;
  profiles: { email: string };
}

const Teams: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);

  // Form states
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [newTeamPlan, setNewTeamPlan] = useState<'team' | 'agency' | 'enterprise'>('team');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'editor' | 'uploader' | 'viewer'>('viewer');

  useEffect(() => {
    if (user) {
      loadTeams();
    }
  }, [user]);

  const loadTeams = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('team-manager/get-teams');
      
      if (error) throw error;
      
      setTeams(data.teams || []);
    } catch (error) {
      console.error('Error loading teams:', error);
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(`team-manager/get-team-members?teamId=${teamId}`);
      
      if (error) throw error;
      
      setTeamMembers(data.members || []);
    } catch (error) {
      console.error('Error loading team members:', error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      });
    }
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) return;

    try {
      const { data, error } = await supabase.functions.invoke('team-manager/create-team', {
        body: {
          name: newTeamName,
          description: newTeamDescription,
          plan: newTeamPlan
        }
      });

      if (error) throw error;

      setTeams([...teams, data.team]);
      setCreateTeamOpen(false);
      setNewTeamName('');
      setNewTeamDescription('');
      setNewTeamPlan('team');
      
      toast({
        title: "Success",
        description: "Team created successfully!",
      });
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive",
      });
    }
  };

  const inviteMember = async () => {
    if (!selectedTeam || !inviteEmail.trim()) return;

    try {
      const { error } = await supabase.functions.invoke('team-manager/invite-member', {
        body: {
          teamId: selectedTeam.id,
          email: inviteEmail,
          role: inviteRole
        }
      });

      if (error) throw error;

      setInviteMemberOpen(false);
      setInviteEmail('');
      setInviteRole('viewer');
      
      toast({
        title: "Success",
        description: "Invitation sent successfully!",
      });
    } catch (error) {
      console.error('Error inviting member:', error);
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4" />;
      case 'manager': return <Shield className="h-4 w-4" />;
      case 'editor': return <Edit className="h-4 w-4" />;
      case 'uploader': return <Upload className="h-4 w-4" />;
      case 'viewer': return <Eye className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'manager': return 'secondary';
      case 'editor': return 'outline';
      case 'uploader': return 'outline';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  const selectTeam = (team: Team) => {
    setSelectedTeam(team);
    loadTeamMembers(team.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Team Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Collaborate with your team on video projects
            </p>
          </div>

          <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90">
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Set up a new team to collaborate on video projects
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="team-name">Team Name</Label>
                  <Input
                    id="team-name"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Enter team name"
                  />
                </div>
                <div>
                  <Label htmlFor="team-description">Description</Label>
                  <Input
                    id="team-description"
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    placeholder="Enter team description (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="team-plan">Plan</Label>
                  <Select value={newTeamPlan} onValueChange={(value: any) => setNewTeamPlan(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createTeam} className="w-full">
                  Create Team
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teams List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Your Teams</h2>
            {teams.map((team) => (
              <Card
                key={team.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTeam?.id === team.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => selectTeam(team)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  <CardDescription>{team.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="capitalize">
                      {team.plan}
                    </Badge>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="mr-1 h-4 w-4" />
                      {team.team_members?.length || 0} members
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Team Details */}
          <div className="lg:col-span-2">
            {selectedTeam ? (
              <Tabs defaultValue="members" className="space-y-4">
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="members">Members</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>

                  <Dialog open={inviteMemberOpen} onOpenChange={setInviteMemberOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Mail className="mr-2 h-4 w-4" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                        <DialogDescription>
                          Send an invitation to join {selectedTeam.name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="invite-email">Email Address</Label>
                          <Input
                            id="invite-email"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="Enter email address"
                          />
                        </div>
                        <div>
                          <Label htmlFor="invite-role">Role</Label>
                          <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="uploader">Uploader</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={inviteMember} className="w-full">
                          Send Invitation
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <TabsContent value="members">
                  <Card>
                    <CardHeader>
                      <CardTitle>Team Members</CardTitle>
                      <CardDescription>
                        Manage your team members and their roles
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {teamMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                                {member.profiles.email.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium">{member.profiles.email}</p>
                                <p className="text-sm text-muted-foreground">
                                  Joined {new Date(member.joined_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize">
                              <span className="mr-1">{getRoleIcon(member.role)}</span>
                              {member.role}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings">
                  <Card>
                    <CardHeader>
                      <CardTitle>Team Settings</CardTitle>
                      <CardDescription>
                        Configure team preferences and permissions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label>Team Name</Label>
                          <Input value={selectedTeam.name} disabled />
                        </div>
                        <div>
                          <Label>Plan</Label>
                          <Input value={selectedTeam.plan} disabled className="capitalize" />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input value={selectedTeam.description || 'No description'} disabled />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center space-y-4">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="text-lg font-medium">Select a Team</h3>
                      <p className="text-muted-foreground">
                        Choose a team from the left to manage members and settings
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Teams;