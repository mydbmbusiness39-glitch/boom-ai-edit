import { useCallback, useRef, useState, DragEvent } from "react";
import {
  Upload as UploadIcon,
  Video,
  X,
  RefreshCw,
  Download,
  CheckCircle2,
  Loader2,
  Layers,
  Sparkles,
  Smartphone,
  Monitor,
  Square,
  RectangleHorizontal,
  RectangleVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout/Layout";
import { PLATFORMS, repurposeVideo, downloadBlob, RepurposeProgress } from "@/lib/repurposeEngine";

interface Result {
  presetId: string;
  name: string;
  ratio: string;
  blob: Blob;
  url: string;
  size: number;
}

const getRatioIcon = (ratio: string) => {
  switch (ratio) {
    case "9:16": return <RectangleVertical className="h-4 w-4" />;
    case "16:9": return <RectangleHorizontal className="h-4 w-4" />;
    case "1:1": return <Square className="h-4 w-4" />;
    case "4:5": return <RectangleVertical className="h-4 w-4 rotate-0" />;
    default: return <Smartphone className="h-4 w-4" />;
  }
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const Repurpose = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "tiktok", "yt-shorts", "ig-reels", "yt-wide",
  ]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, RepurposeProgress>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = Array.from(files).find(f => f.type.startsWith("video/"));
    if (!file) {
      alert("Please choose a video file (MP4, MOV, etc.)");
      return;
    }
    if (file.size > 300 * 1024 * 1024) {
      alert("File is too large — please use a video under 300MB");
      return;
    }
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setResults([]);
    setProgressMap({});
  }, [videoPreview]);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const generate = async () => {
    if (!videoFile || selectedPlatforms.length === 0) return;
    setIsProcessing(true);
    setResults([]);
    setProgressMap({});

    const presets = PLATFORMS.filter(p => selectedPlatforms.includes(p.id));
    const baseName = videoFile.name.replace(/\.[^.]+$/, "");
    const newResults: Result[] = [];
    setTotalCount(presets.length);

    for (let i = 0; i < presets.length; i++) {
      const preset = presets[i];
      setCurrentIndex(i);
      try {
        const blob = await repurposeVideo(videoFile, preset, (p) => {
          setProgressMap(prev => ({ ...prev, [preset.id]: p }));
        });
        newResults.push({
          presetId: preset.id,
          name: preset.name,
          ratio: preset.ratio,
          blob,
          url: URL.createObjectURL(blob),
          size: blob.size,
        });
        setResults([...newResults]);
      } catch (e: any) {
        console.error(`Repurpose failed for ${preset.id}:`, e);
        setProgressMap(prev => ({
          ...prev,
          [preset.id]: { platformId: preset.id, progress: 0, stage: "error", message: e?.message || "Failed" },
        }));
      }
    }

    setCurrentIndex(0);
    setIsProcessing(false);
  };

  const downloadAll = () => {
    const baseName = videoFile?.name.replace(/\.[^.]+$/, "") || "video";
    results.forEach((r, i) => {
      const ext = r.blob.type.includes("mp4") ? "mp4" : "webm";
      setTimeout(() => downloadBlob(r.blob, `${baseName}_${r.presetId}_${r.ratio.replace(":", "x")}.${ext}`), i * 300);
    });
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    setResults([]);
    setProgressMap({});
  };

  const allDone = results.length > 0 && !isProcessing;

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-boom-primary via-boom-secondary to-boom-accent bg-clip-text text-transparent">
            Content Repurposer
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            One upload → every platform, every ratio. TikTok, Shorts, Reels, YouTube & more — rendered right in your browser.
          </p>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Rendered locally — your video never leaves your device
          </Badge>
        </div>

        {/* Step 1: Upload */}
        <Card className="border-dashed border-2 border-border hover:border-primary/50 transition-colors">
          <CardContent className="p-8">
            {!videoFile ? (
              <div
                className={cn(
                  "flex flex-col items-center justify-center space-y-4 py-12 cursor-pointer transition-all",
                  isDragActive && "scale-105 opacity-70"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                />
                <div className="relative">
                  <UploadIcon className="h-16 w-16 text-muted-foreground" />
                  {isDragActive && (
                    <div className="absolute inset-0 h-16 w-16 text-boom-primary animate-pulse" />
                  )}
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold">
                    {isDragActive ? "Drop your video!" : "Drag & drop a video here"}
                  </p>
                  <p className="text-muted-foreground">
                    Or click to select • MP4, MOV, WebM • up to 300MB
                  </p>
                </div>
                <Button variant="outline" className="mt-4" type="button">
                  <Video className="h-4 w-4 mr-2" />
                  Choose Video
                </Button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="w-full md:w-56 shrink-0">
                  {videoPreview && (
                    <video
                      src={videoPreview}
                      controls
                      className="w-full rounded-lg bg-black aspect-video object-contain"
                    />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-boom-primary" />
                    <p className="font-medium truncate">{videoFile.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatSize(videoFile.size)}</p>
                  <Button variant="ghost" size="sm" onClick={removeVideo} className="text-muted-foreground">
                    <X className="h-4 w-4 mr-2" />
                    Remove & choose another
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Platforms */}
        {videoFile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Layers className="h-5 w-5 text-boom-primary" />
                <span>Choose Platforms</span>
                <Badge variant="secondary">{selectedPlatforms.length} selected</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {PLATFORMS.map((p) => {
                  const selected = selectedPlatforms.includes(p.id);
                  const progress = progressMap[p.id];
                  return (
                    <Card
                      key={p.id}
                      className={cn(
                        "cursor-pointer transition-all border-2",
                        selected ? "border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10" : "border-border hover:border-primary/50",
                        progress?.stage === "done" && "border-green-500/60",
                        progress?.stage === "error" && "border-red-500/60"
                      )}
                      onClick={() => { if (!isProcessing) togglePlatform(p.id); }}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                            style={{ backgroundColor: p.color }}
                          >
                            {p.platform[0]}
                          </span>
                          <div className="flex items-center gap-2">
                            {progress?.stage === "done" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                            {progress?.stage === "error" && <X className="h-5 w-5 text-red-500" />}
                            <div className={cn(
                              "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                              selected ? "bg-primary border-primary" : "border-muted-foreground/40"
                            )}>
                              {selected && <CheckCircle2 className="h-4 w-4 text-white" />}
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-sm text-muted-foreground">{p.note}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="gap-1">
                            {getRatioIcon(p.ratio)}
                            {p.ratio}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{p.width}×{p.height}</span>
                        </div>
                        {progress && progress.stage !== "done" && progress.stage !== "error" && (
                          <div className="space-y-1">
                            <Progress value={progress.progress * 100} className="h-1.5" />
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              {progress.stage === "loading" && <Loader2 className="h-3 w-3 animate-spin" />}
                              {progress.message || "Processing…"}
                            </p>
                          </div>
                        )}
                        {progress?.stage === "error" && (
                          <p className="text-xs text-red-500 truncate">{progress.message}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 mt-6">
                {isProcessing && totalCount > 0 && (
                  <div className="w-full mb-2">
                    <Progress value={(currentIndex / totalCount) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {results.length} of {totalCount} done
                    </p>
                  </div>
                )}
                {allDone && results.length > 1 && (
                  <Button variant="outline" onClick={downloadAll}>
                    <Download className="h-4 w-4 mr-2" />
                    Download All ({results.length})
                  </Button>
                )}
                <Button
                  size="lg"
                  disabled={!videoFile || selectedPlatforms.length === 0 || isProcessing}
                  onClick={generate}
                  className="bg-gradient-to-r from-boom-primary to-boom-secondary text-white hover:shadow-lg hover:shadow-boom-primary/25"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {(() => {
                        const activePreset = PLATFORMS[currentIndex];
                        return `Working on ${activePreset ? activePreset.name : ""} (${Math.min(currentIndex + 1, totalCount)} of ${totalCount})…`;
                      })()}
                    </>
                  ) : allDone ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Re-generate
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate {selectedPlatforms.length} Version{selectedPlatforms.length > 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Your Repurposed Videos</span>
                <Badge variant="secondary">{results.length} ready</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((r) => (
                  <div key={r.presetId} className="border border-border rounded-lg overflow-hidden group">
                    <div className="bg-black">
                      <video src={r.url} controls className="w-full aspect-video object-contain" />
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="gap-1">
                            {getRatioIcon(r.ratio)}
                            {r.ratio}
                          </Badge>
                          <span className="text-sm font-medium">{r.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatSize(r.size)}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const baseName = videoFile?.name.replace(/\.[^.]+$/, "") || "video";
                          downloadBlob(r.blob, `${baseName}_${r.presetId}_${r.ratio.replace(":", "x")}.mp4`);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download MP4
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* How it works */}
        <Card className="bg-card/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <Smartphone className="h-8 w-8 mx-auto text-boom-primary" />
                <p className="font-semibold">1. Upload once</p>
                <p className="text-sm text-muted-foreground">Drop in your master video — any orientation.</p>
              </div>
              <div className="space-y-2">
                <Monitor className="h-8 w-8 mx-auto text-boom-secondary" />
                <p className="font-semibold">2. Pick platforms</p>
                <p className="text-sm text-muted-foreground">TikTok, Shorts, Reels, IG, Facebook, YouTube.</p>
              </div>
              <div className="space-y-2">
                <Download className="h-8 w-8 mx-auto text-boom-accent" />
                <p className="font-semibold">3. Download & post</p>
                <p className="text-sm text-muted-foreground">Smart-cropped to each ratio, ready to publish.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Repurpose;
