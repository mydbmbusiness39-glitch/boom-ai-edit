import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Sparkles, Plus, MessageCircle, Play, Heart, DollarSign, Clock, Star, Trophy, Handshake, Bot, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Layout from "@/components/Layout/Layout";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

interface AITwin {
  id: string;
  name: string;
  avatar: string;
  style: string;
  followers: number;
  collaborations: number;
  rating: number;
  isOnline: boolean;
  specialties: string[];
  recentCollabs: string[];
  rental_price_per_hour?: number;
  rental_price_per_video?: number;
  is_available_for_rent?: boolean;
  earnings_total?: number;
  owner_id?: string;
}

interface CollabRequest {
  id: string;
  fromTwin: AITwin;
  toTwin: AITwin;
  type: string;
  description: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

interface CollaborationProject {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  project_type: string;
  status: string;
  collaborator_ids: string[];
  ai_avatars_used: any[];
  budget_total: number;
  revenue_split: any;
  deadline?: string;
  created_at: string;
}

const CommunityCollab = () => {
  const [aiTwins, setAiTwins] = useState<AITwin[]>([]);
  const [collabRequests, setCollabRequests] = useState<CollabRequest[]>([]);
  const [collaborationProjects, setCollaborationProjects] = useState<CollaborationProject[]>([]);
  const [myTwin, setMyTwin] = useState<AITwin | null>(null);
  const [myEarnings, setMyEarnings] = useState(0);
  const [activeRentals, setActiveRentals] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadCommunityData();
    loadCollaborationProjects();
    loadMyEarnings();
  }, []);

  const loadCommunityData = () => {
    // Mock data for demo with rental pricing
    const mockTwins: AITwin[] = [
      {
        id: '1',
        name: 'Luna Vibe',
        avatar: '/avatars/luna.jpg',
        style: 'Aesthetic Trendsetter',
        followers: 25400,
        collaborations: 156,
        rating: 4.8,
        isOnline: true,
        specialties: ['Fashion', 'Lifestyle', 'Travel'],
        recentCollabs: ['Dance Challenge', 'Product Review', 'Style Tips'],
        rental_price_per_hour: 45,
        rental_price_per_video: 25,
        is_available_for_rent: true,
        earnings_total: 12450,
        owner_id: 'user-1'
      },
      {
        id: '2',
        name: 'Echo Beat',
        avatar: '/avatars/echo.jpg',
        style: 'Music Producer',
        followers: 18900,
        collaborations: 89,
        rating: 4.9,
        isOnline: false,
        specialties: ['Music', 'Audio', 'Remix'],
        recentCollabs: ['Beat Drop', 'Remix Contest', 'Sound Design'],
        rental_price_per_hour: 60,
        rental_price_per_video: 35,
        is_available_for_rent: true,
        earnings_total: 8750,
        owner_id: 'user-2'
      },
      {
        id: '3',
        name: 'Pixel Art',
        avatar: '/avatars/pixel.jpg',
        style: 'Digital Artist',
        followers: 31200,
        collaborations: 203,
        rating: 4.7,
        isOnline: true,
        specialties: ['Animation', 'Art', 'VFX'],
        recentCollabs: ['Motion Graphics', 'Character Design', 'Visual Effects'],
        rental_price_per_hour: 55,
        rental_price_per_video: 30,
        is_available_for_rent: true,
        earnings_total: 15620,
        owner_id: 'user-3'
      }
    ];

    const mockMyTwin: AITwin = {
      id: 'my-twin',
      name: 'My AI Twin',
      avatar: '/avatars/default.jpg',
      style: 'Content Creator',
      followers: 1250,
      collaborations: 12,
      rating: 4.5,
      isOnline: true,
      specialties: ['General', 'Entertainment'],
      recentCollabs: ['First Collab', 'Tutorial', 'Q&A'],
      rental_price_per_hour: 20,
      rental_price_per_video: 15,
      is_available_for_rent: false,
      earnings_total: 245,
      owner_id: user?.id || 'current-user'
    };

    setAiTwins(mockTwins);
    setMyTwin(mockMyTwin);
  };

  const loadCollaborationProjects = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('collaboration_projects')
        .select('*')
        .or(`creator_id.eq.${user.id},collaborator_ids.cs.["${user.id}"]`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedProjects = (data || []).map(project => ({
        ...project,
        collaborator_ids: Array.isArray(project.collaborator_ids) 
          ? project.collaborator_ids.map(id => String(id)) 
          : [],
        ai_avatars_used: Array.isArray(project.ai_avatars_used) ? project.ai_avatars_used : [],
        budget_total: project.budget_total || 0,
        description: project.description || '',
        deadline: project.deadline || undefined
      }));
      
      setCollaborationProjects(transformedProjects);
    } catch (error) {
      console.error('Error loading collaboration projects:', error);
      // Mock data for demo
      setCollaborationProjects([
        {
          id: '1',
          creator_id: user?.id || '',
          title: 'Viral Dance Challenge Series',
          description: 'Creating a 5-part dance challenge series with Luna Vibe',
          project_type: 'series',
          status: 'active',
          collaborator_ids: ['user-1'],
          ai_avatars_used: [{ id: '1', name: 'Luna Vibe', rental_cost: 125 }],
          budget_total: 500,
          revenue_split: { [user?.id || '']: 70, 'user-1': 30 },
          deadline: '2024-03-15',
          created_at: new Date().toISOString()
        }
      ]);
    }
  };

  const loadMyEarnings = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('revenue_shares')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'processed');

      if (error) throw error;
      
      const totalEarnings = data?.reduce((sum, share) => sum + (share.amount || 0), 0) || 0;
      setMyEarnings(totalEarnings);
      setActiveRentals(Math.floor(Math.random() * 5) + 2); // Mock active rentals
    } catch (error) {
      console.error('Error loading earnings:', error);
      setMyEarnings(245.50); // Mock earnings
      setActiveRentals(3); // Mock active rentals
    }
  };

  const sendCollabRequest = (targetTwin: AITwin, type: string) => {
    if (!myTwin) return;

    const newRequest: CollabRequest = {
      id: Date.now().toString(),
      fromTwin: myTwin,
      toTwin: targetTwin,
      type,
      description: `${type} collaboration request`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setCollabRequests(prev => [...prev, newRequest]);
    
    toast({
      title: "Collaboration request sent!",
      description: `Sent ${type} request to ${targetTwin.name}`,
    });
  };

  const rentAITwin = async (twin: AITwin, rentalType: 'per_hour' | 'per_video') => {
    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to rent AI twins",
          variant: "destructive"
        });
        return;
      }

      const price = rentalType === 'per_hour' ? twin.rental_price_per_hour : twin.rental_price_per_video;
      
      const { data, error } = await supabase
        .from('ai_twin_rentals')
        .insert({
          renter_id: user.id,
          owner_id: twin.owner_id,
          avatar_id: twin.id,
          rental_type: rentalType,
          price_paid: price,
          owner_earnings: (price || 0) * 0.85,
          platform_fee: (price || 0) * 0.15,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "🎬 Rental Request Sent!",
        description: `Requested to rent ${twin.name} for $${price}`,
      });

    } catch (error: any) {
      toast({
        title: "Rental Failed",
        description: error.message || "Failed to create rental request",
        variant: "destructive"
      });
    }
  };

  const enableTwinRental = async () => {
    try {
      if (!user || !myTwin) return;

      const { data, error } = await supabase
        .from('ai_avatars')
        .update({
          is_available_for_rent: true,
          rental_price_per_hour: 20,
          rental_price_per_video: 15
        })
        .eq('id', myTwin.id);

      if (error) throw error;

      setMyTwin(prev => prev ? { ...prev, is_available_for_rent: true } : null);

      toast({
        title: "🚀 AI Twin Now Available for Rent!",
        description: "Other creators can now hire your AI twin",
      });

    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to enable twin rental",
        variant: "destructive"
      });
    }
  };

  const CollabCard = ({ twin }: { twin: AITwin }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={twin.avatar} alt={twin.name} />
              <AvatarFallback>{twin.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            {twin.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-neon-green rounded-full border-2 border-background" />
            )}
            {twin.is_available_for_rent && (
              <Badge className="absolute -top-2 -right-2 bg-neon-green text-background text-xs">
                For Rent
              </Badge>
            )}
          </div>
          
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{twin.name}</h3>
              <p className="text-sm text-muted-foreground">{twin.style}</p>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {twin.followers.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                {twin.collaborations}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {twin.rating}
              </span>
              {twin.earnings_total && (
                <span className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-neon-green" />
                  ${twin.earnings_total.toLocaleString()}
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap gap-1">
              {twin.specialties.map((specialty, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {specialty}
                </Badge>
              ))}
            </div>

            {twin.is_available_for_rent && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Per Video:</span>
                  <span className="font-semibold">${twin.rental_price_per_video}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Per Hour:</span>
                  <span className="font-semibold">${twin.rental_price_per_hour}/hr</span>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Button 
                size="sm"
                onClick={() => sendCollabRequest(twin, 'Duet')}
                className="bg-gradient-to-r from-neon-purple to-neon-green"
              >
                <Plus className="h-4 w-4 mr-1" />
                Duet
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => sendCollabRequest(twin, 'Remix')}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Remix
              </Button>
              {twin.is_available_for_rent && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => rentAITwin(twin, 'per_video')}
                    className="border-neon-green text-neon-green hover:bg-neon-green/10"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Rent
                  </Button>
                </>
              )}
              <Button 
                size="sm" 
                variant="ghost"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="min-h-[calc(100vh-80px)] bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Handshake className="h-8 w-8 text-neon-purple" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
                AI Twin Marketplace
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Rent AI twins • Create collaborations • Earn revenue sharing
            </p>

            {/* Earnings Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-neon-green/10 to-transparent rounded-lg p-4 text-center">
                <DollarSign className="h-6 w-6 text-neon-green mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">My Earnings</p>
                <p className="font-bold text-xl">${myEarnings.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-neon-purple/10 to-transparent rounded-lg p-4 text-center">
                <Clock className="h-6 w-6 text-neon-purple mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Active Rentals</p>
                <p className="font-bold text-xl">{activeRentals}</p>
              </div>
              <div className="bg-gradient-to-br from-neon-blue/10 to-transparent rounded-lg p-4 text-center">
                <Trophy className="h-6 w-6 text-neon-blue mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="font-bold text-xl">{myTwin?.rating || 0}</p>
              </div>
            </div>
          </div>

          {/* My Twin Stats */}
          {myTwin && (
            <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-neon-purple" />
                  Your AI Twin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={myTwin.avatar} alt={myTwin.name} />
                    <AvatarFallback>{myTwin.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-semibold">{myTwin.name}</h3>
                    <p className="text-muted-foreground">{myTwin.style}</p>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {myTwin.followers.toLocaleString()} followers
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-4 w-4" />
                        {myTwin.collaborations} collaborations
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        {myTwin.rating} rating
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-neon-green" />
                        ${myTwin.earnings_total} earned
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button className="bg-gradient-to-r from-neon-purple to-neon-green">
                      Customize Twin
                    </Button>
                    {!myTwin.is_available_for_rent && (
                      <Button 
                        variant="outline"
                        onClick={enableTwinRental}
                        className="w-full border-neon-green text-neon-green hover:bg-neon-green/10"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Enable Rentals
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content */}
          <Tabs defaultValue="discover" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="discover">Discover Twins</TabsTrigger>
              <TabsTrigger value="projects">My Projects</TabsTrigger>
              <TabsTrigger value="requests">Collab Requests</TabsTrigger>
              <TabsTrigger value="featured">Featured Collabs</TabsTrigger>
            </TabsList>

            <TabsContent value="discover" className="space-y-4">
              <div className="grid gap-6">
                {aiTwins.map((twin) => (
                  <CollabCard key={twin.id} twin={twin} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="projects" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Collaboration Projects</h3>
                <Button className="bg-gradient-to-r from-neon-purple to-neon-green">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </div>
              
              {collaborationProjects.length > 0 ? (
                <div className="grid gap-4">
                  {collaborationProjects.map((project) => (
                    <Card key={project.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg mb-2">{project.title}</h4>
                            <p className="text-muted-foreground mb-4">{project.description}</p>
                            
                            <div className="flex items-center gap-4 text-sm">
                              <Badge variant="secondary">{project.project_type}</Badge>
                              <Badge 
                                variant={project.status === 'active' ? 'default' : 'outline'}
                                className={project.status === 'active' ? 'bg-neon-green text-background' : ''}
                              >
                                {project.status}
                              </Badge>
                              <span className="text-muted-foreground">
                                Budget: ${project.budget_total}
                              </span>
                              {project.deadline && (
                                <span className="text-muted-foreground">
                                  Due: {new Date(project.deadline).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            
                            <div className="mt-4 flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">AI Twins:</span>
                              {project.ai_avatars_used.map((avatar, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {avatar.name} (${avatar.rental_cost})
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div className="text-right space-y-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Handshake className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Active Projects</h3>
                  <p className="text-muted-foreground">
                    Start a collaboration project to work with other AI twins
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Collaboration Requests</h3>
                <p className="text-muted-foreground">
                  Send collaboration requests to other AI twins to get started!
                </p>
              </div>
            </TabsContent>

            <TabsContent value="featured" className="space-y-4">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="aspect-video bg-gradient-to-br from-neon-purple/20 to-neon-green/20 rounded-lg mb-4 flex items-center justify-center">
                      <Play className="h-12 w-12 text-neon-purple" />
                    </div>
                    <h3 className="font-semibold mb-2">Luna × Echo: Beat Drop Challenge</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Fashion meets music in this viral collaboration
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>L</AvatarFallback>
                        </Avatar>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>E</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">2.1M views</span>
                      </div>
                      <Badge variant="secondary">Trending</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="aspect-video bg-gradient-to-br from-neon-green/20 to-neon-purple/20 rounded-lg mb-4 flex items-center justify-center">
                      <Play className="h-12 w-12 text-neon-green" />
                    </div>
                    <h3 className="font-semibold mb-2">Pixel × Luna: Digital Art Tutorial</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Learn digital art techniques in this creative collab
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>P</AvatarFallback>
                        </Avatar>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>L</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">856K views</span>
                      </div>
                      <Badge variant="outline">Educational</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default CommunityCollab;