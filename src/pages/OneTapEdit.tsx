import { useState, useRef, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Upload as UploadIcon, Video, Image, Play, Settings, Zap, Wand2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout/Layout";
import Watermark from "@/components/Watermark";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  type: 'video' | 'image';
}

interface SmartSettings {
  autoCaptions: boolean;
  smartCrop: boolean;
  autoMusic: boolean;
  viralOptimization: boolean;
}

const OneTapEdit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProMode, setIsProMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [smartSettings, setSmartSettings] = useState<SmartSettings>({
    autoCaptions: true,
    smartCrop: true,
    autoMusic: true,
    viralOptimization: true,
  });

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const validFiles = Array.from(files).filter(file => {
      return file.type.startsWith('video/') || file.type.startsWith('image/');
    });

    if (validFiles.length > 5) {
      toast({
        title: "Too many files",
        description: "Maximum 5 files allowed for one-tap editing",
        variant: "destructive",
      });
      return;
    }

    const newFiles = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      type: file.type.startsWith('video/') ? 'video' as const : 'image' as const
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Auto-process if in simple mode and files are uploaded
    if (!isProMode && newFiles.length > 0) {
      handleOneTapEdit(newFiles);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleOneTapEdit = async (filesToProcess = uploadedFiles) => {
    if (filesToProcess.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const jobData = {
        name: `One-Tap Edit - ${new Date().toLocaleTimeString()}`,
        files: filesToProcess.map(file => ({
          name: file.file.name,
          type: file.type,
          url: URL.createObjectURL(file.file),
          size: file.file.size
        })),
        style_id: "auto-optimized",
        duration: 15, // Smart default
        music: smartSettings.autoMusic ? "auto" : "none",
        settings: {
          autoCaptions: smartSettings.autoCaptions,
          smartCrop: smartSettings.smartCrop,
          viralOptimization: smartSettings.viralOptimization,
        }
      };

      // Simulate AI processing stages
      const stages = [
        { name: "Analyzing content...", duration: 1500 },
        { name: "Applying smart crop...", duration: 2000 },
        { name: "Generating captions...", duration: 2500 },
        { name: "Adding music...", duration: 2000 },
        { name: "Optimizing for virality...", duration: 1500 },
        { name: "Rendering preview...", duration: 2500 },
      ];

      let totalProgress = 0;
      const progressStep = 100 / stages.length;

      for (const stage of stages) {
        setProcessingStage(stage.name);
        await new Promise(resolve => setTimeout(resolve, stage.duration));
        totalProgress += progressStep;
        setProgress(Math.round(totalProgress));
      }

      // Simulate preview generation
      setPreviewUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
      
      toast({
        title: "✨ One-Tap Edit Complete!",
        description: "Your video has been automatically optimized with AI.",
      });

    } catch (error) {
      console.error('Error processing:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process your video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingStage("");
    }
  };

  const handlePublish = async () => {
    toast({
      title: "🚀 Publishing to Social Media",
      description: "Your video is being shared across platforms!",
    });
    
    // Navigate to status or social sharing page
    navigate("/clip-post");
  };

  const resetEditor = () => {
    setUploadedFiles([]);
    setPreviewUrl(null);
    setProgress(0);
  };

  return (
    <Layout>
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <Zap className="h-8 w-8 text-neon-purple" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
              One-Tap Edit
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Upload → AI edits → Publish. The fastest way to create viral content with BOOM's intelligence.
          </p>
        </div>

        {/* Mode Toggle */}
        <Card className="mx-auto max-w-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="pro-mode" className="font-medium">
                  {isProMode ? "Pro Mode" : "Simple Mode"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isProMode ? "Advanced controls and customization" : "Instant AI processing with smart defaults"}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm">Simple</span>
                <Switch
                  id="pro-mode"
                  checked={isProMode}
                  onCheckedChange={setIsProMode}
                />
                <span className="text-sm">Pro</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Area */}
          <div className="space-y-4">
            <Card className="border-dashed border-2 border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div
                  className={cn(
                    "flex flex-col items-center justify-center space-y-4 py-8 cursor-pointer transition-all",
                    isDragActive && "scale-105 opacity-70"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={openFileDialog}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="video/*,image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  
                  <div className="relative">
                    <UploadIcon className="h-12 w-12 text-muted-foreground" />
                    {isDragActive && (
                      <div className="absolute inset-0 h-12 w-12 text-neon-purple animate-pulse" />
                    )}
                  </div>
                  
                  <div className="text-center space-y-2">
                    <p className="text-lg font-semibold">
                      {isDragActive ? "Drop your files here!" : "Upload to start creating"}
                    </p>
                    <p className="text-muted-foreground">
                      Videos, images • Max 5 files • {!isProMode && "Auto-processes in Simple Mode"}
                    </p>
                  </div>

                  <Button variant="outline" type="button">
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Smart Settings (Pro Mode) */}
            {isProMode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-neon-purple" />
                    <span>Smart Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto-captions"
                        checked={smartSettings.autoCaptions}
                        onCheckedChange={(checked) => 
                          setSmartSettings(prev => ({ ...prev, autoCaptions: checked }))
                        }
                      />
                      <Label htmlFor="auto-captions" className="text-sm">Auto Captions</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="smart-crop"
                        checked={smartSettings.smartCrop}
                        onCheckedChange={(checked) => 
                          setSmartSettings(prev => ({ ...prev, smartCrop: checked }))
                        }
                      />
                      <Label htmlFor="smart-crop" className="text-sm">Smart Crop</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto-music"
                        checked={smartSettings.autoMusic}
                        onCheckedChange={(checked) => 
                          setSmartSettings(prev => ({ ...prev, autoMusic: checked }))
                        }
                      />
                      <Label htmlFor="auto-music" className="text-sm">Auto Music</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="viral-optimization"
                        checked={smartSettings.viralOptimization}
                        onCheckedChange={(checked) => 
                          setSmartSettings(prev => ({ ...prev, viralOptimization: checked }))
                        }
                      />
                      <Label htmlFor="viral-optimization" className="text-sm">Viral Optimization</Label>
                    </div>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <Button 
                      onClick={() => handleOneTapEdit()}
                      disabled={isProcessing}
                      className="w-full bg-gradient-to-r from-neon-purple to-neon-green text-background"
                    >
                      {isProcessing ? (
                        <>
                          <Wand2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Start One-Tap Edit
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Uploaded Files</span>
                    <Badge variant="secondary">{uploadedFiles.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                        <div className="text-neon-purple">
                          {file.type === 'video' ? <Video className="h-5 w-5" /> : <Image className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm truncate">{file.file.name}</p>
                          <p className="text-xs text-muted-foreground">{file.type}</p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-neon-green" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Preview Area */}
          <div className="space-y-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>AI Processing & Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isProcessing && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <Wand2 className="h-12 w-12 mx-auto text-neon-purple animate-spin mb-4" />
                      <p className="font-medium">{processingStage}</p>
                    </div>
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      AI is working its magic... {progress}%
                    </p>
                  </div>
                )}

                {previewUrl && !isProcessing && (
                  <div className="space-y-4">
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                      <Watermark />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center space-y-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-neon-purple to-neon-green rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
                            <Play className="h-8 w-8 text-background ml-1" />
                          </div>
                          <p className="text-white/70 text-sm">Click to preview your video</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        onClick={handlePublish}
                        className="flex-1 bg-gradient-to-r from-neon-purple to-neon-green text-background"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Publish Now
                      </Button>
                      <Button variant="outline" onClick={() => navigate("/editor")}>
                        <Settings className="h-4 w-4 mr-2" />
                        Edit More
                      </Button>
                    </div>

                    <Button variant="ghost" onClick={resetEditor} className="w-full">
                      Start Over
                    </Button>
                  </div>
                )}

                {!isProcessing && !previewUrl && uploadedFiles.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Upload files to see AI-powered preview</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OneTapEdit;