import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Sparkles, Plus, MessageCircle, Play, Heart } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Layout from "@/components/Layout/Layout";
import { useAuth } from "@/contexts/AuthProvider";

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

const CommunityCollab = () => {
  const [aiTwins, setAiTwins] = useState<AITwin[]>([]);
  const [collabRequests, setCollabRequests] = useState<CollabRequest[]>([]);
  const [myTwin, setMyTwin] = useState<AITwin | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadCommunityData();
  }, []);

  const loadCommunityData = () => {
    // Mock data for demo
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
        recentCollabs: ['Dance Challenge', 'Product Review', 'Style Tips']
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
        recentCollabs: ['Beat Drop', 'Remix Contest', 'Sound Design']
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
        recentCollabs: ['Motion Graphics', 'Character Design', 'Visual Effects']
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
      recentCollabs: ['First Collab', 'Tutorial', 'Q&A']
    };

    setAiTwins(mockTwins);
    setMyTwin(mockMyTwin);
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
            </div>
            
            <div className="flex flex-wrap gap-1">
              {twin.specialties.map((specialty, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {specialty}
                </Badge>
              ))}
            </div>
            
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
              <Users className="h-8 w-8 text-neon-purple" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
                Community Collab Mode
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Connect your AI twin with others for viral crossover content
            </p>
          </div>

          {/* My Twin Stats */}
          {myTwin && (
            <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-neon-purple" />
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
                        <Heart className="h-4 w-4" />
                        {myTwin.rating} rating
                      </span>
                    </div>
                  </div>
                  <Button className="bg-gradient-to-r from-neon-purple to-neon-green">
                    Customize Twin
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content */}
          <Tabs defaultValue="discover" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="discover">Discover Twins</TabsTrigger>
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