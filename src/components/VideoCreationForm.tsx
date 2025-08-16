import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Wand2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface VideoCreationParams {
  media_urls: string[];
  music: "auto" | "upload" | string;
  style: "rgb" | "lux";
  duration: number;
}

const VideoCreationForm = () => {
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [music, setMusic] = useState<string>("auto");
  const [musicUrl, setMusicUrl] = useState("");
  const [style, setStyle] = useState<"rgb" | "lux">("rgb");
  const [duration, setDuration] = useState(20);
  const [jsonInput, setJsonInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const addMediaUrl = () => {
    if (newUrl.trim() && !mediaUrls.includes(newUrl.trim())) {
      setMediaUrls([...mediaUrls, newUrl.trim()]);
      setNewUrl("");
    }
  };

  const removeMediaUrl = (url: string) => {
    setMediaUrls(mediaUrls.filter(u => u !== url));
  };

  const handleJsonSubmit = () => {
    try {
      const parsed = JSON.parse(jsonInput) as VideoCreationParams;
      setMediaUrls(parsed.media_urls || []);
      setMusic(parsed.music || "auto");
      if (parsed.music && !["auto", "upload"].includes(parsed.music)) {
        setMusicUrl(parsed.music);
        setMusic("url");
      }
      setStyle(parsed.style || "rgb");
      setDuration(parsed.duration || 20);
      toast({
        title: "JSON Parameters Loaded",
        description: "Video creation parameters have been imported successfully.",
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please check your JSON format and try again.",
        variant: "destructive",
      });
    }
  };

  const createVideo = async () => {
    setIsLoading(true);
    try {
      const params: VideoCreationParams = {
        media_urls: mediaUrls,
        music: music === "url" ? musicUrl : music as "auto" | "upload",
        style,
        duration,
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Video Creation Started",
        description: "Your video is being processed with the specified parameters.",
      });
      
      // Navigate to status page
      navigate("/status");
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to start video creation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentParams: VideoCreationParams = {
    media_urls: mediaUrls,
    music: music === "url" ? musicUrl : music as "auto" | "upload",
    style,
    duration,
  };

  return (
    <div className="space-y-6">
      {/* JSON Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wand2 className="h-5 w-5 text-neon-purple" />
            <span>Quick JSON Import</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="json-input">Paste JSON Parameters</Label>
            <Textarea
              id="json-input"
              placeholder='{"media_urls": ["https://..."], "music": "auto", "style": "rgb", "duration": 20}'
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="min-h-[100px] font-mono text-sm"
            />
          </div>
          <Button onClick={handleJsonSubmit} variant="outline" className="w-full">
            Import JSON Parameters
          </Button>
        </CardContent>
      </Card>

      {/* Manual Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Video Creation Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Media URLs */}
          <div className="space-y-3">
            <Label>Media URLs</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="https://example.com/video.mp4"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addMediaUrl()}
              />
              <Button onClick={addMediaUrl} variant="outline">
                Add
              </Button>
            </div>
            {mediaUrls.length > 0 && (
              <div className="space-y-2">
                {mediaUrls.map((url, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                    <span className="text-sm truncate flex-1">{url}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMediaUrl(url)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Music Selection */}
          <div className="space-y-3">
            <Label>Music</Label>
            <Select value={music} onValueChange={setMusic}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-generate</SelectItem>
                <SelectItem value="upload">Upload file</SelectItem>
                <SelectItem value="url">Custom URL</SelectItem>
              </SelectContent>
            </Select>
            {music === "url" && (
              <Input
                placeholder="https://example.com/music.mp3"
                value={musicUrl}
                onChange={(e) => setMusicUrl(e.target.value)}
              />
            )}
          </div>

          {/* Style Selection */}
          <div className="space-y-3">
            <Label>Visual Style</Label>
            <div className="flex space-x-2">
              <Button
                variant={style === "rgb" ? "default" : "outline"}
                onClick={() => setStyle("rgb")}
                className="flex-1"
              >
                RGB Style
              </Button>
              <Button
                variant={style === "lux" ? "default" : "outline"}
                onClick={() => setStyle("lux")}
                className="flex-1"
              >
                Lux Style
              </Button>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <Label htmlFor="duration">Duration (seconds)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="300"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 20)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Current Parameters Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Current Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(currentParams, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Create Button */}
      <div className="flex justify-end">
        <Button
          onClick={createVideo}
          disabled={mediaUrls.length === 0 || isLoading}
          className="bg-gradient-to-r from-neon-purple to-neon-green text-background hover:shadow-lg hover:shadow-neon-purple/25"
        >
          {isLoading ? (
            <>
              <Upload className="h-4 w-4 mr-2 animate-spin" />
              Creating Video...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Create Video
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default VideoCreationForm;