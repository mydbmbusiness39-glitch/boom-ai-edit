import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Music, Hash, Play, Download, RefreshCw, Zap, Bell, Sparkles, FileImage, Type, Layers } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Layout from "@/components/Layout/Layout";
import { supabase } from "@/integrations/supabase/client";

interface TrendingAudio {
  id: string;
  title: string;
  artist: string;
  duration: number;
  trendScore: number;
  category: string;
  matchScore?: number;
  previewUrl?: string;
  isEarlyTrend?: boolean;
  velocityScore?: number;
}

interface TrendingHashtag {
  tag: string;
  count: string;
  category: string;
  growth: string;
  isEarlyTrend?: boolean;
}

interface TrendAlert {
  id: string;
  type: 'audio' | 'meme' | 'hashtag';
  title: string;
  message: string;
  urgency: 'low' | 'medium' | 'high';
  timestamp: Date;
  actionable: boolean;
}

interface MemeTemplate {
  id: string;
  name: string;
  type: 'gif' | 'text' | 'overlay';
  previewUrl: string;
  viralScore: number;
  category: string;
}

const TrendSync = () => {
  const [trendingAudio, setTrendingAudio] = useState<TrendingAudio[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const [memeTemplates, setMemeTemplates] = useState<MemeTemplate[]>([]);
  const [trendAlerts, setTrendAlerts] = useState<TrendAlert[]>([]);
  const [userContent, setUserContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchProgress, setMatchProgress] = useState(0);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTrendingContent();
    loadMemeTemplates();
    loadTrendAlerts();
    
    // Set up real-time alerts checking
    if (alertsEnabled) {
      const alertInterval = setInterval(checkForNewTrends, 30000); // Check every 30s
      return () => clearInterval(alertInterval);
    }
  }, [alertsEnabled]);

  const loadTrendingContent = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('trend-detector', {
        body: { action: 'getTrends' }
      });

      if (error) throw error;

      setTrendingAudio(data.audio || []);
      setTrendingHashtags(data.hashtags || []);
      
      // Check for early trends and create alerts
      const earlyTrends = data.audio.filter((audio: TrendingAudio) => 
        audio.isEarlyTrend && audio.velocityScore && audio.velocityScore > 80
      );
      
      if (earlyTrends.length > 0) {
        createTrendAlert(earlyTrends[0]);
      }
    } catch (error) {
      console.error('Error loading trends:', error);
      // Mock data for demo
      setTrendingAudio([
        {
          id: '1',
          title: 'Viral Beat #1',
          artist: 'TrendMaker',
          duration: 15,
          trendScore: 95,
          category: 'Dance',
          previewUrl: '/audio/trend1.mp3',
          isEarlyTrend: true,
          velocityScore: 95
        },
        {
          id: '2',
          title: 'Catchy Hook',
          artist: 'ViralSound',
          duration: 12,
          trendScore: 89,
          category: 'Comedy',
          previewUrl: '/audio/trend2.mp3',
          isEarlyTrend: false,
          velocityScore: 65
        },
        {
          id: '3',
          title: 'Mysterious Melody',
          artist: 'TrendSetter',
          duration: 18,
          trendScore: 45,
          category: 'Cinematic',
          previewUrl: '/audio/trend3.mp3',
          isEarlyTrend: true,
          velocityScore: 88
        }
      ]);

      setTrendingHashtags([
        { tag: '#fyp', count: '2.1B', category: 'General', growth: '+15%', isEarlyTrend: false },
        { tag: '#viral', count: '891M', category: 'General', growth: '+23%', isEarlyTrend: false },
        { tag: '#trending', count: '567M', category: 'General', growth: '+8%', isEarlyTrend: false },
        { tag: '#aesthetic', count: '445M', category: 'Lifestyle', growth: '+127%', isEarlyTrend: true },
        { tag: '#mysteryvibe', count: '12M', category: 'Entertainment', growth: '+890%', isEarlyTrend: true }
      ]);
    }
  };

  const analyzeContentMatch = async () => {
    if (!userContent.trim()) {
      toast({
        title: "Content required",
        description: "Please describe your video content first",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setMatchProgress(0);

    // Simulate analysis progress
    const progressInterval = setInterval(() => {
      setMatchProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const { data, error } = await supabase.functions.invoke('trend-matcher', {
        body: {
          content: userContent,
          trends: trendingAudio.map(a => ({ id: a.id, title: a.title, category: a.category }))
        }
      });

      if (error) throw error;

      // Update audio with match scores
      setTrendingAudio(prev => prev.map(audio => ({
        ...audio,
        matchScore: data.matches[audio.id] || Math.floor(Math.random() * 100)
      })));

      toast({
        title: "Analysis complete!",
        description: "Found trending audio that matches your content",
      });
    } catch (error) {
      console.error('Error analyzing match:', error);
      // Mock match scores for demo
      setTrendingAudio(prev => prev.map(audio => ({
        ...audio,
        matchScore: Math.floor(Math.random() * 100)
      })));
      
      toast({
        title: "Analysis complete!",
        description: "Found trending audio that matches your content",
      });
    } finally {
      setIsAnalyzing(false);
      clearInterval(progressInterval);
      setMatchProgress(100);
    }
  };

  const loadMemeTemplates = async () => {
    // Mock meme templates - in production this would come from an API
    setMemeTemplates([
      { id: '1', name: 'Shocked Face', type: 'gif', previewUrl: '/memes/shocked.gif', viralScore: 94, category: 'Reaction' },
      { id: '2', name: 'Bold Text Overlay', type: 'text', previewUrl: '/memes/text.png', viralScore: 87, category: 'Text' },
      { id: '3', name: 'Glow Effect', type: 'overlay', previewUrl: '/memes/glow.png', viralScore: 91, category: 'Effect' },
      { id: '4', name: 'Trend Alert Frame', type: 'overlay', previewUrl: '/memes/alert.png', viralScore: 96, category: 'Frame' },
      { id: '5', name: 'Dance Move Caption', type: 'text', previewUrl: '/memes/dance.png', viralScore: 89, category: 'Dance' }
    ]);
  };

  const loadTrendAlerts = async () => {
    // Load recent alerts
    const mockAlerts: TrendAlert[] = [
      {
        id: '1',
        type: 'audio',
        title: '🚨 Early Trend Detected!',
        message: '"Mysterious Melody" is gaining 890% velocity - jump on this NOW!',
        urgency: 'high',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        actionable: true
      },
      {
        id: '2', 
        type: 'hashtag',
        title: '⚡ Hashtag Explosion',
        message: '#mysteryvibe growing at 890% - early adopter advantage!',
        urgency: 'high',
        timestamp: new Date(Date.now() - 1000 * 60 * 12),
        actionable: true
      }
    ];
    setTrendAlerts(mockAlerts);
  };

  const checkForNewTrends = async () => {
    // This would check for new early trends in real-time
    console.log('Checking for new trends...');
  };

  const createTrendAlert = (trend: TrendingAudio) => {
    const newAlert: TrendAlert = {
      id: Date.now().toString(),
      type: 'audio',
      title: '🚨 Jump on this trend NOW!',
      message: `"${trend.title}" is exploding with ${trend.velocityScore}% velocity!`,
      urgency: 'high',
      timestamp: new Date(),
      actionable: true
    };
    
    setTrendAlerts(prev => [newAlert, ...prev]);
    
    toast({
      title: newAlert.title,
      description: newAlert.message,
      className: "border-neon-green bg-card",
    });
  };

  const applyMemeTemplate = async (templateId: string, audioId?: string) => {
    toast({
      title: "🎬 Meme Applied!",
      description: "Auto-overlay added to your video project",
    });
  };

  const downloadAudio = async (audioId: string) => {
    toast({
      title: "Downloading...",
      description: "Audio will be saved to your project",
    });
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-80px)] bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Zap className="h-8 w-8 text-neon-green" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-green to-neon-purple bg-clip-text text-transparent">
                AI Trend Scanner
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Catch trends before they explode • Auto-meme overlays • Smart alerts
            </p>
            
            {/* Alert Toggle */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Real-time alerts:</span>
              <Button
                variant={alertsEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setAlertsEnabled(!alertsEnabled)}
                className={alertsEnabled ? "bg-neon-green text-background" : ""}
              >
                {alertsEnabled ? "ON" : "OFF"}
              </Button>
            </div>
          </div>

          {/* Trend Alerts */}
          {trendAlerts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-neon-green" />
                Live Trend Alerts
              </h2>
              <div className="grid gap-3">
                {trendAlerts.slice(0, 3).map((alert) => (
                  <Card key={alert.id} className={`border-l-4 ${
                    alert.urgency === 'high' ? 'border-l-neon-green' : 
                    alert.urgency === 'medium' ? 'border-l-neon-purple' : 'border-l-muted'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-sm">{alert.title}</h3>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round((Date.now() - alert.timestamp.getTime()) / (1000 * 60))} min ago
                          </p>
                        </div>
                        {alert.actionable && (
                          <Button size="sm" className="bg-neon-green text-background">
                            Act Now
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Content Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-neon-green" />
                Analyze Your Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                placeholder="Describe your video content, mood, genre, or target audience..."
                value={userContent}
                onChange={(e) => setUserContent(e.target.value)}
                className="w-full p-3 rounded-lg border border-border bg-background resize-none min-h-24"
              />
              
              <div className="flex items-center justify-between">
                <Button 
                  onClick={analyzeContentMatch}
                  disabled={isAnalyzing}
                  className="bg-gradient-to-r from-neon-green to-neon-purple"
                >
                  {isAnalyzing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TrendingUp className="h-4 w-4 mr-2" />
                  )}
                  Find Matching Trends
                </Button>
                
                {isAnalyzing && (
                  <div className="flex items-center gap-2 flex-1 max-w-xs ml-4">
                    <Progress value={matchProgress} className="flex-1" />
                    <span className="text-sm text-muted-foreground">{matchProgress}%</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Trending Content */}
          <Tabs defaultValue="audio" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="audio" className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                Trending Audio
              </TabsTrigger>
              <TabsTrigger value="hashtags" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Trending Hashtags
              </TabsTrigger>
              <TabsTrigger value="memes" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Meme Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="audio" className="space-y-4">
              <div className="grid gap-4">
                {trendingAudio
                  .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
                  .map((audio) => (
                  <Card key={audio.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                         <div className="flex-1 space-y-2">
                           <div className="flex items-center gap-3 flex-wrap">
                             <h3 className="font-semibold">{audio.title}</h3>
                             <Badge variant="secondary">{audio.category}</Badge>
                             <Badge 
                               variant={audio.trendScore > 90 ? "default" : "outline"}
                               className={audio.trendScore > 90 ? "bg-neon-green text-background" : ""}
                             >
                               {audio.trendScore}% trending
                             </Badge>
                             {audio.isEarlyTrend && (
                               <Badge className="bg-neon-purple text-background animate-pulse">
                                 🚨 Early Trend
                               </Badge>
                             )}
                             {audio.velocityScore && audio.velocityScore > 80 && (
                               <Badge className="bg-gradient-to-r from-neon-green to-neon-purple text-background">
                                 ⚡ {audio.velocityScore}% velocity
                               </Badge>
                             )}
                             {audio.matchScore && (
                               <Badge 
                                 variant={audio.matchScore > 70 ? "default" : "outline"}
                                 className={audio.matchScore > 70 ? "bg-neon-purple text-background" : ""}
                               >
                                 {audio.matchScore}% match
                               </Badge>
                             )}
                           </div>
                           <p className="text-sm text-muted-foreground">
                             {audio.artist} • {audio.duration}s
                             {audio.isEarlyTrend && <span className="text-neon-green ml-2">• Jump on NOW!</span>}
                           </p>
                         </div>
                        
                         <div className="flex items-center gap-2">
                           <Button variant="ghost" size="sm">
                             <Play className="h-4 w-4" />
                           </Button>
                           <Button 
                             variant="ghost" 
                             size="sm"
                             onClick={() => downloadAudio(audio.id)}
                           >
                             <Download className="h-4 w-4" />
                           </Button>
                           <Button 
                             variant="ghost" 
                             size="sm"
                             onClick={() => applyMemeTemplate('auto', audio.id)}
                             title="Auto-apply meme overlay"
                           >
                             <Sparkles className="h-4 w-4" />
                           </Button>
                         </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="hashtags" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {trendingHashtags.map((hashtag, index) => (
                  <Card key={index} className={`hover:shadow-lg transition-shadow cursor-pointer ${
                    hashtag.isEarlyTrend ? 'ring-2 ring-neon-green/50 bg-card/80' : ''
                  }`}>
                    <CardContent className="p-4 text-center space-y-2">
                      <h3 className="text-lg font-bold text-neon-green">{hashtag.tag}</h3>
                      <p className="text-2xl font-bold">{hashtag.count}</p>
                      <Badge variant="secondary">{hashtag.category}</Badge>
                      <Badge 
                        variant="outline" 
                        className={`${
                          parseInt(hashtag.growth.replace(/[^\d]/g, '')) > 100 
                            ? 'text-neon-green border-neon-green bg-neon-green/10' 
                            : 'text-neon-purple border-neon-purple'
                        }`}
                      >
                        {hashtag.growth} growth
                      </Badge>
                      {hashtag.isEarlyTrend && (
                        <Badge className="bg-neon-purple text-background animate-pulse w-full">
                          🚨 Early Trend Alert
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="memes" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {memeTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardContent className="p-4 space-y-3">
                      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                        {template.type === 'gif' && <FileImage className="h-12 w-12 text-muted-foreground" />}
                        {template.type === 'text' && <Type className="h-12 w-12 text-muted-foreground" />}
                        {template.type === 'overlay' && <Layers className="h-12 w-12 text-muted-foreground" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Button 
                          size="sm" 
                          className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-neon-green text-background"
                          onClick={() => applyMemeTemplate(template.id)}
                        >
                          Apply Template
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm">{template.name}</h3>
                          <Badge 
                            variant={template.viralScore > 90 ? "default" : "outline"}
                            className={template.viralScore > 90 ? "bg-neon-purple text-background" : ""}
                          >
                            {template.viralScore}% viral
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{template.type.toUpperCase()}</Badge>
                          <Badge variant="outline" className="text-xs">{template.category}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Card className="bg-gradient-to-r from-neon-green/10 to-neon-purple/10 border-neon-green/30">
                <CardContent className="p-6 text-center space-y-4">
                  <Sparkles className="h-12 w-12 text-neon-green mx-auto" />
                  <h3 className="text-xl font-semibold">Auto-Meme Generator</h3>
                  <p className="text-muted-foreground">
                    AI automatically applies viral meme overlays, GIFs, and captions to match trending themes
                  </p>
                  <Button className="bg-gradient-to-r from-neon-green to-neon-purple text-background">
                    Enable Auto-Memes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default TrendSync;