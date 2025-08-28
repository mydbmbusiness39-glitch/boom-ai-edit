import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, Zap, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface BatchJob {
  id: string;
  filename: string;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
}

export function BatchProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  const handleStartBatch = () => {
    const mockJobs: BatchJob[] = [
      { id: "1", filename: "video_1.mp4", status: "pending", progress: 0 },
      { id: "2", filename: "video_2.mp4", status: "pending", progress: 0 },
      { id: "3", filename: "video_3.mp4", status: "pending", progress: 0 },
      { id: "4", filename: "video_4.mp4", status: "pending", progress: 0 },
    ];

    setJobs(mockJobs);
    setIsProcessing(true);
    toast.success("Batch processing started!");

    // Simulate processing jobs
    mockJobs.forEach((job, index) => {
      setTimeout(() => {
        setJobs(prev => prev.map(j => 
          j.id === job.id ? { ...j, status: "processing" } : j
        ));
        
        // Simulate progress
        const progressInterval = setInterval(() => {
          setJobs(prev => {
            const updated = prev.map(j => {
              if (j.id === job.id && j.status === "processing") {
                const newProgress = Math.min(j.progress + 10, 100);
                return { ...j, progress: newProgress };
              }
              return j;
            });
            
            const currentJob = updated.find(j => j.id === job.id);
            if (currentJob?.progress === 100) {
              clearInterval(progressInterval);
              setTimeout(() => {
                setJobs(prev => prev.map(j => 
                  j.id === job.id ? { ...j, status: "completed" } : j
                ));
              }, 500);
            }
            
            return updated;
          });
        }, 300);
      }, index * 1000);
    });

    // Update overall progress
    const overallInterval = setInterval(() => {
      setJobs(current => {
        const completed = current.filter(j => j.status === "completed").length;
        const newOverallProgress = (completed / current.length) * 100;
        setOverallProgress(newOverallProgress);
        
        if (completed === current.length) {
          clearInterval(overallInterval);
          setIsProcessing(false);
          toast.success("All videos processed successfully!");
        }
        
        return current;
      });
    }, 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "processing": return <Zap className="h-4 w-4 text-boom-primary animate-pulse" />;
      case "error": return <div className="h-4 w-4 bg-red-500 rounded-full" />;
      default: return <div className="h-4 w-4 bg-muted rounded-full" />;
    }
  };

  return (
    <Card className="bg-card border-boom-accent/20 max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
          <Upload className="h-5 w-5 text-boom-accent" />
          Batch Processing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Upload multiple videos and let BoomStudio automatically generate shorts, captions, and exports.
          </p>
          
          {!isProcessing && jobs.length === 0 && (
            <Button 
              onClick={handleStartBatch}
              className="bg-boom-accent hover:bg-boom-accent/90 text-primary-foreground font-semibold px-8"
            >
              Start Batch Processing
            </Button>
          )}
        </div>

        {jobs.length > 0 && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-card-foreground font-medium">Overall Progress</span>
                <span className="text-muted-foreground">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="w-full" />
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-card-foreground">Processing Queue:</h4>
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <span className="text-sm font-medium text-card-foreground">{job.filename}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {job.status === "processing" && (
                      <Progress value={job.progress} className="w-20" />
                    )}
                    <span className="text-xs text-muted-foreground capitalize">
                      {job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}