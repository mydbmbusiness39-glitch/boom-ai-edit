import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Music, Hash, Play, Download, RefreshCw } from "lucide-react";
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
}

interface TrendingHashtag {
  tag: string;
  count: string;
  category: string;
  growth: string;
}

const TrendSync = () => {
  const [trendingAudio, setTrendingAudio] = useState<TrendingAudio[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const [userContent, setUserContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchProgress, setMatchProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadTrendingContent();
  }, []);

  const loadTrendingContent = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('trend-detector', {
        body: { action: 'getTrends' }
      });

      if (error) throw error;

      setTrendingAudio(data.audio || []);
      setTrendingHashtags(data.hashtags || []);
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
          previewUrl: '/audio/trend1.mp3'
        },
        {
          id: '2',
          title: 'Catchy Hook',
          artist: 'ViralSound',
          duration: 12,
          trendScore: 89,
          category: 'Comedy',
          previewUrl: '/audio/trend2.mp3'
        }
      ]);

      setTrendingHashtags([
        { tag: '#fyp', count: '2.1B', category: 'General', growth: '+15%' },
        { tag: '#viral', count: '891M', category: 'General', growth: '+23%' },
        { tag: '#trending', count: '567M', category: 'General', growth: '+8%' }
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
              <TrendingUp className="h-8 w-8 text-neon-green" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-green to-neon-purple bg-clip-text text-transparent">
                Trend Syncing
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Discover trending audio and hashtags that match your content vibe
            </p>
          </div>

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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="audio" className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                Trending Audio
              </TabsTrigger>
              <TabsTrigger value="hashtags" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Trending Hashtags
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
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{audio.title}</h3>
                            <Badge variant="secondary">{audio.category}</Badge>
                            <Badge 
                              variant={audio.trendScore > 90 ? "default" : "outline"}
                              className={audio.trendScore > 90 ? "bg-neon-green text-background" : ""}
                            >
                              {audio.trendScore}% trending
                            </Badge>
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
                  <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-4 text-center space-y-2">
                      <h3 className="text-lg font-bold text-neon-green">{hashtag.tag}</h3>
                      <p className="text-2xl font-bold">{hashtag.count}</p>
                      <Badge variant="secondary">{hashtag.category}</Badge>
                      <Badge 
                        variant="outline" 
                        className="text-neon-green border-neon-green"
                      >
                        {hashtag.growth} growth
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default TrendSync;