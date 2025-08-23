import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Zap, Upload, Scissors, Type, Palette, Send, CheckCircle, Clock, AlertCircle } from "lucide-react";
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
    startTime: 0
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "extracting" | "captioning" | "branding" | "uploading" | "complete">("idle");
  const { toast } = useToast();

  const platforms = [
    { id: "tiktok", name: "TikTok", color: "bg-black text-white" },
    { id: "youtube-shorts", name: "YouTube Shorts", color: "bg-red-500 text-white" },
    { id: "instagram-reels", name: "Instagram Reels", color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white" }
  ];

  const statusSteps = [
    { id: "extracting", label: "Extracting Clip", icon: Scissors },
    { id: "captioning", label: "AI Captions", icon: Type },
    { id: "branding", label: "Adding Brand", icon: Palette },
    { id: "uploading", label: "Posting", icon: Send }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
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
      formData.append('settings', JSON.stringify(clipSettings));

      const { data, error } = await supabase.functions.invoke('clip-and-post', {
        body: formData
      });

      if (error) throw error;

      // Simulate progress updates
      const steps = ["extracting", "captioning", "branding", "uploading"];
      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setStatus(steps[i] as any);
        setProgress((i + 1) * 25);
      }

      setStatus("complete");
      setProgress(100);

      toast({
        title: "Successfully Posted!",
        description: `Your clip has been posted to ${clipSettings.platforms.length} platform(s)`,
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
      startTime: 0
    });
    setIsProcessing(false);
    setProgress(0);
    setStatus("idle");
  };

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Zap className="h-8 w-8 text-neon-purple" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
              One-Click Clip & Post
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Extract viral clips, add captions & branding, then post instantly to all platforms
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload & Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Video & Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="video">Upload Video</Label>
                <Input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                />
                {videoFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {videoFile.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Clip Duration (seconds)</Label>
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
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="style">Style</Label>
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
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="caption">Custom Caption (optional)</Label>
                <Textarea
                  id="caption"
                  placeholder="AI will generate if left empty..."
                  value={clipSettings.caption}
                  onChange={(e) => setClipSettings(prev => ({ ...prev, caption: e.target.value }))}
                  disabled={isProcessing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hashtags">Hashtags</Label>
                <Input
                  id="hashtags"
                  placeholder="#viral #trending #shorts"
                  value={clipSettings.hashtags}
                  onChange={(e) => setClipSettings(prev => ({ ...prev, hashtags: e.target.value }))}
                  disabled={isProcessing}
                />
              </div>

              <div className="space-y-2">
                <Label>Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((platform) => (
                    <Badge
                      key={platform.id}
                      variant={clipSettings.platforms.includes(platform.id) ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${
                        clipSettings.platforms.includes(platform.id) ? platform.color : ""
                      }`}
                      onClick={() => !isProcessing && togglePlatform(platform.id)}
                    >
                      {platform.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress & Status */}
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
                    <Zap className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Ready to process your video</p>
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
                    <p className="font-medium text-green-600">Successfully Posted!</p>
                    <p className="text-sm text-muted-foreground">
                      Your clip has been posted to {clipSettings.platforms.length} platform(s)
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
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleClipAndPost}
            disabled={!videoFile || clipSettings.platforms.length === 0 || isProcessing}
            size="lg"
            className="bg-gradient-to-r from-neon-purple to-neon-green text-background hover:shadow-lg hover:shadow-neon-purple/25 px-8"
          >
            {isProcessing ? (
              <>
                <Clock className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 mr-2" />
                Clip & Post Now
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default ClipPost;