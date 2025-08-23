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
import { Sparkles, Brain, Wand2, Zap, Play, Download, Share, Eye, Settings, Lightbulb, Scissors, Target, BookOpen, Crop, Clapperboard, Type, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout/Layout";

interface AIProject {
  id: string;
  name: string;
  type: 'script-to-video' | 'voice-clone-video' | 'trend-analysis' | 'viral-optimizer' | 'smart-analysis';
  status: 'generating' | 'ready' | 'failed';
  config: any;
  output?: any;
  created_at: string;
}

interface ViralMoment {
  timestamp: number;
  duration: number;
  confidence: number;
  type: string;
  description: string;
  suggested_cut: {
    start: number;
    end: number;
    title?: string;
  };
  viral_score: number;
}

interface ChapterSegment {
  start_time: number;
  end_time: number;
  title: string;
  topic: string;
  summary: string;
  key_points: string[];
  viral_potential: number;
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

  const [smartAnalysis, setSmartAnalysis] = useState({
    video_url: "",
    analysis_type: "all" as "viral_moments" | "wow_detector" | "chapter_split" | "all",
    sensitivity: "medium" as "low" | "medium" | "high",
    min_segment_duration: 30,
    max_segments: 5
  });

  const [videoEnhancement, setVideoEnhancement] = useState({
    video_url: "",
    enhancement_type: "all" as "face_crop" | "jump_cut_cleanup" | "animated_captions" | "all",
    target_aspect_ratio: "9:16" as "9:16" | "16:9" | "1:1" | "4:5",
    brand_color: "#3B82F6",
    animation_style: "pop" as "pop" | "slide" | "fade" | "bounce",
    remove_filler_words: true,
    add_emojis: true,
    highlight_keywords: true
  });

  const [enhancementResults, setEnhancementResults] = useState<any | null>(null);

  const [brandingSettings, setBrandingSettings] = useState({
    logo_url: "",
    watermark_position: "bottom-right" as "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center",
    brand_colors: {
      primary: "#3B82F6",
      secondary: "#10B981", 
      accent: "#F59E0B"
    },
    fonts: {
      heading: "Inter",
      body: "Inter", 
      caption: "Inter"
    },
    template_name: "",
    make_public: false,
    template_price: 0
  });

  const [brandTemplates, setBrandTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const [analysisResults, setAnalysisResults] = useState<{
    viral_moments?: ViralMoment[];
    wow_moments?: ViralMoment[];
    chapters?: ChapterSegment[];
    analysis_summary?: any;
  } | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
    loadBrandTemplates();
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
      },
      {
        id: "3",
        name: "Viral Moment Analysis",
        type: "smart-analysis",
        status: "ready",
        config: { sensitivity: "medium", analysis_type: "all" },
        output: { 
          viral_moments: 5, 
          wow_moments: 2, 
          chapters: 3,
          analysis_summary: { total_viral_moments: 7, avg_viral_score: 8.4 }
        },
        created_at: new Date().toISOString()
      },
      {
        id: "4",
        name: "TikTok Enhancement",
        type: "smart-analysis",
        status: "ready",
        config: { enhancement_type: "all", target_aspect_ratio: "9:16" },
        output: { 
          face_crop_data: { faces_detected: 1, aspect_ratio_optimized: "9:16" },
          jump_cut_data: { cuts_made: 18, time_saved_seconds: 32.4 },
          caption_data: { captions_generated: 67, sync_accuracy: 0.95 }
        },
        created_at: new Date().toISOString()
      }
    ];
    setProjects(mockProjects);
  };

  const loadBrandTemplates = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('brand-manager', {
        body: { action: 'get_templates' }
      });

      if (error) throw error;
      setBrandTemplates([
        ...(data.user_templates || []),
        ...(data.public_templates || [])
      ]);
    } catch (error) {
      console.error('Error loading brand templates:', error);
    }
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

  const runVideoEnhancement = async () => {
    if (!videoEnhancement.video_url.trim()) {
      toast({
        title: "Missing Video URL",
        description: "Please provide a video URL to enhance",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setCurrentProject("video-enhancement");

    try {
      const { data, error } = await supabase.functions.invoke('video-enhancer', {
        body: {
          video_url: videoEnhancement.video_url,
          enhancement_type: videoEnhancement.enhancement_type,
          options: {
            target_aspect_ratio: videoEnhancement.target_aspect_ratio,
            face_padding: 0.2,
            tracking_smoothness: 'medium',
            silence_threshold: -40,
            min_pause_duration: 0.8,
            remove_filler_words: videoEnhancement.remove_filler_words,
            keep_natural_pauses: true,
            brand_color: videoEnhancement.brand_color,
            animation_style: videoEnhancement.animation_style,
            add_emojis: videoEnhancement.add_emojis,
            highlight_keywords: videoEnhancement.highlight_keywords,
            caption_position: 'bottom'
          }
        }
      });

      if (error) throw error;

      setEnhancementResults(data);

      toast({
        title: "Enhancement Complete",
        description: "Your video has been enhanced with AI features",
      });

      // Add to projects
      const newProject: AIProject = {
        id: Date.now().toString(),
        name: `Video Enhancement ${Date.now()}`,
        type: "smart-analysis",
        status: "ready",
        config: videoEnhancement,
        output: data,
        created_at: new Date().toISOString()
      };

      setProjects(prev => [newProject, ...prev]);

    } catch (error: any) {
      console.error('Video enhancement error:', error);
      toast({
        title: "Enhancement Failed",
        description: error.message || "Failed to enhance video",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setCurrentProject(null);
    }
  };

  const runSmartAnalysis = async () => {
    if (!smartAnalysis.video_url.trim()) {
      toast({
        title: "Missing Video URL",
        description: "Please provide a video URL to analyze",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setCurrentProject("smart-analysis");

    try {
      const { data, error } = await supabase.functions.invoke('viral-moment-detector', {
        body: {
          video_url: smartAnalysis.video_url,
          analysis_type: smartAnalysis.analysis_type,
          options: {
            sensitivity: smartAnalysis.sensitivity,
            min_segment_duration: smartAnalysis.min_segment_duration,
            max_segments: smartAnalysis.max_segments,
            include_audio_analysis: true,
            include_visual_analysis: true
          }
        }
      });

      if (error) throw error;

      setAnalysisResults(data);

      toast({
        title: "Analysis Complete",
        description: `Found ${(data.viral_moments?.length || 0) + (data.wow_moments?.length || 0)} viral moments and ${data.chapters?.length || 0} chapters`,
      });

      // Add to projects
      const newProject: AIProject = {
        id: Date.now().toString(),
        name: `Smart Analysis ${Date.now()}`,
        type: "smart-analysis",
        status: "ready",
        config: smartAnalysis,
        output: data,
        created_at: new Date().toISOString()
      };

      setProjects(prev => [newProject, ...prev]);

    } catch (error: any) {
      console.error('Smart analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze video",
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

        <Tabs defaultValue="brand-studio" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="script-to-video">Script → Video</TabsTrigger>
            <TabsTrigger value="viral-optimizer">Viral Optimizer</TabsTrigger>
            <TabsTrigger value="smart-analysis">Smart Analysis</TabsTrigger>
            <TabsTrigger value="video-enhancer">Video Enhancer</TabsTrigger>
            <TabsTrigger value="brand-studio">Brand Studio</TabsTrigger>
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

          {/* Smart Analysis Tab */}
          <TabsContent value="smart-analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Smart Video Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="analysis-video-url">Video URL</Label>
                    <Input
                      id="analysis-video-url"
                      placeholder="https://... or upload video file"
                      value={smartAnalysis.video_url}
                      onChange={(e) => setSmartAnalysis(prev => ({ ...prev, video_url: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Analysis Type</Label>
                    <Select
                      value={smartAnalysis.analysis_type}
                      onValueChange={(value: any) => setSmartAnalysis(prev => ({ ...prev, analysis_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Complete Analysis</SelectItem>
                        <SelectItem value="viral_moments">Viral Moments Only</SelectItem>
                        <SelectItem value="wow_detector">Wow Moments Only</SelectItem>
                        <SelectItem value="chapter_split">Chapter Splitting Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Detection Sensitivity</Label>
                      <Select
                        value={smartAnalysis.sensitivity}
                        onValueChange={(value: any) => setSmartAnalysis(prev => ({ ...prev, sensitivity: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High (Strict)</SelectItem>
                          <SelectItem value="medium">Medium (Balanced)</SelectItem>
                          <SelectItem value="low">Low (Permissive)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Max Segments</Label>
                      <Select
                        value={smartAnalysis.max_segments.toString()}
                        onValueChange={(value) => setSmartAnalysis(prev => ({ ...prev, max_segments: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 segments</SelectItem>
                          <SelectItem value="5">5 segments</SelectItem>
                          <SelectItem value="8">8 segments</SelectItem>
                          <SelectItem value="10">10 segments</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg space-y-3">
                    <h4 className="font-medium flex items-center space-x-2">
                      <Scissors className="h-4 w-4" />
                      <span>What We Detect</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                      <div className="space-y-1">
                        <p>• Laughter & reactions</p>
                        <p>• Hype words & energy spikes</p>
                        <p>• Jaw-drop moments</p>
                      </div>
                      <div className="space-y-1">
                        <p>• Topic changes</p>
                        <p>• Audience engagement</p>
                        <p>• Viral-worthy cuts</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={runSmartAnalysis}
                    disabled={!smartAnalysis.video_url.trim() || (isGenerating && currentProject === "smart-analysis")}
                    className="w-full bg-gradient-to-r from-neon-purple to-neon-green text-background"
                    size="lg"
                  >
                    {isGenerating && currentProject === "smart-analysis" ? (
                      <>
                        <Zap className="h-5 w-5 mr-2 animate-spin" />
                        Analyzing Video...
                      </>
                    ) : (
                      <>
                        <Target className="h-5 w-5 mr-2" />
                        Start Smart Analysis
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Analysis Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisResults ? (
                    <div className="space-y-6">
                      {/* Summary */}
                      {analysisResults.analysis_summary && (
                        <div className="bg-gradient-to-r from-neon-purple/10 to-neon-green/10 p-4 rounded-lg">
                          <h4 className="font-medium mb-3">Analysis Summary</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Viral Moments</p>
                              <p className="font-medium text-lg">{analysisResults.analysis_summary.total_viral_moments}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Avg. Score</p>
                              <p className="font-medium text-lg">{analysisResults.analysis_summary.avg_viral_score}/10</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Viral Moments */}
                      {analysisResults.viral_moments && analysisResults.viral_moments.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center space-x-2">
                            <Zap className="h-4 w-4" />
                            <span>Viral Moments ({analysisResults.viral_moments.length})</span>
                          </h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {analysisResults.viral_moments.map((moment, idx) => (
                              <div key={idx} className="p-3 border rounded text-sm space-y-1">
                                <div className="flex justify-between items-start">
                                  <p className="font-medium">{moment.suggested_cut.title}</p>
                                  <Badge variant="secondary" className="text-xs">
                                    {moment.viral_score}/10
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground text-xs">{moment.description}</p>
                                <p className="text-xs">
                                  <strong>Cut:</strong> {Math.floor(moment.suggested_cut.start)}s - {Math.floor(moment.suggested_cut.end)}s
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Wow Moments */}
                      {analysisResults.wow_moments && analysisResults.wow_moments.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center space-x-2">
                            <Eye className="h-4 w-4" />
                            <span>Wow Moments ({analysisResults.wow_moments.length})</span>
                          </h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {analysisResults.wow_moments.map((moment, idx) => (
                              <div key={idx} className="p-3 border rounded text-sm space-y-1">
                                <div className="flex justify-between items-start">
                                  <p className="font-medium">{moment.suggested_cut.title}</p>
                                  <Badge variant="secondary" className="text-xs">
                                    {moment.viral_score}/10
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground text-xs">{moment.description}</p>
                                <p className="text-xs">
                                  <strong>Cut:</strong> {Math.floor(moment.suggested_cut.start)}s - {Math.floor(moment.suggested_cut.end)}s
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Chapters */}
                      {analysisResults.chapters && analysisResults.chapters.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center space-x-2">
                            <BookOpen className="h-4 w-4" />
                            <span>Chapter Segments ({analysisResults.chapters.length})</span>
                          </h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {analysisResults.chapters.map((chapter, idx) => (
                              <div key={idx} className="p-3 border rounded text-sm space-y-2">
                                <div className="flex justify-between items-start">
                                  <p className="font-medium">{chapter.title}</p>
                                  <Badge variant="outline" className="text-xs">
                                    {chapter.viral_potential}/10
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground text-xs">{chapter.summary}</p>
                                <p className="text-xs">
                                  <strong>Duration:</strong> {Math.floor(chapter.start_time)}s - {Math.floor(chapter.end_time)}s
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 space-y-4">
                      <Target className="h-16 w-16 text-primary mx-auto" />
                      <div className="space-y-2">
                        <p className="text-muted-foreground">
                          Upload a video to analyze viral moments
                        </p>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>✨ Auto-detect laughter & hype words</p>
                          <p>🔥 Find wow moments & reactions</p>
                          <p>📚 Smart chapter splitting by topic</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Video Enhancer Tab */}
          <TabsContent value="video-enhancer" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clapperboard className="h-5 w-5" />
                    <span>AI Video Enhancer</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="enhance-video-url">Video URL</Label>
                    <Input
                      id="enhance-video-url"
                      placeholder="https://... or upload video file"
                      value={videoEnhancement.video_url}
                      onChange={(e) => setVideoEnhancement(prev => ({ ...prev, video_url: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Enhancement Type</Label>
                    <Select
                      value={videoEnhancement.enhancement_type}
                      onValueChange={(value: any) => setVideoEnhancement(prev => ({ ...prev, enhancement_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Complete Enhancement</SelectItem>
                        <SelectItem value="face_crop">Face Auto-Crop Only</SelectItem>
                        <SelectItem value="jump_cut_cleanup">Jump Cut Cleanup Only</SelectItem>
                        <SelectItem value="animated_captions">Animated Captions Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target Format</Label>
                      <Select
                        value={videoEnhancement.target_aspect_ratio}
                        onValueChange={(value: any) => setVideoEnhancement(prev => ({ ...prev, target_aspect_ratio: value }))}
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

                    <div className="space-y-2">
                      <Label>Caption Animation</Label>
                      <Select
                        value={videoEnhancement.animation_style}
                        onValueChange={(value: any) => setVideoEnhancement(prev => ({ ...prev, animation_style: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pop">Pop Animation</SelectItem>
                          <SelectItem value="slide">Slide In</SelectItem>
                          <SelectItem value="fade">Fade In</SelectItem>
                          <SelectItem value="bounce">Bounce</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brand-color">Brand Color</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="brand-color"
                        type="color"
                        value={videoEnhancement.brand_color}
                        onChange={(e) => setVideoEnhancement(prev => ({ ...prev, brand_color: e.target.value }))}
                        className="w-16 h-10"
                      />
                      <Input
                        placeholder="#3B82F6"
                        value={videoEnhancement.brand_color}
                        onChange={(e) => setVideoEnhancement(prev => ({ ...prev, brand_color: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg space-y-3">
                    <h4 className="font-medium flex items-center space-x-2">
                      <Clapperboard className="h-4 w-4" />
                      <span>Enhancement Features</span>
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Crop className="h-4 w-4" />
                          <span className="text-sm">Face Auto-Crop & Center</span>
                        </div>
                        <Badge variant="secondary">AI Tracking</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Scissors className="h-4 w-4" />
                          <span className="text-sm">Remove Filler Words</span>
                        </div>
                        <label className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={videoEnhancement.remove_filler_words}
                            onChange={(e) => setVideoEnhancement(prev => ({ ...prev, remove_filler_words: e.target.checked }))}
                            className="rounded"
                          />
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Type className="h-4 w-4" />
                          <span className="text-sm">Add Emojis</span>
                        </div>
                        <label className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={videoEnhancement.add_emojis}
                            onChange={(e) => setVideoEnhancement(prev => ({ ...prev, add_emojis: e.target.checked }))}
                            className="rounded"
                          />
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Lightbulb className="h-4 w-4" />
                          <span className="text-sm">Highlight Keywords</span>
                        </div>
                        <label className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={videoEnhancement.highlight_keywords}
                            onChange={(e) => setVideoEnhancement(prev => ({ ...prev, highlight_keywords: e.target.checked }))}
                            className="rounded"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={runVideoEnhancement}
                    disabled={!videoEnhancement.video_url.trim() || (isGenerating && currentProject === "video-enhancement")}
                    className="w-full bg-gradient-to-r from-neon-purple to-neon-green text-background"
                    size="lg"
                  >
                    {isGenerating && currentProject === "video-enhancement" ? (
                      <>
                        <Zap className="h-5 w-5 mr-2 animate-spin" />
                        Enhancing Video...
                      </>
                    ) : (
                      <>
                        <Clapperboard className="h-5 w-5 mr-2" />
                        Enhance Video
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Enhancement Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {enhancementResults ? (
                    <div className="space-y-6">
                      {/* Enhanced Video Preview */}
                      <div className="bg-gradient-to-r from-neon-purple/10 to-neon-green/10 p-4 rounded-lg">
                        <h4 className="font-medium mb-3 flex items-center space-x-2">
                          <Play className="h-4 w-4" />
                          <span>Enhanced Video Ready</span>
                        </h4>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            Video enhanced with AI features
                          </p>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                            <Button size="sm" variant="outline">
                              <Share className="h-4 w-4 mr-1" />
                              Share
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Face Crop Results */}
                      {enhancementResults.face_crop_data && (
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center space-x-2">
                            <Crop className="h-4 w-4" />
                            <span>Face Auto-Crop</span>
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="p-3 border rounded">
                              <p className="text-muted-foreground">Faces Detected</p>
                              <p className="font-medium text-lg">{enhancementResults.face_crop_data.faces_detected}</p>
                            </div>
                            <div className="p-3 border rounded">
                              <p className="text-muted-foreground">Optimized For</p>
                              <p className="font-medium">{enhancementResults.face_crop_data.aspect_ratio_optimized}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {enhancementResults.face_crop_data.crop_coordinates.length} tracking points applied
                          </p>
                        </div>
                      )}

                      {/* Jump Cut Results */}
                      {enhancementResults.jump_cut_data && (
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center space-x-2">
                            <Scissors className="h-4 w-4" />
                            <span>Jump Cut Cleanup</span>
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="p-3 border rounded">
                              <p className="text-muted-foreground">Cuts Made</p>
                              <p className="font-medium text-lg">{enhancementResults.jump_cut_data.cuts_made}</p>
                            </div>
                            <div className="p-3 border rounded">
                              <p className="text-muted-foreground">Time Saved</p>
                              <p className="font-medium">{enhancementResults.jump_cut_data.time_saved_seconds}s</p>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>✂️ Removed {enhancementResults.jump_cut_data.segments_removed.filter((s: any) => s.type === 'silence').length} silent pauses</p>
                            <p>🗣️ Cleaned {enhancementResults.jump_cut_data.segments_removed.filter((s: any) => s.type === 'filler_word').length} filler words</p>
                          </div>
                        </div>
                      )}

                      {/* Caption Results */}
                      {enhancementResults.caption_data && (
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center space-x-2">
                            <Type className="h-4 w-4" />
                            <span>Animated Captions</span>
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="p-3 border rounded">
                              <p className="text-muted-foreground">Captions Generated</p>
                              <p className="font-medium text-lg">{enhancementResults.caption_data.captions_generated}</p>
                            </div>
                            <div className="p-3 border rounded">
                              <p className="text-muted-foreground">Sync Accuracy</p>
                              <p className="font-medium">{Math.round(enhancementResults.caption_data.sync_accuracy * 100)}%</p>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>✨ {enhancementResults.caption_data.animations_applied} animations applied</p>
                            <p>📱 Optimized for {videoEnhancement.target_aspect_ratio} format</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 space-y-4">
                      <Clapperboard className="h-16 w-16 text-primary mx-auto" />
                      <div className="space-y-2">
                        <p className="text-muted-foreground">
                          Upload a video to enhance with AI
                        </p>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>🎯 Face auto-crop & centering</p>
                          <p>✂️ Remove pauses & filler words</p>
                          <p>✨ Brand-colored animated captions</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Brand Studio Tab */}
          <TabsContent value="brand-studio" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Palette className="h-5 w-5" />
                    <span>Brand Studio</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Quick Apply Template</h4>
                    <Select
                      value={selectedTemplate}
                      onValueChange={setSelectedTemplate}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a brand template" />
                      </SelectTrigger>
                      <SelectContent>
                        {brandTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} {template.is_public ? '(Public)' : '(Yours)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Create Custom Brand</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="logo-url">Logo URL</Label>
                      <Input
                        id="logo-url"
                        placeholder="https://... (your brand logo)"
                        value={brandingSettings.logo_url}
                        onChange={(e) => setBrandingSettings(prev => ({ ...prev, logo_url: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Watermark Position</Label>
                      <Select
                        value={brandingSettings.watermark_position}
                        onValueChange={(value: any) => setBrandingSettings(prev => ({ ...prev, watermark_position: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top-left">Top Left</SelectItem>
                          <SelectItem value="top-right">Top Right</SelectItem>
                          <SelectItem value="bottom-left">Bottom Left</SelectItem>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label>Brand Colors</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Primary</Label>
                          <div className="flex space-x-2">
                            <input
                              type="color"
                              value={brandingSettings.brand_colors.primary}
                              onChange={(e) => setBrandingSettings(prev => ({
                                ...prev,
                                brand_colors: { ...prev.brand_colors, primary: e.target.value }
                              }))}
                              className="w-8 h-8 rounded border"
                            />
                            <Input
                              value={brandingSettings.brand_colors.primary}
                              onChange={(e) => setBrandingSettings(prev => ({
                                ...prev,
                                brand_colors: { ...prev.brand_colors, primary: e.target.value }
                              }))}
                              className="text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Secondary</Label>
                          <div className="flex space-x-2">
                            <input
                              type="color"
                              value={brandingSettings.brand_colors.secondary}
                              onChange={(e) => setBrandingSettings(prev => ({
                                ...prev,
                                brand_colors: { ...prev.brand_colors, secondary: e.target.value }
                              }))}
                              className="w-8 h-8 rounded border"
                            />
                            <Input
                              value={brandingSettings.brand_colors.secondary}
                              onChange={(e) => setBrandingSettings(prev => ({
                                ...prev,
                                brand_colors: { ...prev.brand_colors, secondary: e.target.value }
                              }))}
                              className="text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Accent</Label>
                          <div className="flex space-x-2">
                            <input
                              type="color"
                              value={brandingSettings.brand_colors.accent}
                              onChange={(e) => setBrandingSettings(prev => ({
                                ...prev,
                                brand_colors: { ...prev.brand_colors, accent: e.target.value }
                              }))}
                              className="w-8 h-8 rounded border"
                            />
                            <Input
                              value={brandingSettings.brand_colors.accent}
                              onChange={(e) => setBrandingSettings(prev => ({
                                ...prev,
                                brand_colors: { ...prev.brand_colors, accent: e.target.value }
                              }))}
                              className="text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Brand Fonts</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Heading</Label>
                          <Select
                            value={brandingSettings.fonts.heading}
                            onValueChange={(value) => setBrandingSettings(prev => ({
                              ...prev,
                              fonts: { ...prev.fonts, heading: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Inter">Inter</SelectItem>
                              <SelectItem value="Roboto">Roboto</SelectItem>
                              <SelectItem value="Open Sans">Open Sans</SelectItem>
                              <SelectItem value="Poppins">Poppins</SelectItem>
                              <SelectItem value="Montserrat">Montserrat</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Body</Label>
                          <Select
                            value={brandingSettings.fonts.body}
                            onValueChange={(value) => setBrandingSettings(prev => ({
                              ...prev,
                              fonts: { ...prev.fonts, body: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Inter">Inter</SelectItem>
                              <SelectItem value="Roboto">Roboto</SelectItem>
                              <SelectItem value="Open Sans">Open Sans</SelectItem>
                              <SelectItem value="Source Sans Pro">Source Sans Pro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Caption</Label>
                          <Select
                            value={brandingSettings.fonts.caption}
                            onValueChange={(value) => setBrandingSettings(prev => ({
                              ...prev,
                              fonts: { ...prev.fonts, caption: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Inter">Inter</SelectItem>
                              <SelectItem value="Roboto">Roboto</SelectItem>
                              <SelectItem value="Arial">Arial</SelectItem>
                              <SelectItem value="Helvetica">Helvetica</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Save as Template</h4>
                    <div className="space-y-3">
                      <Input
                        placeholder="Template name (optional)"
                        value={brandingSettings.template_name}
                        onChange={(e) => setBrandingSettings(prev => ({ ...prev, template_name: e.target.value }))}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="make-public"
                            checked={brandingSettings.make_public}
                            onChange={(e) => setBrandingSettings(prev => ({ ...prev, make_public: e.target.checked }))}
                            className="rounded"
                          />
                          <Label htmlFor="make-public" className="text-sm">Share publicly</Label>
                        </div>
                        {brandingSettings.make_public && (
                          <Input
                            type="number"
                            placeholder="$0"
                            min="0"
                            step="0.01"
                            value={brandingSettings.template_price}
                            onChange={(e) => setBrandingSettings(prev => ({ ...prev, template_price: parseFloat(e.target.value) || 0 }))}
                            className="w-20"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={async () => {
                        try {
                          const { data, error } = await supabase.functions.invoke('brand-manager', {
                            body: {
                              action: 'create_template',
                              brand_config: {
                                logo_url: brandingSettings.logo_url,
                                watermark_position: brandingSettings.watermark_position,
                                brand_colors: brandingSettings.brand_colors,
                                fonts: brandingSettings.fonts
                              },
                              template_data: {
                                name: brandingSettings.template_name || 'My Brand Template',
                                is_public: brandingSettings.make_public,
                                price: brandingSettings.template_price
                              }
                            }
                          });

                          if (error) throw error;

                          toast({
                            title: "Template Saved",
                            description: "Your brand template has been saved",
                          });

                          loadBrandTemplates();
                        } catch (error: any) {
                          toast({
                            title: "Save Failed",
                            description: error.message,
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      Save Template
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-neon-purple to-neon-green text-background"
                      onClick={async () => {
                        try {
                          const { data, error } = await supabase.functions.invoke('brand-manager', {
                            body: {
                              action: 'apply_watermark',
                              video_url: 'https://example.com/video.mp4',
                              brand_config: {
                                logo_url: brandingSettings.logo_url,
                                watermark_position: brandingSettings.watermark_position,
                                opacity: 0.8,
                                size: 'medium',
                                brand_colors: brandingSettings.brand_colors
                              }
                            }
                          });

                          if (error) throw error;

                          toast({
                            title: "Brand Applied",
                            description: "Your branding has been applied to the video",
                          });
                        } catch (error: any) {
                          toast({
                            title: "Application Failed",
                            description: error.message,
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      Apply Branding
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Brand Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="aspect-video bg-muted rounded-lg relative overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <div className="text-2xl font-bold" style={{ fontFamily: brandingSettings.fonts.heading }}>
                            Your Video Title
                          </div>
                          <div className="text-sm text-muted-foreground" style={{ fontFamily: brandingSettings.fonts.body }}>
                            Video content preview
                          </div>
                        </div>
                      </div>
                      
                      {/* Watermark Preview */}
                      {brandingSettings.logo_url && (
                        <div 
                          className={`absolute w-16 h-8 bg-white/90 backdrop-blur rounded flex items-center justify-center text-xs font-medium ${
                            brandingSettings.watermark_position === 'top-left' ? 'top-2 left-2' :
                            brandingSettings.watermark_position === 'top-right' ? 'top-2 right-2' :
                            brandingSettings.watermark_position === 'bottom-left' ? 'bottom-2 left-2' :
                            brandingSettings.watermark_position === 'bottom-right' ? 'bottom-2 right-2' :
                            'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
                          }`}
                          style={{ color: brandingSettings.brand_colors.primary }}
                        >
                          LOGO
                        </div>
                      )}

                      {/* Caption Preview */}
                      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded text-sm text-center">
                        <span 
                          style={{ 
                            fontFamily: brandingSettings.fonts.caption,
                            color: brandingSettings.brand_colors.accent 
                          }}
                        >
                          Sample caption text
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Color Palette</h4>
                        <div className="flex space-x-2">
                          <div
                            className="w-12 h-12 rounded border-2 border-white shadow flex items-center justify-center text-white text-xs font-medium"
                            style={{ backgroundColor: brandingSettings.brand_colors.primary }}
                          >
                            1°
                          </div>
                          <div
                            className="w-12 h-12 rounded border-2 border-white shadow flex items-center justify-center text-white text-xs font-medium"
                            style={{ backgroundColor: brandingSettings.brand_colors.secondary }}
                          >
                            2°
                          </div>
                          <div
                            className="w-12 h-12 rounded border-2 border-white shadow flex items-center justify-center text-white text-xs font-medium"
                            style={{ backgroundColor: brandingSettings.brand_colors.accent }}
                          >
                            Acc
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Typography</h4>
                        <div className="space-y-1 text-sm">
                          <p style={{ fontFamily: brandingSettings.fonts.heading }}>
                            <strong>Heading:</strong> {brandingSettings.fonts.heading}
                          </p>
                          <p style={{ fontFamily: brandingSettings.fonts.body }}>
                            <strong>Body:</strong> {brandingSettings.fonts.body}
                          </p>
                          <p style={{ fontFamily: brandingSettings.fonts.caption }}>
                            <strong>Caption:</strong> {brandingSettings.fonts.caption}
                          </p>
                        </div>
                      </div>

                      {brandTemplates.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Your Templates</h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {brandTemplates.slice(0, 3).map((template) => (
                              <div key={template.id} className="flex items-center justify-between p-2 border rounded text-sm">
                                <span>{template.name}</span>
                                <Badge variant={template.is_public ? "default" : "outline"}>
                                  {template.is_public ? 'Public' : 'Private'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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