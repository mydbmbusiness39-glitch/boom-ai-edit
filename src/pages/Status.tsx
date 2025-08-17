import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, Clock, AlertCircle, Download, RefreshCw, Zap, Share2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout/Layout";
import { Job, JobStatus } from "@/types";

const Status = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load job data and simulate updates
  useEffect(() => {
    // Try to load job data from localStorage
    const jobData = localStorage.getItem(`job-${jobId}`);
    
    const mockJob: Job = jobData ? {
      id: jobId || "job-123",
      name: "Video Project",
      status: "processing" as JobStatus,
      progress: 0,
      createdAt: new Date(JSON.parse(jobData).createdAt),
      updatedAt: new Date(),
      estimatedCompletionTime: new Date(Date.now() + 1000 * 60 * 2), // 2 minutes from now
      renderSettings: {
        quality: "high",
        format: "mp4",
        bitrate: 5000
      },
      timeline: {
        id: "timeline-1",
        jobId: jobId || "job-123",
        items: [],
        duration: parseInt(JSON.parse(jobData).duration || '15'),
        fps: 30,
        resolution: { width: 1920, height: 1080 }
      },
      assets: [],
      stage: "uploading"
    } : {
      id: jobId || "job-123",
      name: "Sample Video Project",
      status: "processing" as JobStatus,
      progress: 45,
      createdAt: new Date(Date.now() - 1000 * 60 * 5),
      updatedAt: new Date(),
      estimatedCompletionTime: new Date(Date.now() + 1000 * 60 * 2),
      renderSettings: {
        quality: "high",
        format: "mp4",
        bitrate: 5000
      },
      timeline: {
        id: "timeline-1",
        jobId: jobId || "job-123",
        items: [],
        duration: 15,
        fps: 30,
        resolution: { width: 1920, height: 1080 }
      },
      assets: [],
      stage: "processing"
    };

    setJob(mockJob);
    setIsLoading(false);

    // Poll status every 2 seconds
    const interval = setInterval(() => {
      setJob(prev => {
        if (!prev || prev.status === "completed") return prev;
        
        const newProgress = Math.min((prev.progress || 0) + Math.random() * 15, 100);
        let newStatus: JobStatus = prev.status;
        let newStage = prev.stage;
        
        // Stage progression
        if (newProgress > 20 && prev.stage === "uploading") {
          newStage = "processing";
        } else if (newProgress > 60 && prev.stage === "processing") {
          newStage = "rendering";
        } else if (newProgress >= 100) {
          newStatus = "completed";
          newStage = "complete";
        }
        
        return {
          ...prev,
          progress: newProgress,
          status: newStatus,
          stage: newStage,
          updatedAt: new Date(),
          previewUrl: newProgress > 80 ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" : undefined,
          outputUrl: newStatus === "completed" ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" : undefined
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-6 w-6 text-neon-green" />;
      case "failed":
        return <AlertCircle className="h-6 w-6 text-destructive" />;
      case "processing":
      case "rendering":
        return <RefreshCw className="h-6 w-6 text-neon-purple animate-spin" />;
      default:
        return <Clock className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case "completed":
        return "bg-neon-green/10 text-neon-green border-neon-green/20";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "processing":
      case "rendering":
        return "bg-neon-purple/10 text-neon-purple border-neon-purple/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatTimeRemaining = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const minutes = Math.max(0, Math.ceil(diff / (1000 * 60)));
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  const handleShare = async () => {
    if (!job?.outputUrl) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: job.name,
          text: 'Check out my AI-generated video!',
          url: job.outputUrl,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(job.outputUrl);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto p-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <RefreshCw className="h-8 w-8 text-neon-purple animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading job status...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto p-6 text-center min-h-[60vh] flex items-center justify-center">
          <div className="space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold">Job Not Found</h1>
            <p className="text-muted-foreground">
              The job with ID "{jobId}" could not be found.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
            Render Status
          </h1>
          <p className="text-xl text-muted-foreground">
            Track your video processing progress in real-time
          </p>
        </div>

        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(job.status)}
                <div>
                  <CardTitle className="text-2xl">{job.name}</CardTitle>
                  <p className="text-muted-foreground">Job ID: {job.id}</p>
                </div>
              </div>
              
              <Badge className={cn("text-sm px-3 py-1", getStatusColor(job.status))}>
                {job.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {job.status !== "completed" && job.status !== "failed" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Stage: {job.stage}</span>
                  <span className="font-mono">{Math.round(job.progress || 0)}%</span>
                </div>
                <Progress value={job.progress || 0} className="h-3" />
                {job.estimatedCompletionTime && (
                  <p className="text-sm text-muted-foreground text-center">
                    Estimated completion: {formatTimeRemaining(job.estimatedCompletionTime)}
                  </p>
                )}
              </div>
            )}

            {/* Preview Video */}
            {job.previewUrl && job.status !== "completed" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center">
                  <Play className="h-5 w-5 mr-2 text-neon-purple" />
                  Preview Available
                </h3>
                <video 
                  controls 
                  className="w-full rounded-lg"
                  src={job.previewUrl}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Project Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolution:</span>
                    <span>{job.timeline.resolution.width}x{job.timeline.resolution.height}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{job.timeline.duration}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frame Rate:</span>
                    <span>{job.timeline.fps} fps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quality:</span>
                    <span className="capitalize">{job.renderSettings.quality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Format:</span>
                    <span className="uppercase">{job.renderSettings.format}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Timeline</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{job.createdAt.toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span>{job.updatedAt.toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assets:</span>
                    <span>{job.assets.length} files</span>
                  </div>
                </div>
              </div>
            </div>

            {job.status === "completed" && job.outputUrl && (
              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-center space-x-4">
                  <CheckCircle className="h-8 w-8 text-neon-green" />
                  <div className="text-center">
                    <p className="text-lg font-semibold text-neon-green mb-2">
                      Render Complete!
                    </p>
                  </div>
                </div>
                
                {/* Final Video */}
                <video 
                  controls 
                  className="w-full rounded-lg"
                  src={job.outputUrl}
                >
                  Your browser does not support the video tag.
                </video>
                
                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                  <Button 
                    size="lg"
                    variant="outline"
                    onClick={handleShare}
                  >
                    <Share2 className="h-5 w-5 mr-2" />
                    Share
                  </Button>
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-neon-purple to-neon-green text-background hover:shadow-lg hover:shadow-neon-green/25"
                    onClick={() => window.open(job.outputUrl, '_blank')}
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}

            {job.status === "failed" && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-center space-x-4">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <div className="text-center">
                    <p className="text-lg font-semibold text-destructive mb-2">
                      Render Failed
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {job.error || "An unexpected error occurred during rendering"}
                    </p>
                    <Button variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Render
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Status;