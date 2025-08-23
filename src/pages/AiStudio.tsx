import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Brain, Wand2, Zap, Play, Download, Share, Eye, Settings, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout/Layout";

interface AIProject {
  id: string;
  name: string;
  type: 'script-to-video' | 'voice-clone-video' | 'trend-analysis' | 'viral-optimizer';
  status: 'generating' | 'ready' | 'failed';
  config: any;
  output?: any;
  created_at: string;
}

const AiStudio = () => {
  const [projects, setProjects] = useState<AIProject[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProject, setCurrentProject] = useState<string | null>(null);

  const [scriptToVideo, setScriptToVideo] = useState({
    script: "",
    style: "cinematic",
    duration: 30,
    aspect_ratio: "9:16",
    voice_model: "",
    background_music: true
  });

  const [viralOptimizer, setViralOptimizer] = useState({
    video_url: "",
    target_platforms: ["tiktok", "youtube-shorts"],
    optimization_goals: ["engagement", "reach"],
    trend_analysis: true
  });

  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    // Mock data for demo - in real app would load from database
    const mockProjects: AIProject[] = [
      {
        id: "1",
        name: "Gaming Highlight Reel",
        type: "script-to-video",
        status: "ready",
        config: { style: "gaming", duration: 60 },
        output: { video_url: "#", views_prediction: 15000 },
        created_at: new Date().toISOString()
      },
      {
        id: "2", 
        name: "Product Launch Video",
        type: "voice-clone-video",
        status: "generating",
        config: { voice: "professional", style: "corporate" },
        created_at: new Date().toISOString()
      }
    ];
    setProjects(mockProjects);
  };

  const generateScriptToVideo = async () => {
    if (!scriptToVideo.script.trim()) {
      toast({
        title: "Missing Script",
        description: "Please provide a script for the video",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setCurrentProject("script-to-video");

    try {
      const { data, error } = await supabase.functions.invoke('ai-script-to-video', {
        body: {
          script: scriptToVideo.script,
          style: scriptToVideo.style,
          duration: scriptToVideo.duration,
          aspectRatio: scriptToVideo.aspect_ratio,
          voiceModel: scriptToVideo.voice_model,
          backgroundMusic: scriptToVideo.background_music
        }
      });

      if (error) throw error;

      toast({
        title: "Video Generation Started",
        description: "Your AI video is being created. This may take several minutes.",
      });

      // Add to projects
      const newProject: AIProject = {
        id: Date.now().toString(),
        name: `Script Video ${Date.now()}`,
        type: "script-to-video",
        status: "generating",
        config: scriptToVideo,
        created_at: new Date().toISOString()
      };

      setProjects(prev => [newProject, ...prev]);

      // Reset form
      setScriptToVideo({
        script: "",
        style: "cinematic",
        duration: 30,
        aspect_ratio: "9:16",
        voice_model: "",
        background_music: true
      });

    } catch (error: any) {
      console.error('Script to video error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate video",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setCurrentProject(null);
    }
  };

  const runViralOptimizer = async () => {
    if (!viralOptimizer.video_url.trim()) {
      toast({
        title: "Missing Video URL",
        description: "Please provide a video URL to optimize",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setCurrentProject("viral-optimizer");

    try {
      const { data, error } = await supabase.functions.invoke('viral-optimizer', {
        body: viralOptimizer
      });

      if (error) throw error;

      toast({
        title: "Viral Analysis Started",
        description: "Analyzing your video for viral potential and optimization suggestions.",
      });

      // Add to projects
      const newProject: AIProject = {
        id: Date.now().toString(),
        name: `Viral Analysis ${Date.now()}`,
        type: "viral-optimizer",
        status: "generating",
        config: viralOptimizer,
        created_at: new Date().toISOString()
      };

      setProjects(prev => [newProject, ...prev]);

    } catch (error: any) {
      console.error('Viral optimizer error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to run viral analysis",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setCurrentProject(null);
    }
  };

  const styles = [
    { value: "cinematic", label: "Cinematic" },
    { value: "gaming", label: "Gaming" },
    { value: "lifestyle", label: "Lifestyle" },
    { value: "corporate", label: "Corporate" },
    { value: "anime", label: "Anime" },
    { value: "realistic", label: "Realistic" },
    { value: "cartoon", label: "Cartoon" },
    { value: "cyberpunk", label: "Cyberpunk" }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'generating': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Layout>
      <div className="container max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Brain className="h-8 w-8 text-neon-purple" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
              AI Studio
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Advanced AI-powered video creation, optimization, and trend analysis
          </p>
        </div>

        <Tabs defaultValue="script-to-video" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="script-to-video">Script → Video</TabsTrigger>
            <TabsTrigger value="viral-optimizer">Viral Optimizer</TabsTrigger>
            <TabsTrigger value="trend-analyzer">Trend Analyzer</TabsTrigger>
            <TabsTrigger value="projects">AI Projects</TabsTrigger>
          </TabsList>

          {/* Script to Video Tab */}
          <TabsContent value="script-to-video" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Wand2 className="h-5 w-5" />
                    <span>Script to Video Generator</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="script">Video Script</Label>
                    <Textarea
                      id="script"
                      placeholder="Enter your video script here. Describe scenes, dialogue, and visual elements..."
                      value={scriptToVideo.script}
                      onChange={(e) => setScriptToVideo(prev => ({ ...prev, script: e.target.value }))}
                      className="min-h-[150px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      {scriptToVideo.script.length} characters • Estimated: {Math.ceil(scriptToVideo.script.length / 10)} seconds
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Visual Style</Label>
                      <Select
                        value={scriptToVideo.style}
                        onValueChange={(value) => setScriptToVideo(prev => ({ ...prev, style: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {styles.map((style) => (
                            <SelectItem key={style.value} value={style.value}>
                              {style.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Duration (seconds)</Label>
                      <Select
                        value={scriptToVideo.duration.toString()}
                        onValueChange={(value) => setScriptToVideo(prev => ({ ...prev, duration: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 seconds</SelectItem>
                          <SelectItem value="30">30 seconds</SelectItem>
                          <SelectItem value="60">60 seconds</SelectItem>
                          <SelectItem value="90">90 seconds</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Aspect Ratio</Label>
                    <Select
                      value={scriptToVideo.aspect_ratio}
                      onValueChange={(value) => setScriptToVideo(prev => ({ ...prev, aspect_ratio: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9:16">9:16 (TikTok/Shorts)</SelectItem>
                        <SelectItem value="16:9">16:9 (YouTube)</SelectItem>
                        <SelectItem value="1:1">1:1 (Instagram)</SelectItem>
                        <SelectItem value="4:5">4:5 (Instagram Post)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={generateScriptToVideo}
                    disabled={!scriptToVideo.script.trim() || (isGenerating && currentProject === "script-to-video")}
                    className="w-full bg-gradient-to-r from-neon-purple to-neon-green text-background"
                    size="lg"
                  >
                    {isGenerating && currentProject === "script-to-video" ? (
                      <>
                        <Zap className="h-5 w-5 mr-2 animate-spin" />
                        Generating Video...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-5 w-5 mr-2" />
                        Generate Video from Script
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AI Generation Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-[9/16] bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <Sparkles className="h-16 w-16 text-primary mx-auto" />
                      <p className="text-muted-foreground">
                        AI-generated video will appear here
                      </p>
                      {scriptToVideo.script && (
                        <div className="text-sm space-y-2">
                          <p><strong>Style:</strong> {scriptToVideo.style}</p>
                          <p><strong>Duration:</strong> {scriptToVideo.duration}s</p>
                          <p><strong>Aspect:</strong> {scriptToVideo.aspect_ratio}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Viral Optimizer Tab */}
          <TabsContent value="viral-optimizer" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5" />
                    <span>Viral Potential Optimizer</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="video-url">Video URL</Label>
                    <Input
                      id="video-url"
                      placeholder="https://... or upload video file"
                      value={viralOptimizer.video_url}
                      onChange={(e) => setViralOptimizer(prev => ({ ...prev, video_url: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Target Platforms</Label>
                    <div className="flex flex-wrap gap-2">
                      {["tiktok", "youtube-shorts", "instagram-reels", "twitter", "linkedin"].map((platform) => (
                        <Badge
                          key={platform}
                          variant={viralOptimizer.target_platforms.includes(platform) ? "default" : "outline"}
                          className="cursor-pointer capitalize"
                          onClick={() => {
                            const platforms = viralOptimizer.target_platforms.includes(platform)
                              ? viralOptimizer.target_platforms.filter(p => p !== platform)
                              : [...viralOptimizer.target_platforms, platform];
                            setViralOptimizer(prev => ({ ...prev, target_platforms: platforms }));
                          }}
                        >
                          {platform.replace('-', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Optimization Goals</Label>
                    <div className="flex flex-wrap gap-2">
                      {["engagement", "reach", "shares", "comments", "watch-time"].map((goal) => (
                        <Badge
                          key={goal}
                          variant={viralOptimizer.optimization_goals.includes(goal) ? "default" : "outline"}
                          className="cursor-pointer capitalize"
                          onClick={() => {
                            const goals = viralOptimizer.optimization_goals.includes(goal)
                              ? viralOptimizer.optimization_goals.filter(g => g !== goal)
                              : [...viralOptimizer.optimization_goals, goal];
                            setViralOptimizer(prev => ({ ...prev, optimization_goals: goals }));
                          }}
                        >
                          {goal.replace('-', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={runViralOptimizer}
                    disabled={!viralOptimizer.video_url.trim() || (isGenerating && currentProject === "viral-optimizer")}
                    className="w-full bg-gradient-to-r from-neon-purple to-neon-green text-background"
                    size="lg"
                  >
                    {isGenerating && currentProject === "viral-optimizer" ? (
                      <>
                        <Zap className="h-5 w-5 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="h-5 w-5 mr-2" />
                        Optimize for Viral Potential
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Optimization Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg text-center">
                      <Brain className="h-12 w-12 text-primary mx-auto mb-2" />
                      <p className="text-muted-foreground">
                        AI analysis results will appear here
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Viral Score</span>
                        <span className="font-medium">--/100</span>
                      </div>
                      <Progress value={0} className="h-2" />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h4 className="font-medium">Optimization Suggestions</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>• Upload a video to get AI suggestions</p>
                        <p>• Hook analysis and improvements</p>
                        <p>• Timing and pacing optimization</p>
                        <p>• Trending elements integration</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trend Analyzer Tab */}
          <TabsContent value="trend-analyzer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>AI Trend Analyzer</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 space-y-4">
                  <Brain className="h-16 w-16 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">Advanced Trend Analysis</h3>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    AI-powered analysis of current trends, hashtags, and viral patterns across all major platforms. 
                    Get insights on what's working now and predictions for upcoming trends.
                  </p>
                  <Button className="bg-gradient-to-r from-neon-purple to-neon-green text-background">
                    <Brain className="h-4 w-4 mr-2" />
                    Run Trend Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Studio Projects ({projects.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>No AI projects yet</p>
                    <p className="text-sm mt-2">Create your first AI-powered video</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map((project) => (
                      <div key={project.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h3 className="font-medium">{project.name}</h3>
                            <div className="flex items-center space-x-2">
                              <Badge className={`${getStatusColor(project.status)} text-white text-xs`}>
                                {project.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs capitalize">
                                {project.type.replace('-', ' ')}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(project.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {project.status === 'ready' && (
                              <>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4 mr-2" />
                                  Preview
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Share className="h-4 w-4 mr-2" />
                                  Share
                                </Button>
                              </>
                            )}
                            {project.status === 'generating' && (
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm text-muted-foreground">Generating...</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {project.output && (
                          <div className="bg-muted p-3 rounded text-sm space-y-1">
                            <p><strong>Performance Prediction:</strong> {project.output.views_prediction?.toLocaleString()} views</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AiStudio;