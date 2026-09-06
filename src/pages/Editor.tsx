import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, SkipBack, SkipForward, Volume2, Scissors, Copy, Trash2, Settings, Zap, Upload, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout/Layout";
import Watermark from "@/components/Watermark";
import ChatAssistant from "@/components/Editor/ChatAssistant";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { aiWorkerClient } from "@/utils/aiWorkerClient";

type EditItem = {
  id: string;
  name: string;
  type: "video" | "audio";
  startTime: number;
  duration: number;
  track: number;
  color: string;
  sourceName: string;
};

const DEFAULT_PROJECT_DURATION = 15;

const Editor = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState([80]);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showChatAssistant, setShowChatAssistant] = useState(true);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Array<{text: string; start: number; end: number}>>([]);
  const [captionStyle, setCaptionStyle] = useState<string>("classic");
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [showCaptionPanel, setShowCaptionPanel] = useState(false);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [analysis, setAnalysis] = useState<{
    scenes: Array<{ start: number; end: number; score: number }>;
    totalDuration: number;
    beats: number[];
    bpm: number;
    thumbnails: string[];
    loading: boolean;
    error: string | null;
  } | null>(null);
  const [editItems, setEditItems] = useState<EditItem[]>([]);

  // Load project data from localStorage
  useEffect(() => {
    const uploadedFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
    const selectedMusic = localStorage.getItem('selectedMusic');
    const selectedStyle = localStorage.getItem('selectedStyle');
    const videoDuration = localStorage.getItem('videoDuration');

    // Load cloud video URL (uploaded to Supabase storage)
    try {
      const urls = JSON.parse(localStorage.getItem('uploadedFileUrls') || '[]');
      if (Array.isArray(urls) && urls.length > 0 && urls[0]?.url) {
        setPreviewVideoUrl(urls[0].url);
      }
    } catch (e) { /* ignore */ }
    
    // Load saved captions + caption style
    try {
      const savedCaptions = localStorage.getItem('editorCaptions');
      if (savedCaptions) setCaptions(JSON.parse(savedCaptions));
    } catch (e) { /* ignore */ }
    try {
      const savedStyle = localStorage.getItem('captionStyle');
      if (savedStyle) setCaptionStyle(savedStyle);
    } catch (e) { /* ignore */ }

    setProjectData({
      files: uploadedFiles,
      music: selectedMusic,
      style: selectedStyle,
      duration: videoDuration
    });
  }, []);

  const sourceDuration = () =>
    parseInt(projectData?.duration || String(DEFAULT_PROJECT_DURATION));

  const buildInitialEditItems = (): EditItem[] => {
    if (!projectData) return [];
    const baseDuration = sourceDuration();
    const items: EditItem[] = projectData.files.map((file: any, index: number) => ({
      id: `file-${index}`,
      name: file.file.name,
      type: file.type,
      startTime: 0,
      duration: baseDuration,
      track: index,
      color: file.type === 'video' ? "bg-neon-purple/20 border-neon-purple" : "bg-blue-500/20 border-blue-500",
      sourceName: file.file.name,
    }));
    if (projectData.music) {
      items.push({
        id: "music",
        name: `Music: ${projectData.music}`,
        type: "audio",
        startTime: 0,
        duration: baseDuration,
        track: projectData.files.length,
        color: "bg-neon-green/20 border-neon-green",
        sourceName: `Music: ${projectData.music}`,
      });
    }
    return items;
  };

  useEffect(() => {
    setEditItems(buildInitialEditItems());
  }, [projectData]);

  const updateItem = (id: string, patch: Partial<EditItem>) => {
    setEditItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const trimSelected = (edge: "start" | "end", delta: number) => {
    const item = editItems.find((i) => i.id === selectedTrack);
    if (!item) return;
    if (edge === "start") {
      const newStart = clamp(item.startTime + delta, 0, item.startTime + item.duration - 0.1);
      const newDuration = item.duration - (newStart - item.startTime);
      if (newDuration <= 0) return;
      updateItem(item.id, { startTime: newStart, duration: newDuration });
      return;
    }
    const newDuration = clamp(item.duration + delta, 0.1, sourceDuration() - item.startTime);
    updateItem(item.id, { duration: newDuration });
  };

  const splitSelected = () => {
    const item = editItems.find((i) => i.id === selectedTrack);
    if (!item || !currentTime) return;
    const splitPoint = clamp(currentTime, item.startTime + 0.1, item.startTime + item.duration - 0.1);
    if (splitPoint <= item.startTime || splitPoint >= item.startTime + item.duration) return;
    const firstDuration = splitPoint - item.startTime;
    const secondDuration = item.duration - firstDuration;
    const secondId = `${item.id}-split-${Date.now()}`;
    setEditItems((prev) => [
      ...prev.map((i) => (i.id === item.id ? { ...i, duration: firstDuration } : i)),
      {
        ...item,
        id: secondId,
        startTime: splitPoint,
        duration: secondDuration,
      },
    ]);
  };

  const reorderItem = (fromIndex: number, toIndex: number) => {
    setEditItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((item, idx) => ({ ...item, track: idx }));
    });
  };

  const moveSelectedUp = () => {
    const index = editItems.findIndex((i) => i.id === selectedTrack);
    if (index <= 0) return;
    reorderItem(index, index - 1);
    setSelectedTrack(editItems[index - 1].id);
  };

  const moveSelectedDown = () => {
    const index = editItems.findIndex((i) => i.id === selectedTrack);
    if (index < 0 || index >= editItems.length - 1) return;
    reorderItem(index, index + 1);
    setSelectedTrack(editItems[index + 1].id);
  };

  const timelineDuration = editItems.reduce(
    (max, item) => Math.max(max, item.startTime + item.duration),
    sourceDuration()
  );

  // Persist captions + style

  const handleBoomClick = async () => {
    console.log('[DIAGNOSTIC] BOOM handler entered', {
      hasProjectData: !!projectData,
      hasUser: !!user,
      hasSession: !!session,
      filesCount: projectData?.files?.length || 0,
      style: projectData?.style,
      duration: projectData?.duration,
    });

    if (!projectData) {
      console.log('[DIAGNOSTIC] BOOM early return: missing projectData');
      return;
    }

    // Auth guard: require logged-in user
    if (!user || !session) {
      console.log('[DIAGNOSTIC] BOOM early return: auth guard failed');
      toast({
        title: "Please sign in",
        description: "You need to be signed in to create a video.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setIsProcessing(true);

    try {
      // Determine source URLs for files.media.
      // Prefer the cloud URLs already uploaded by the Upload page;
      // fall back to uploading any files that only exist as raw File objects.
      let uploadedFileUrls: any[] = [];
      try {
        const stored = localStorage.getItem("uploadedFileUrls");
        if (stored) uploadedFileUrls = JSON.parse(stored);
      } catch (e) { /* ignore */ }

      const rawFiles = (projectData.files || []) as any[];
      const missingFiles = rawFiles.filter((f) => !f.url && !f.file?.url);
      const alreadyClouded = rawFiles.filter((f) => f.url && f.url.startsWith("http"));

      let cloudUrls: { name: string; type: string; url: string; size: number }[] = [
        ...alreadyClouded.map((f) => ({
          name: f.file?.name || f.name,
          type: f.type,
          url: f.url,
          size: f.file?.size || f.size || 0,
        })),
      ];

      // Upload any files that don't have a cloud URL yet
      if (missingFiles.length > 0) {
        for (const f of missingFiles) {
          const fileObj = f.file;
          if (!fileObj) continue;
          const path = `uploads/${user.id}/${Date.now()}-${fileObj.name}`;
          const { error } = await supabase.storage.from("videoupload").upload(path, fileObj);
          if (error) {
            console.log('[DIAGNOSTIC] BOOM early return: storage upload failed', { fileName: fileObj.name, error: error.message });
            toast({
              title: "Upload failed",
              description: `Could not upload ${fileObj.name}. Please try again.`,
              variant: "destructive",
            });
            throw new Error(`Storage upload failed: ${error.message}`);
          }
          const { data: { publicUrl } } = supabase.storage.from("videoupload").getPublicUrl(path);
          cloudUrls.push({
            name: fileObj.name,
            type: f.type,
            url: publicUrl,
            size: fileObj.size,
          });
        }
      } else if (uploadedFileUrls.length > 0) {
        // Use the URLs from the Upload page (already in public bucket)
        cloudUrls = uploadedFileUrls.map((u: any) => ({
          name: u.name,
          type: u.type,
          url: u.url,
          size: u.size || 0,
        }));
      }

      if (cloudUrls.length === 0) {
        console.log('[DIAGNOSTIC] BOOM early return: cloudUrls empty');
        toast({
          title: "No files to render",
          description: "Please upload media files before creating a video.",
          variant: "destructive",
        });
        return;
      }

      // Build create-job request matching deployed Edge Function contract
      const name = `${projectData.style === "rgb-gamer" ? "RGB" : "Luxury"} Video - ${projectData.duration}s`;
      const filesPayload = cloudUrls.map((u) => ({
        name: u.name,
        type: u.type,
        url: u.url,
        size: u.size,
      }));

      // Map local EditItems to worker TimelineItem contract.
      // Resolve each EditItem to exactly one uploaded source URL by name.
      // Fail safely if source mapping is missing/ambiguous.
      const sourceIndex = new Map<string, { url: string; type: string }>();
      const ambiguous = new Set<string>();
      for (const u of cloudUrls) {
        const key = u.name;
        if (sourceIndex.has(key)) ambiguous.add(key);
        sourceIndex.set(key, { url: u.url, type: u.type });
      }
      const ambiguousNames = Array.from(ambiguous);
      const timelineItems = (editItems || []).map((item: any, idx: number) => {
        const src = sourceIndex.get(item.sourceName || item.name);
        if (!src) {
          throw new Error(`Edit source missing: ${item.sourceName || item.name}`);
        }
        if (ambiguousNames.includes(item.sourceName || item.name)) {
          throw new Error(`Ambiguous source mapping: ${item.sourceName || item.name}`);
        }
        return {
          id: item.id,
          type: item.type === "audio" ? "audio" : "video",
          start_time: Number(item.startTime || 0),
          end_time: Number(item.startTime + item.duration),
          track: Number(item.track || 0),
          content: {
            src: src.url,
            name: item.sourceName || item.name,
            type: src.type,
          },
          effects: [],
        };
      });

      let compiledTimeline: any = null;
      if (timelineItems.length > 0) {
        try {
          compiledTimeline = await aiWorkerClient.compileTimeline({
            items: timelineItems,
            duration: Number(parseInt(projectData.duration)),
            fps: 30,
            resolution: { width: 1080, height: 1920 },
          });
        } catch (compileErr: any) {
          console.log('[DIAGNOSTIC] BOOM early return: timeline compile failed', { message: compileErr?.message || 'Unknown compile error' });
          toast({
            title: "Timeline compile failed",
            description: compileErr?.message || "Unknown compile error",
            variant: "destructive",
          });
          throw compileErr;
        }
      }

      const jobData: any = {
        name,
        files: {
          media: filesPayload,
          music: projectData.music || "auto",
          ...(compiledTimeline ? { timeline: compiledTimeline } : {}),
        },
        style_id: projectData.style,
        duration: parseInt(projectData.duration),
        caption_style: captionStyle,
      };

      // Call real create-job Edge Function with user JWT
      console.log('[DIAGNOSTIC] BOOM invoking create-job', {
        name,
        filesCount: filesPayload.length,
        style_id: projectData.style,
        duration: projectData.duration,
        hasTimeline: !!compiledTimeline,
      });
      const { data, error } = await supabase.functions.invoke("create-job", {
        body: jobData,
        headers: {
          Authorization: `Bearer *** ***}`,
        },
      });
      console.log('[DIAGNOSTIC] BOOM create-job response', {
        hasError: !!error,
        errorMessage: error?.message || null,
        dataKeys: data ? Object.keys(data) : [],
        jobId: data?.job?.id || null,
      });

      if (error) {
        const message = error.message || "Unknown error";
        if (message.includes("Daily job limit")) {
          toast({
            title: "Daily limit reached",
            description: "You've reached your daily limit of 5 renders. Upgrade or try again tomorrow.",
            variant: "destructive",
          });
        } else if (message.includes("not authenticated") || message.includes("No authorization")) {
          toast({
            title: "Session expired",
            description: "Please sign in again to continue.",
            variant: "destructive",
          });
          navigate("/auth");
        } else {
          toast({
            title: "Couldn't create your video",
            description: message,
            variant: "destructive",
          });
        }
        throw new Error(message);
      }

      const jobId = data.job?.id;
      console.log('[DIAGNOSTIC] BOOM jobId resolved', { jobId });

      if (!jobId || typeof jobId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId)) {
        console.error('[DIAGNOSTIC] BOOM hard fail: invalid job ID', { jobId });
        toast({
          title: "Couldn't create your video",
          description: "The server returned an invalid job ID. Please try again.",
          variant: "destructive",
        });
        throw new Error("Invalid job ID returned from create-job");
      }

      localStorage.setItem("currentJobId", jobId);
      navigate(`/status/${jobId}`);
    } catch (error: any) {
      console.error("Error creating job:", error);
      // No fallback to fake job — user sees the actual error
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const runAnalysis = async () => {
    const video = previewVideoUrl ? { url: previewVideoUrl } : null;
    const file = !video && projectData?.files?.length ? projectData.files[0]?.file : null;
    if (!video && !file) {
      toast({ title: 'No media to analyze', description: 'Upload a video first.', variant: 'destructive' });
      return;
    }

    setAnalysis({ scenes: [], totalDuration: 0, beats: [], bpm: 0, thumbnails: [], loading: true, error: null });
    setShowAnalysisPanel(true);

    try {
      let scenes: any = null;
      let beats: any = null;

      if (video) {
        // Pass cloud URL through existing url branch.
        // Note: scenes/beats endpoints may require local file upload depending on auth/routing.
        // This best-effort path uses the direct multipart flow where possible.
        scenes = await aiWorkerClient.analyzeScenes(file);
      } else if (file) {
        scenes = await aiWorkerClient.analyzeScenes(file);
      }

      const audioFile = !beats ? file : undefined;
      if (audioFile) {
        try { beats = await aiWorkerClient.analyzeBeats(audioFile); } catch (e) { /* ignore if audio-only */ }
      }

      const thumbnailPromises: Promise<string>[] = [];
      const src = typeof window !== 'undefined' ? (video?.url || (file instanceof File ? URL.createObjectURL(file) : '')) : '';
      if (src && typeof document !== 'undefined') {
        for (let i = 0; i < Math.min(6, scenes?.scenes?.length || 3); i++) {
          thumbnailPromises.push(new Promise((resolve) => {
            const v = document.createElement('video');
            v.src = src;
            v.crossOrigin = 'anonymous';
            v.muted = true;
            v.preload = 'metadata';
            const time = scenes?.scenes?.[i]?.start ?? (i * 3);
            v.currentTime = Math.max(0, time);
            const onReady = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = v.videoWidth || 320;
                canvas.height = v.videoHeight || 180;
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
              } catch {
                resolve('');
              }
              cleanup();
            };
            const onFail = () => { cleanup(); resolve(''); };
            const cleanup = () => {
              v.removeEventListener('seeked', onReady);
              v.removeEventListener('error', onFail);
              v.src = '';
            };
            v.addEventListener('seeked', onReady, { once: true });
            v.addEventListener('error', onFail, { once: true });
            setTimeout(() => { cleanup(); resolve(''); }, 5000);
          }));
        }
      }

      const thumbnails = await Promise.all(thumbnailPromises);
      setAnalysis({
        scenes: scenes?.scenes || [],
        totalDuration: scenes?.total_duration || 0,
        beats: beats?.beats || [],
        bpm: beats?.bpm || 0,
        thumbnails: thumbnails.filter(Boolean),
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setAnalysis({ scenes: [], totalDuration: 0, beats: [], bpm: 0, thumbnails: [], loading: false, error: error?.message || 'Analysis failed' });
    }
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const handleEditingCommand = (command: any) => {
    console.log('Executing editing command:', command);
    // Here you would integrate with actual video editing logic
    // For now, we'll just log the command and potentially update UI state
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
              variant="outline" 
              size="sm"
              onClick={() => setShowAnalysisPanel(!showAnalysisPanel)}
              disabled={isProcessing}
              data-cy="analysis-panel-toggle"
            >
              <Brain className="h-4 w-4 mr-2" /> Understand
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowCaptionPanel(!showCaptionPanel)}
              disabled={isProcessing}
              data-cy="caption-panel-toggle"
            >
              <Zap className="h-4 w-4 mr-2" />
              Captions
            </Button>
            <Button 
              className="bg-gradient-to-r from-neon-purple to-neon-green text-background hover:shadow-lg hover:shadow-neon-purple/25"
              onClick={handleBoomClick}
              disabled={isProcessing || !projectData}
              data-cy="create-job-button"
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
                <Watermark />
                {previewVideoUrl ? (
                  <video 
                    src={previewVideoUrl}
                    className="absolute inset-0 w-full h-full object-contain"
                    controls
                    playsInline
                    data-cy="editor-preview-video"
                  />
                ) : (
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
                )}

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


            {/* Understand / Analysis Panel */}
            {showAnalysisPanel && (
              <div className="border-t border-border bg-card/50 p-4 space-y-3" data-cy="analysis-panel">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neon-purple flex items-center gap-2">
                    <Brain className="h-4 w-4" /> Understand
                  </h3>
                  <div className="flex items-center gap-2">
                    {!analysis?.loading && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={runAnalysis}
                        data-cy="run-analysis-button"
                      >
                        {analysis ? 'Re-run Analysis' : 'Run Analysis'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAnalysisPanel(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>

                {analysis?.loading && (
                  <p className="text-xs text-muted-foreground">Analyzing media...</p>
                )}

                {analysis?.error && (
                  <p className="text-xs text-destructive">{analysis.error}</p>
                )}

                {analysis && !analysis.loading && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium">Scenes</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {analysis.scenes.length === 0 && (
                            <p className="text-[10px] text-muted-foreground">No scenes detected.</p>
                          )}
                          {analysis.scenes.map((scene, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[10px] bg-background/50 border border-border rounded px-2 py-1">
                              <span className="font-mono text-muted-foreground">{formatTime(scene.start)}</span>
                              <span className="text-foreground truncate mx-1">Scene {idx + 1}</span>
                              <span className="font-mono text-muted-foreground">{formatTime(scene.end)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium">Beats</p>
                        <div className="text-[10px] text-muted-foreground space-y-1">
                          <div>BPM: <span className="font-mono text-foreground">{Math.round(analysis.bpm || 0)}</span></div>
                          <div>Beats: <span className="font-mono text-foreground">{analysis.beats.length}</span></div>
                          <div className="max-h-24 overflow-y-auto">
                            {analysis.beats.map((beat, idx) => (
                              <div key={idx} className="font-mono">{formatTime(beat)}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {analysis.thumbnails.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium">Scene Thumbnails</p>
                        <div className="grid grid-cols-6 gap-1">
                          {analysis.thumbnails.map((src, idx) => (
                            <div key={idx} className="aspect-video bg-black rounded overflow-hidden border border-border">
                              <img src={src} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Smart Captions Panel */}
            {showCaptionPanel && (
              <div className="border-t border-border bg-card/50 p-4 space-y-3" data-cy="smart-captions-panel">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neon-green flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Smart Captions
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const duration = parseInt(projectData?.duration || '15');
                        const segCount = Math.max(3, Math.floor(duration / 3));
                        const segDur = duration / segCount;
                        const newSegs = Array.from({length: segCount}, (_, i) => ({
                          text: '',
                          start: parseFloat((i * segDur).toFixed(2)),
                          end: parseFloat(((i + 1) * segDur).toFixed(2)),
                        }));
                        setCaptions(newSegs);
                        toast({ title: 'Caption segments added', description: `Add text to ${segCount} segments.` });
                      }}
                      data-cy="add-caption-segments"
                    >
                      Add Segments
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={true}
                      onClick={() => toast({ title: 'Authorization required', description: 'Transcription requires Owner authorization for a paid Whisper API call.', variant: 'destructive' })}
                      data-cy="transcribe-button"
                    >
                      <Zap className="h-3 w-3 mr-1" /> Transcribe (requires authorization)
                    </Button>
                  </div>
                </div>

                {captions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Click "Add Segments" to create timed caption blocks. Edit text and timing, then select a style before rendering.
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {captions.map((cap, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-background/50 border border-border rounded p-2" data-cy={`caption-segment-${idx}`}>
                      <span className="text-xs text-muted-foreground font-mono w-6">{idx + 1}</span>
                      <input
                        type="text"
                        value={cap.text}
                        onChange={(e) => {
                          const updated = [...captions];
                          updated[idx] = { ...updated[idx], text: e.target.value };
                          setCaptions(updated);
                        }}
                        placeholder="Caption text..."
                        className="flex-1 text-xs bg-transparent border border-border rounded px-2 py-1"
                        maxLength={80}
                      />
                      <input
                        type="number"
                        value={cap.start}
                        onChange={(e) => {
                          const updated = [...captions];
                          updated[idx] = { ...updated[idx], start: parseFloat(e.target.value) || 0 };
                          setCaptions(updated);
                        }}
                        className="w-14 text-xs bg-transparent border border-border rounded px-1 py-1 font-mono"
                        step="0.1"
                        min="0"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <input
                        type="number"
                        value={cap.end}
                        onChange={(e) => {
                          const updated = [...captions];
                          updated[idx] = { ...updated[idx], end: parseFloat(e.target.value) || 0 };
                          setCaptions(updated);
                        }}
                        className="w-14 text-xs bg-transparent border border-border rounded px-1 py-1 font-mono"
                        step="0.1"
                        min="0"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const updated = captions.filter((_, i) => i !== idx);
                          setCaptions(updated);
                        }}
                        className="text-destructive h-7 w-7"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs text-muted-foreground">Style:</label>
                  <select
                    value={captionStyle}
                    onChange={(e) => setCaptionStyle(e.target.value)}
                    className="text-xs bg-background border border-border rounded px-2 py-1"
                    data-cy="caption-style-select"
                  >
                    <option value="classic">Classic</option>
                    <option value="bold">Bold</option>
                    <option value="minimal">Minimal</option>
                  </select>
                  <span className="text-[10px] text-muted-foreground">
                    {captionStyle === 'classic' && 'White text, black border, bottom-center'}
                    {captionStyle === 'bold' && 'Yellow text, thick border, larger'}
                    {captionStyle === 'minimal' && 'White text, thin border, slightly higher'}
                  </span>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Captions are burned into the final render. Timing is in seconds. Keep text inside the bottom safe zone.
                </p>
              </div>
            )}

            {/* Timeline */}
            <div className="h-80 bg-card border-t border-border">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Timeline</h3>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => trimSelected("start", -0.5)} disabled={!selectedTrack}>
                      <SkipBack className="h-4 w-4 mr-2" /> Trim Start
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => trimSelected("end", -0.5)} disabled={!selectedTrack}>
                      <SkipForward className="h-4 w-4 mr-2" /> Trim End
                    </Button>
                    <Button variant="outline" size="sm" onClick={splitSelected} disabled={!selectedTrack || !currentTime}>
                      <Scissors className="h-4 w-4 mr-2" /> Split
                    </Button>
                    <Button variant="outline" size="sm" onClick={moveSelectedUp} disabled={!selectedTrack}>
                      <Copy className="h-4 w-4 mr-2" /> Move Up
                    </Button>
                    <Button variant="outline" size="sm" onClick={moveSelectedDown} disabled={!selectedTrack}>
                      <Trash2 className="h-4 w-4 mr-2" /> Move Down
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {editItems.map((item) => (
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

                        {selectedTrack === item.id && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-neon-green"
                            style={{ left: `${(currentTime / 60) * 100}%` }}
                          />
                        )}
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

          {/* Side Panel - Chat Assistant or Project Summary */}
          <div className="w-80 border-l border-border bg-card flex flex-col">
            {/* Tab Switcher */}
            <div className="flex border-b border-border">
              <button
                className={`flex-1 p-3 text-sm font-medium transition-colors ${
                  showChatAssistant 
                    ? 'border-b-2 border-neon-purple bg-neon-purple/5 text-neon-purple' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setShowChatAssistant(true)}
              >
                AI Assistant
              </button>
              <button
                className={`flex-1 p-3 text-sm font-medium transition-colors ${
                  !showChatAssistant 
                    ? 'border-b-2 border-neon-green bg-neon-green/5 text-neon-green' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setShowChatAssistant(false)}
              >
                Project Details
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {showChatAssistant ? (
                <div className="h-full p-4">
                  <ChatAssistant 
                    onCommand={handleEditingCommand}
                    projectData={projectData}
                  />
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Editor;