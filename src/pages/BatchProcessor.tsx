import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Upload, Play, Pause, RotateCcw, Download, Zap, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout/Layout";

interface BatchJob {
  id: string;
  filename: string;
  size: number;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  clipsGenerated: number;
  targetClips: number;
  outputUrls: string[];
  error?: string;
}

const BatchProcessor = () => {
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [batchSettings, setBatchSettings] = useState({
    clipsPerVideo: 5,
    clipDuration: 15,
    style: "viral",
    autoPost: false,
    platforms: [] as string[]
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const { toast } = useToast();

  const platforms = [
    { id: "tiktok", name: "TikTok" },
    { id: "youtube-shorts", name: "YouTube Shorts" },
    { id: "instagram-reels", name: "Instagram Reels" }
  ];

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 10); // Limit to 10 files
      setVideoFiles(files);
      
      // Initialize batch jobs
      const jobs: BatchJob[] = files.map((file, index) => ({
        id: `batch-${index}-${Date.now()}`,
        filename: file.name,
        size: file.size,
        status: "queued",
        progress: 0,
        clipsGenerated: 0,
        targetClips: batchSettings.clipsPerVideo,
        outputUrls: []
      }));
      setBatchJobs(jobs);
    }
  };

  const togglePlatform = (platformId: string) => {
    setBatchSettings(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId]
    }));
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status: BatchJob['status']) => {
    switch (status) {
      case "queued": return "bg-gray-500";
      case "processing": return "bg-blue-500";
      case "completed": return "bg-green-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const startBatchProcessing = async () => {
    if (videoFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please upload video files to process",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setOverallProgress(0);

    try {
      // Upload all files and start batch processing
      const formData = new FormData();
      videoFiles.forEach((file, index) => {
        formData.append(`files`, file);
      });
      formData.append('settings', JSON.stringify(batchSettings));

      const { data, error } = await supabase.functions.invoke('batch-processor', {
        body: formData
      });

      if (error) throw error;

      // Simulate job processing
      for (let jobIndex = 0; jobIndex < batchJobs.length; jobIndex++) {
        setBatchJobs(prev => prev.map(job => 
          job.id === batchJobs[jobIndex].id 
            ? { ...job, status: "processing" }
            : job
        ));

        // Simulate clip generation progress
        for (let clip = 0; clip < batchSettings.clipsPerVideo; clip++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          setBatchJobs(prev => prev.map(job => 
            job.id === batchJobs[jobIndex].id 
              ? { 
                  ...job, 
                  clipsGenerated: clip + 1,
                  progress: ((clip + 1) / batchSettings.clipsPerVideo) * 100
                }
              : job
          ));
        }

        setBatchJobs(prev => prev.map(job => 
          job.id === batchJobs[jobIndex].id 
            ? { 
                ...job, 
                status: "completed",
                outputUrls: Array.from({ length: batchSettings.clipsPerVideo }, (_, i) => 
                  `https://example.com/clips/${job.id}-clip-${i + 1}.mp4`
                )
              }
            : job
        ));

        setOverallProgress(((jobIndex + 1) / batchJobs.length) * 100);
      }

      toast({
        title: "Batch Processing Complete!",
        description: `Generated ${batchJobs.length * batchSettings.clipsPerVideo} clips from ${batchJobs.length} videos`,
      });

    } catch (error: any) {
      console.error('Batch processing error:', error);
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process batch",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetBatch = () => {
    setVideoFiles([]);
    setBatchJobs([]);
    setIsProcessing(false);
    setOverallProgress(0);
  };

  const downloadAll = () => {
    // Simulate downloading all clips
    toast({
      title: "Download Started",
      description: "Downloading all generated clips as a ZIP file",
    });
  };

  const completedJobs = batchJobs.filter(job => job.status === "completed").length;
  const totalClips = batchJobs.reduce((acc, job) => acc + job.clipsGenerated, 0);

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Zap className="h-8 w-8 text-neon-purple" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
              Batch Processor
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Upload 10 long videos → AI clips 50 viral-ready Shorts overnight
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload & Settings */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Upload & Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="videos">Upload Videos (Max 10)</Label>
                <Input
                  id="videos"
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleFilesChange}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  {videoFiles.length}/10 files selected
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clips">Clips per Video</Label>
                  <Select
                    value={batchSettings.clipsPerVideo.toString()}
                    onValueChange={(value) => setBatchSettings(prev => ({ ...prev, clipsPerVideo: parseInt(value) }))}
                    disabled={isProcessing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 clips</SelectItem>
                      <SelectItem value="5">5 clips</SelectItem>
                      <SelectItem value="10">10 clips</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Clip Duration</Label>
                  <Select
                    value={batchSettings.clipDuration.toString()}
                    onValueChange={(value) => setBatchSettings(prev => ({ ...prev, clipDuration: parseInt(value) }))}
                    disabled={isProcessing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 sec</SelectItem>
                      <SelectItem value="30">30 sec</SelectItem>
                      <SelectItem value="60">60 sec</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Style</Label>
                <Select
                  value={batchSettings.style}
                  onValueChange={(value) => setBatchSettings(prev => ({ ...prev, style: value }))}
                  disabled={isProcessing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viral">Viral Hooks</SelectItem>
                    <SelectItem value="teaser">Teasers</SelectItem>
                    <SelectItem value="highlight">Highlights</SelectItem>
                    <SelectItem value="mixed">Mixed Styles</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Auto-Post Platforms (Optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((platform) => (
                    <Badge
                      key={platform.id}
                      variant={batchSettings.platforms.includes(platform.id) ? "default" : "outline"}
                      className="cursor-pointer transition-all"
                      onClick={() => !isProcessing && togglePlatform(platform.id)}
                    >
                      {platform.name}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty to generate clips only
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Videos Processed</p>
                    <p className="font-medium">{completedJobs}/{batchJobs.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Total Clips Generated</p>
                    <p className="font-medium">{totalClips}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={startBatchProcessing}
                  disabled={videoFiles.length === 0 || isProcessing}
                  className="w-full bg-gradient-to-r from-neon-purple to-neon-green text-background"
                >
                  {isProcessing ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Batch Processing
                    </>
                  )}
                </Button>
                
                {completedJobs > 0 && (
                  <Button
                    onClick={downloadAll}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download All Clips
                  </Button>
                )}
                
                <Button
                  onClick={resetBatch}
                  variant="ghost"
                  className="w-full"
                  disabled={isProcessing}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Batch
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Job Status Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Processing Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {batchJobs.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">
                    Upload video files to start batch processing
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Video</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Clips</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchJobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium truncate max-w-[200px]">
                                {job.filename}
                              </p>
                              {job.error && (
                                <p className="text-xs text-red-500">
                                  {job.error}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatFileSize(job.size)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(job.status)} text-white`}>
                              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Progress value={job.progress} className="h-1 w-20" />
                              <span className="text-xs text-muted-foreground">
                                {Math.round(job.progress)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {job.clipsGenerated}/{job.targetClips}
                            {job.status === "completed" && (
                              <CheckCircle className="h-4 w-4 text-green-500 inline ml-2" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default BatchProcessor;