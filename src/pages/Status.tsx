import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, Clock, AlertCircle, Download, RefreshCw, Zap, Share2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout/Layout";
import Watermark from "@/components/Watermark";
import ShareModal from "@/components/ShareModal";
import { Job, JobStatus } from "@/types";
import { supabase } from "@/integrations/supabase/client";

const Status = () => {
  const { id: jobId } = useParams<{ id?: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

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
        resolution: { width: 1080, height: 1920 } // 9:16 aspect ratio
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
        resolution: { width: 1080, height: 1920 } // 9:16 aspect ratio
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
          newStage = "analyzing";
        } else if (newProgress > 40 && prev.stage === "analyzing") {
          newStage = "processing";
        } else if (newProgress > 60 && prev.stage === "processing") {
          newStage = "rendering";
        } else if (newProgress >= 100) {
          newStatus = "completed";
          newStage = "completed";
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

  const handleShare = () => {
    setShowShareModal(true);
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
      <div className="container max-w-4xl mx-auto p-6 space-y-8" data-cy="status-page">
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
                  <CardTitle className="text-2xl" data-cy="job-title">{job.name}</CardTitle>
                  <p className="text-muted-foreground">Job ID: {job.id}</p>
                </div>
              </div>
              
              <Badge className={cn("text-sm px-3 py-1", getStatusColor(job.status))} data-cy="job-status">
                {job.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {job.status !== "completed" && job.status !== "failed" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Stage: {job.stage}</span>
                  <span className="font-mono" data-cy="progress-percentage">{Math.round(job.progress || 0)}%</span>
                </div>
                <Progress value={job.progress || 0} className="h-3" data-cy="progress-bar" />
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
                <div className="relative">
                  <video 
                    controls 
                    className="w-full rounded-lg"
                    src={job.previewUrl}
                    data-cy="preview-video"
                  >
                    Your browser does not support the video tag.
                  </video>
                  <Watermark />
                </div>
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
                    <span data-cy="job-duration">{job.timeline.duration}s</span>
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
                <div className="relative">
                  <video 
                    controls 
                    className="w-full rounded-lg"
                    src={job.outputUrl}
                    data-cy="output-video"
                  >
                    Your browser does not support the video tag.
                  </video>
                  <Watermark />
                </div>
                
                {/* Watermark Notice for Free Tier */}
                <div className="bg-muted/50 border border-border rounded-lg p-4" data-cy="watermark-notice">
                  <p className="text-sm text-muted-foreground text-center">
                    <span className="font-medium">Free Tier:</span> This video includes a watermark. 
                    Upgrade to Pro to remove watermarks and unlock more features.
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                  <Button 
                    size="lg"
                    variant="outline"
                    onClick={handleShare}
                    data-cy="share-button"
                  >
                    <Share2 className="h-5 w-5 mr-2" />
                    Share
                  </Button>
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-neon-purple to-neon-green text-background hover:shadow-lg hover:shadow-neon-green/25"
                    onClick={() => window.open(job.outputUrl, '_blank')}
                    data-cy="download-button"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}

            {job.status === "failed" && (
              <div className="pt-4 border-t" data-cy="error-state">
                <div className="flex items-center justify-center space-x-4">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <div className="text-center">
                    <p className="text-lg font-semibold text-destructive mb-2">
                      Render Failed
                    </p>
                    <p className="text-sm text-muted-foreground mb-4" data-cy="error-message">
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

        {/* Share Modal */}
        {job.outputUrl && (
          <ShareModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            videoUrl={job.outputUrl}
            jobTitle={job.name}
            jobId={job.id}
          />
        )}
      </div>
    </Layout>
  );
};

export default Status;