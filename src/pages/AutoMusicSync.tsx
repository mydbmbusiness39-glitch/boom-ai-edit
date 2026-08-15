import { useCallback, useRef, useState, DragEvent } from "react";
import {
  Upload as UploadIcon,
  Music,
  Video,
  X,
  Download,
  CheckCircle2,
  Loader2,
  Mic2,
  Wand2,
  PlayCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout/Layout";
import { analyzeBeats, BeatAnalysis } from "@/lib/beatDetector";
import { syncVideoToMusic, SyncProgress } from "@/lib/musicSyncEngine";

type Stage = "idle" | "analyzing" | "ready" | "syncing" | "done" | "error";

const formatSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const AutoMusicSync = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [isDragV, setIsDragV] = useState(false);
  const [isDragM, setIsDragM] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [analysis, setAnalysis] = useState<BeatAnalysis | null>(null);
  const [beatsPerCut, setBeatsPerCut] = useState(1);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  const handleVideo = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = Array.from(files).find((f) => f.type.startsWith("video/"));
    if (!file) {
      alert("Please choose a video file (MP4, MOV, etc.)");
      return;
    }
    if (file.size > 300 * 1024 * 1024) {
      alert("File is too large — please use a video under 300MB");
      return;
    }
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setAnalysis(null);
    setResultUrl(null);
    setResultBlob(null);
    setStage("idle");
    setError(null);
  }, [videoPreview, resultUrl]);

  const handleMusic = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = Array.from(files).find((f) => f.type.startsWith("audio/"));
    if (!file) {
      alert("Please choose an audio file (MP3, WAV, M4A, etc.)");
      return;
    }
    setMusicFile(file);
    setError(null);
  }, []);

  const onVideoDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragV(false);
    handleVideo(e.dataTransfer.files);
  };
  const onMusicDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragM(false);
    handleMusic(e.dataTransfer.files);
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setVideoFile(null);
    setVideoPreview(null);
    setAnalysis(null);
    setResultUrl(null);
    setResultBlob(null);
    setStage("idle");
  };
  const removeMusic = () => setMusicFile(null);

  const analyze = async () => {
    if (!videoFile) return;
    setStage("analyzing");
    setError(null);
    setProgress(0.15);
    try {
      const result = await analyzeBeats(videoFile);
      setAnalysis(result);
      setStage("ready");
      setProgress(1);
    } catch (e: any) {
      console.error("Beat analysis failed:", e);
      setError(e?.message || "Could not analyze the video's audio. Try a video with a clear soundtrack.");
      setStage("error");
    }
  };

  const sync = async () => {
    if (!videoFile || !musicFile) return;
    setStage("syncing");
    setProgress(0);
    setError(null);
    try {
      const blob = await syncVideoToMusic(
        videoFile,
        musicFile,
        analysis?.beats ?? [],
        analysis?.bpm ?? 0,
        beatsPerCut,
        (p: SyncProgress) => {
          setProgress(p.progress);
          setProgressMsg(p.message ?? "");
        },
        analysis?.duration
      );
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultUrl(url);
      setStage("done");
      setProgress(1);
    } catch (e: any) {
      console.error("Sync failed:", e);
      setError(e?.message || "Sync failed. Try a shorter video or a different music file.");
      setStage("error");
    }
  };

  const download = () => {
    if (!resultBlob || !videoFile) return;
    const a = document.createElement("a");
    a.href = resultUrl!;
    a.download = `${videoFile.name.replace(/\.[^.]+$/, "")}-beatsynced.mp4`;
    a.click();
  };

  const busy = stage === "analyzing" || stage === "syncing";

  return (
    <Layout>
      <div className="container max-w-5xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-boom-primary via-boom-secondary to-boom-accent bg-clip-text text-transparent">
            Auto Music Sync
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Drop your video and a track — we detect the BPM, then cut your clips to the beat and lay the music under them. All in your browser.
          </p>
          <Badge variant="outline" className="gap-1">
            <Wand2 className="h-3 w-3" />
            Rendered locally — video & music never leave your device
          </Badge>
        </div>

        {/* Step 1: Video upload */}
        <Card className="border-dashed border-2 border-border hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-boom-primary" />
              <span>1. Your Video</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!videoFile ? (
              <div
                className={cn(
                  "flex flex-col items-center justify-center space-y-4 py-10 cursor-pointer transition-all",
                  isDragV && "scale-105 opacity-70"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragV(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragV(false); }}
                onDrop={onVideoDrop}
                onClick={() => videoInputRef.current?.click()}
              >
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleVideo(e.target.files)}
                  className="hidden"
                />
                <UploadIcon className="h-14 w-14 text-muted-foreground" />
                <p className="text-lg font-semibold">
                  {isDragV ? "Drop your video!" : "Drag & drop a video here"}
                </p>
                <p className="text-muted-foreground">Or click to select • MP4, MOV, WebM • up to 300MB</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="w-full md:w-64 shrink-0">
                  {videoPreview && (
                    <video src={videoPreview} controls className="w-full rounded-lg bg-black aspect-video object-contain" />
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-boom-primary" />
                    <p className="font-medium truncate">{videoFile.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatSize(videoFile.size)}</p>

                  {stage === "idle" && (
                    <Button onClick={analyze} className="bg-gradient-to-r from-boom-primary to-boom-secondary text-white">
                      <Mic2 className="h-4 w-4 mr-2" />
                      Detect the Beat
                    </Button>
                  )}
                  {stage === "analyzing" && (
                    <div className="space-y-2">
                      <Progress value={progress * 100} className="h-2" />
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Analyzing audio for the beat grid…
                      </p>
                    </div>
                  )}
                  {(stage === "ready" || stage === "syncing" || stage === "done") && analysis && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        {analysis.bpm} BPM
                      </Badge>
                      <Badge variant="outline">{analysis.beats.length} beats found</Badge>
                      <Badge variant="outline">
                        {Math.round(analysis.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={removeVideo} className="text-muted-foreground">
                    <X className="h-4 w-4 mr-2" /> Remove & choose another
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Music upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-boom-secondary" />
              <span>2. The Music</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "flex flex-col items-center justify-center space-y-3 py-8 cursor-pointer rounded-lg border-2 border-dashed transition-all",
                isDragM ? "border-primary/50 opacity-70" : "border-border hover:border-primary/50",
                musicFile && "border-solid border-primary/30"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragM(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragM(false); }}
              onDrop={onMusicDrop}
              onClick={() => musicInputRef.current?.click()}
            >
              <input
                ref={musicInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => handleMusic(e.target.files)}
                className="hidden"
              />
              <Music className="h-10 w-10 text-muted-foreground" />
              {musicFile ? (
                <div className="text-center space-y-1">
                  <p className="font-medium">{musicFile.name}</p>
                  <p className="text-sm text-muted-foreground">{formatSize(musicFile.size)}</p>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeMusic(); }} className="text-muted-foreground">
                    <X className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">Drag & drop a track, or click to browse (MP3, WAV, M4A)</p>
              )}
            </div>
            {analysis && analysis.bpm > 0 && (
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <Info className="h-3 w-3" /> Tip: pick a track close to {analysis.bpm} BPM for the tightest sync.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Settings + Sync */}
        {videoFile && musicFile && (stage === "ready" || stage === "syncing" || stage === "done") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-boom-accent" />
                <span>3. Sync Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Cut every {beatsPerCut} beat{beatsPerCut > 1 ? "s" : ""} — more beats = faster cuts</Label>
                <Slider
                  value={[beatsPerCut]}
                  onValueChange={([v]) => setBeatsPerCut(v)}
                  min={1}
                  max={4}
                  step={1}
                  disabled={busy}
                  className="w-full max-w-md"
                />
                <div className="flex justify-between text-xs text-muted-foreground max-w-md">
                  <span>1 — cut every beat (fastest)</span>
                  <span>4 — slow cuts</span>
                </div>
              </div>

              {stage === "syncing" && (
                <div className="space-y-2">
                  <Progress value={progress * 100} className="h-2" />
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> {progressMsg || "Syncing…"}
                  </p>
                </div>
              )}

              <Button
                size="lg"
                disabled={busy || stage === "done"}
                onClick={sync}
                className="bg-gradient-to-r from-boom-primary to-boom-secondary text-white hover:shadow-lg hover:shadow-boom-primary/25"
              >
                {busy ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing…</>
                ) : (
                  <><PlayCircle className="h-4 w-4 mr-2" /> Sync to the Beat</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {stage === "done" && resultUrl && (
          <Card className="border-green-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Beat-Synced Video Ready</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-black rounded-lg overflow-hidden">
                <video src={resultUrl} controls className="w-full aspect-video object-contain" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={download} className="bg-gradient-to-r from-boom-primary to-boom-secondary text-white">
                  <Download className="h-4 w-4 mr-2" /> Download MP4
                </Button>
                {resultBlob && (
                  <Badge variant="outline">{formatSize(resultBlob.size)}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {stage === "error" && error && (
          <Card className="border-red-500/40">
            <CardContent className="p-4 text-sm text-red-500">{error}</CardContent>
          </Card>
        )}

        {/* How it works */}
        <Card className="bg-card/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <Mic2 className="h-8 w-8 mx-auto text-boom-primary" />
                <p className="font-semibold">1. Detect</p>
                <p className="text-sm text-muted-foreground">We read the BPM and beat grid from your video's audio.</p>
              </div>
              <div className="space-y-2">
                <Music className="h-8 w-8 mx-auto text-boom-secondary" />
                <p className="font-semibold">2. Cut</p>
                <p className="text-sm text-muted-foreground">Clips are trimmed exactly on the beats you choose.</p>
              </div>
              <div className="space-y-2">
                <Download className="h-8 w-8 mx-auto text-boom-accent" />
                <p className="font-semibold">3. Export</p>
                <p className="text-sm text-muted-foreground">Your music is layered under — download and post.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AutoMusicSync;
