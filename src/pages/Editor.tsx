import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, SkipBack, SkipForward, Volume2, Scissors, Copy, Trash2, Settings, Zap, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout/Layout";

const Editor = () => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState([80]);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load project data from localStorage
  useEffect(() => {
    const uploadedFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
    const selectedMusic = localStorage.getItem('selectedMusic');
    const selectedStyle = localStorage.getItem('selectedStyle');
    const videoDuration = localStorage.getItem('videoDuration');
    
    setProjectData({
      files: uploadedFiles,
      music: selectedMusic,
      style: selectedStyle,
      duration: videoDuration
    });
  }, []);

  const timelineItems = projectData ? [
    ...projectData.files.map((file: any, index: number) => ({
      id: `file-${index}`,
      name: file.file.name,
      type: file.type,
      startTime: 0,
      duration: parseInt(projectData.duration || '15'),
      track: index,
      color: file.type === 'video' ? "bg-neon-purple/20 border-neon-purple" : "bg-blue-500/20 border-blue-500"
    })),
    {
      id: "music",
      name: `Music: ${projectData.music}`,
      type: "audio",
      startTime: 0,
      duration: parseInt(projectData.duration || '15'),
      track: projectData.files.length,
      color: "bg-neon-green/20 border-neon-green"
    }
  ] : [];

  const handleBoomClick = async () => {
    if (!projectData) return;
    
    setIsProcessing(true);
    
    try {
      // Create job ID
      const jobId = Math.random().toString(36).substr(2, 9);
      
      // Store job data for status page
      const jobData = {
        id: jobId,
        files: projectData.files,
        music: projectData.music,
        style: projectData.style,
        duration: projectData.duration,
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem(`job-${jobId}`, JSON.stringify(jobData));
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Navigate to status page
      navigate(`/status/${jobId}`);
    } catch (error) {
      console.error('Error creating job:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-80px)] flex flex-col bg-background">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
              Video Editor
            </h1>
            <Badge variant="outline">Draft Project</Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button 
              className="bg-gradient-to-r from-neon-purple to-neon-green text-background hover:shadow-lg hover:shadow-neon-purple/25"
              onClick={handleBoomClick}
              disabled={isProcessing || !projectData}
            >
              {isProcessing ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  BOOM
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Preview Window */}
            <div className="flex-1 bg-black/50 p-6 flex items-center justify-center">
              <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-neon-purple to-neon-green rounded-full flex items-center justify-center">
                      {isPlaying ? (
                        <Pause className="h-12 w-12 text-background" />
                      ) : (
                        <Play className="h-12 w-12 text-background ml-1" />
                      )}
                    </div>
                    <p className="text-white/70">Video Preview Area</p>
                  </div>
                </div>

                {/* Video Controls Overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black/80 rounded-lg p-4 space-y-3">
                    <Slider
                      value={[currentTime]}
                      onValueChange={(value) => setCurrentTime(value[0])}
                      max={60}
                      step={1}
                      className="w-full"
                    />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                        >
                          <SkipBack className="h-5 w-5" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={togglePlayback}
                        >
                          {isPlaying ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                        >
                          <SkipForward className="h-5 w-5" />
                        </Button>
                      </div>

                      <div className="flex items-center space-x-2 text-white text-sm">
                        <span>{formatTime(currentTime)}</span>
                        <span>/</span>
                        <span>{formatTime(60)}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Volume2 className="h-5 w-5 text-white" />
                        <Slider
                          value={volume}
                          onValueChange={setVolume}
                          max={100}
                          step={1}
                          className="w-20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="h-80 bg-card border-t border-border">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Timeline</h3>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Scissors className="h-4 w-4 mr-2" />
                      Split
                    </Button>
                    <Button variant="outline" size="sm">
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {timelineItems.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4">
                      <div className="w-24 text-sm text-muted-foreground">
                        Track {item.track + 1}
                      </div>
                      
                      <div className="flex-1 relative h-12 bg-muted rounded">
                        <div
                          className={cn(
                            "absolute h-full rounded border-2 cursor-pointer transition-all",
                            "hover:opacity-80",
                            item.color,
                            selectedTrack === item.id && "ring-2 ring-primary"
                          )}
                          style={{
                            left: `${(item.startTime / 60) * 100}%`,
                            width: `${(item.duration / 60) * 100}%`
                          }}
                          onClick={() => setSelectedTrack(item.id)}
                        >
                          <div className="p-2 h-full flex items-center">
                            <span className="text-xs font-medium truncate text-foreground">
                              {item.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="w-20 text-sm text-muted-foreground">
                        {formatTime(item.duration)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel - Project Summary */}
          <div className="w-80 border-l border-border bg-card">
            <div className="p-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {projectData ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Files</label>
                        <div className="space-y-1">
                          {projectData.files.map((file: any, index: number) => (
                            <p key={index} className="text-sm text-muted-foreground truncate">
                              {file.file.name}
                            </p>
                          ))}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <label className="text-sm font-medium">Music</label>
                        <p className="text-sm text-muted-foreground capitalize">
                          {projectData.music}
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Style</label>
                        <p className="text-sm text-muted-foreground">
                          {projectData.style === 'rgb-gamer' ? 'RGB Gamer' : 'Luxury'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Duration</label>
                        <p className="text-sm text-muted-foreground">
                          {projectData.duration} seconds
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Loading project data...
                    </p>
                  )}
                </CardContent>
              </Card>

              {selectedTrack && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Item Properties</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Selected</label>
                      <p className="text-sm text-muted-foreground">
                        {timelineItems.find(item => item.id === selectedTrack)?.name}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Opacity</label>
                      <Slider defaultValue={[100]} max={100} step={1} />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Scale</label>
                      <Slider defaultValue={[100]} max={200} step={1} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Editor;