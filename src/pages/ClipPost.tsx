import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Zap, Upload, Scissors, Type, Palette, Send, CheckCircle, Clock, AlertCircle, Sparkles, Hash, Eye, Share2, TrendingUp, Briefcase, Camera, RefreshCw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout/Layout";

const ClipPost = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [clipSettings, setClipSettings] = useState({
    duration: 15,
    style: "viral",
    caption: "",
    platforms: [] as string[],
    hashtags: "",
    startTime: 0,
    enableAIOptimization: true,
    customDescription: ""
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "extracting" | "captioning" | "branding" | "uploading" | "complete">("idle");
  const [platformContent, setPlatformContent] = useState<{[key: string]: { hashtags: string; description: string; format: string }}>({});
  const [previewUrls, setPreviewUrls] = useState<{[key: string]: string}>({});
  const { toast } = useToast();

  const platforms = [
    { 
      id: "tiktok", 
      name: "TikTok", 
      icon: Camera,
      color: "bg-foreground text-background",
      format: "9:16 (1080x1920)",
      maxDuration: 60,
      description: "Vertical video optimized for mobile viewing"
    },
    { 
      id: "youtube-shorts", 
      name: "YouTube Shorts", 
      icon: Camera,
      color: "bg-primary text-primary-foreground",
      format: "9:16 (1080x1920)",
      maxDuration: 60,
      description: "YouTube's short-form vertical video format"
    },
    { 
      id: "instagram-reels", 
      name: "Instagram Reels", 
      icon: Camera,
      color: "bg-secondary text-secondary-foreground",
      format: "9:16 (1080x1920)",
      maxDuration: 90,
      description: "Instagram's short-form video feature"
    },
    { 
      id: "linkedin", 
      name: "LinkedIn", 
      icon: Briefcase,
      color: "bg-accent text-accent-foreground",
      format: "16:9 or 1:1 (1200x1200)",
      maxDuration: 600,
      description: "Professional content for business networking"
    }
  ];

  const statusSteps = [
    { id: "extracting", label: "Auto-Reformatting", icon: Scissors },
    { id: "captioning", label: "AI Optimization", icon: Sparkles },
    { id: "branding", label: "Platform Content", icon: Hash },
    { id: "uploading", label: "Multi-Publishing", icon: Send }
  ];

  const generatePlatformContent = async () => {
    if (!videoFile) return;
    
    setIsGeneratingContent(true);
    try {
      // Simulate AI content generation for each selected platform
      const content: {[key: string]: { hashtags: string; description: string; format: string }} = {};
      
      for (const platformId of clipSettings.platforms) {
        const platform = platforms.find(p => p.id === platformId);
        if (!platform) continue;
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock AI-generated content based on platform
        switch (platformId) {
          case 'tiktok':
            content[platformId] = {
              hashtags: '#fyp #viral #trending #tiktok #shorts #discover',
              description: '🔥 This will blow your mind! Can\'t believe this actually works... #mindblown',
              format: platform.format
            };
            break;
          case 'youtube-shorts':
            content[platformId] = {
              hashtags: '#shorts #viral #trending #youtube #subscribe #amazing',
              description: 'INCREDIBLE result! 🤯 You won\'t believe what happens next... LIKE & SUBSCRIBE for more!',
              format: platform.format
            };
            break;
          case 'instagram-reels':
            content[platformId] = {
              hashtags: '#reels #viral #trending #instagram #explore #amazing #instagood',
              description: '✨ Mind = BLOWN ✨ Save this for later! Double tap if you agree 👀',
              format: platform.format
            };
            break;
          case 'linkedin':
            content[platformId] = {
              hashtags: '#leadership #business #growth #professional #career #innovation',
              description: 'Key insights that transformed my approach to business. What are your thoughts on this strategy?',
              format: platform.format
            };
            break;
        }
      }
      
      setPlatformContent(content);
      toast({
        title: "Content Generated!",
        description: `AI-optimized content created for ${clipSettings.platforms.length} platforms`,
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate platform-specific content",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
      // Reset generated content when new file is uploaded
      setPlatformContent({});
      setPreviewUrls({});
    }
  };

  const togglePlatform = (platformId: string) => {
    setClipSettings(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId]
    }));
  };

  const handleClipAndPost = async () => {
    if (!videoFile || clipSettings.platforms.length === 0) {
      toast({
        title: "Missing Requirements",
        description: "Please select a video file and at least one platform",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setStatus("extracting");

    try {
      // Upload video file
      const formData = new FormData();
      formData.append('file', videoFile);
      formData.append('settings', JSON.stringify({
        ...clipSettings,
        platformContent: platformContent
      }));

      // Simulate the multi-platform processing
      const steps = ["extracting", "captioning", "branding", "uploading"];
      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        setStatus(steps[i] as any);
        setProgress((i + 1) * 25);
      }

      // Generate mock preview URLs
      const previews: {[key: string]: string} = {};
      clipSettings.platforms.forEach(platformId => {
        previews[platformId] = `/placeholder.svg?height=200&width=120&text=${platformId}+Preview`;
      });
      setPreviewUrls(previews);

      setStatus("complete");
      setProgress(100);

      toast({
        title: "Successfully Posted!",
        description: `Your clip has been auto-formatted and posted to ${clipSettings.platforms.length} platform(s)`,
      });

    } catch (error: any) {
      console.error('Clip and post error:', error);
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to clip and post video",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setVideoFile(null);
    setClipSettings({
      duration: 15,
      style: "viral",
      caption: "",
      platforms: [],
      hashtags: "",
      startTime: 0,
      enableAIOptimization: true,
      customDescription: ""
    });
    setPlatformContent({});
    setPreviewUrls({});
    setIsProcessing(false);
    setProgress(0);
    setStatus("idle");
  };

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Share2 className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Multi-Platform Clip Generator
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Auto-reformat clips for TikTok, Shorts, Instagram & LinkedIn. AI suggests platform-specific hashtags + descriptions. One upload → publish everywhere.
          </p>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 md:gap-0 h-auto md:h-10 p-1">
            <TabsTrigger value="upload" className="text-xs md:text-sm px-2 py-2 md:px-3">Upload & Setup</TabsTrigger>
            <TabsTrigger value="platforms" className="text-xs md:text-sm px-2 py-2 md:px-3">Platform Selection</TabsTrigger>
            <TabsTrigger value="content" className="text-xs md:text-sm px-2 py-2 md:px-3">AI Content</TabsTrigger>
            <TabsTrigger value="publish" className="text-xs md:text-sm px-2 py-2 md:px-3">Preview & Publish</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Upload className="h-5 w-5" />
                    <span>Video Upload</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      disabled={isProcessing}
                      className="hidden"
                      id="video-upload"
                    />
                    <label htmlFor="video-upload" className="cursor-pointer space-y-2">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="font-medium">Drop your video here or click to browse</p>
                      <p className="text-sm text-muted-foreground">Supports MP4, MOV, AVI files up to 500MB</p>
                    </label>
                  </div>
                  {videoFile && (
                    <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Uploaded</Badge>
                        <span className="text-sm">{videoFile.name}</span>
                      </div>
                      <Badge variant="outline">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Scissors className="h-5 w-5" />
                    <span>Clip Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (seconds)</Label>
                      <Select
                        value={clipSettings.duration.toString()}
                        onValueChange={(value) => setClipSettings(prev => ({ ...prev, duration: parseInt(value) }))}
                        disabled={isProcessing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 seconds</SelectItem>
                          <SelectItem value="15">15 seconds</SelectItem>
                          <SelectItem value="30">30 seconds</SelectItem>
                          <SelectItem value="60">60 seconds</SelectItem>
                          <SelectItem value="90">90 seconds</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="style">Content Style</Label>
                      <Select
                        value={clipSettings.style}
                        onValueChange={(value) => setClipSettings(prev => ({ ...prev, style: value }))}
                        disabled={isProcessing}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viral">Viral Hook</SelectItem>
                          <SelectItem value="teaser">Teaser</SelectItem>
                          <SelectItem value="highlight">Best Moment</SelectItem>
                          <SelectItem value="intro">Intro Clip</SelectItem>
                          <SelectItem value="educational">Educational</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ai-optimization">Enable AI Optimization</Label>
                      <Switch
                        id="ai-optimization"
                        checked={clipSettings.enableAIOptimization}
                        onCheckedChange={(checked) => setClipSettings(prev => ({ ...prev, enableAIOptimization: checked }))}
                        disabled={isProcessing}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Automatically optimize video format, captions, and timing for each platform
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-description">Custom Description (optional)</Label>
                    <Textarea
                      id="custom-description"
                      placeholder="AI will generate platform-specific descriptions if left empty..."
                      value={clipSettings.customDescription}
                      onChange={(e) => setClipSettings(prev => ({ ...prev, customDescription: e.target.value }))}
                      disabled={isProcessing}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="platforms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Share2 className="h-5 w-5" />
                  <span>Select Platforms</span>
                </CardTitle>
                <CardDescription>
                  Choose which platforms to auto-format and publish your clip to
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {platforms.map((platform) => {
                    const Icon = platform.icon;
                    const isSelected = clipSettings.platforms.includes(platform.id);
                    
                    return (
                      <div
                        key={platform.id}
                        onClick={() => !isProcessing && togglePlatform(platform.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all touch-manipulation ${
                          isSelected 
                            ? 'border-primary bg-primary/10' 
                            : 'border-muted hover:border-primary/50'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${platform.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium">{platform.name}</h3>
                              {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
                            </div>
                            <p className="text-sm text-muted-foreground">{platform.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {platform.format}
                              </Badge>
                              <span>Max: {platform.maxDuration}s</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {clipSettings.platforms.length > 0 && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Selected Platforms:</p>
                    <div className="flex flex-wrap gap-2">
                      {clipSettings.platforms.map(platformId => {
                        const platform = platforms.find(p => p.id === platformId);
                        return platform ? (
                          <Badge key={platformId} className={platform.color}>
                            {platform.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5" />
                    <span>AI-Generated Content</span>
                  </div>
                  <Button
                    onClick={generatePlatformContent}
                    disabled={isGeneratingContent || clipSettings.platforms.length === 0 || !videoFile}
                    size="sm"
                  >
                    {isGeneratingContent ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate AI Content
                      </>
                    )}
                  </Button>
                </CardTitle>
                <CardDescription>
                  AI will create platform-specific hashtags and descriptions optimized for maximum engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(platformContent).length === 0 && !isGeneratingContent ? (
                  <div className="text-center py-8 space-y-4">
                    <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Select platforms and click "Generate AI Content" to create optimized descriptions and hashtags
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {clipSettings.platforms.map(platformId => {
                      const platform = platforms.find(p => p.id === platformId);
                      const content = platformContent[platformId];
                      
                      if (!platform) return null;
                      
                      return (
                        <div key={platformId} className="border rounded-lg p-4 space-y-4">
                          <div className="flex items-center space-x-2">
                            <Badge className={platform.color}>
                              {platform.name}
                            </Badge>
                            <Badge variant="outline">{content?.format || platform.format}</Badge>
                          </div>
                          
                          {content ? (
                            <>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Description</Label>
                                <Textarea
                                  value={content.description}
                                  onChange={(e) => setPlatformContent(prev => ({
                                    ...prev,
                                    [platformId]: { ...prev[platformId], description: e.target.value }
                                  }))}
                                  className="min-h-[80px]"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Hashtags</Label>
                                <Input
                                  value={content.hashtags}
                                  onChange={(e) => setPlatformContent(prev => ({
                                    ...prev,
                                    [platformId]: { ...prev[platformId], hashtags: e.target.value }
                                  }))}
                                />
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-4">
                              <RefreshCw className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
                              <p className="text-sm text-muted-foreground mt-2">Generating content...</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="publish" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Processing Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Processing Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!isProcessing && status === "idle" && (
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                        <Share2 className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">Ready to auto-format and publish</p>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Overall Progress</span>
                          <span className="text-sm text-muted-foreground">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        {statusSteps.map((step, index) => {
                          const Icon = step.icon;
                          const isActive = status === step.id;
                          const isComplete = statusSteps.findIndex(s => s.id === status) > index;
                          
                          return (
                            <div key={step.id} className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isComplete ? "bg-green-500 text-white" :
                                isActive ? "bg-primary text-primary-foreground" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {isComplete ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <Icon className="h-4 w-4" />
                                )}
                              </div>
                              <span className={`text-sm ${
                                isActive ? "font-medium text-foreground" :
                                isComplete ? "text-green-600" :
                                "text-muted-foreground"
                              }`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {status === "complete" && (
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium text-green-600">Successfully Published!</p>
                        <p className="text-sm text-muted-foreground">
                          Your clip has been auto-formatted and posted to {clipSettings.platforms.length} platform(s)
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={resetForm}
                        className="w-full"
                      >
                        Create Another Clip
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="h-5 w-5" />
                    <span>Format Previews</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(previewUrls).length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(previewUrls).map(([platformId, url]) => {
                        const platform = platforms.find(p => p.id === platformId);
                        return platform ? (
                          <div key={platformId} className="space-y-2">
                            <Badge className={platform.color}>
                              {platform.name}
                            </Badge>
                            <div className="relative">
                              <img
                                src={url}
                                alt={`${platform.name} preview`}
                                className="w-full rounded-lg border"
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                className="absolute top-2 right-2"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <Eye className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Platform previews will appear here after processing
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleClipAndPost}
                disabled={!videoFile || clipSettings.platforms.length === 0 || isProcessing || Object.keys(platformContent).length === 0}
                size="lg"
                className="px-8"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Auto-Formatting & Publishing...
                  </>
                ) : (
                  <>
                    <Share2 className="h-5 w-5 mr-2" />
                    Auto-Format & Publish to {clipSettings.platforms.length} Platform{clipSettings.platforms.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ClipPost;