import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Play, Square } from "lucide-react";
import { toast } from "sonner";

interface AITwinProps {
  textToSpeak?: string;
}

export function AITwin({ textToSpeak }: AITwinProps) {
  const [inputText, setInputText] = useState(textToSpeak || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleGenerateVoice = async () => {
    if (!inputText.trim()) {
      toast.error("Please enter some text first");
      return;
    }

    setIsGenerating(true);
    toast.loading("Generating AI voice...");

    // Simulate voice generation
    setTimeout(() => {
      setIsGenerating(false);
      setAudioUrl("generated-voice.mp3"); // Placeholder
      toast.success("AI voice generated successfully!");
    }, 3000);
  };

  const handlePlayAudio = () => {
    if (audioUrl) {
      setIsPlaying(!isPlaying);
      toast.info(isPlaying ? "Paused" : "Playing AI voice");
    }
  };

  return (
    <Card className="bg-card border-boom-secondary/20 max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
          <Mic className="h-5 w-5 text-boom-secondary" />
          AI Twin Voice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Enter text for your AI Twin to speak..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="min-h-24 bg-background border-boom-secondary/30 focus:border-boom-secondary"
          rows={4}
        />
        
        <div className="flex gap-3">
          <Button 
            onClick={handleGenerateVoice}
            disabled={isGenerating || !inputText.trim()}
            className="bg-boom-secondary hover:bg-boom-secondary/90 text-primary-foreground font-semibold flex-1"
          >
            {isGenerating ? "Generating..." : "Generate Voice"}
          </Button>
          
          {audioUrl && (
            <Button 
              onClick={handlePlayAudio}
              variant="outline"
              className="border-boom-secondary text-boom-secondary hover:bg-boom-secondary/10"
            >
              {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <p className="text-muted-foreground text-sm">
          *AI Twin will speak in your cloned voice with natural intonation*
        </p>
        
        {audioUrl && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-card-foreground font-medium">Voice Generated!</p>
            <p className="text-xs text-muted-foreground">Ready for use in your videos</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}