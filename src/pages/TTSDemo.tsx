import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mic } from "lucide-react";

const voices = [
  { id: "9BWtsMINqrJLrRacOk9x", name: "Aria (Female)" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger (Male)" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah (Female)" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura (Female)" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie (Male)" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George (Male)" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam (Male)" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte (Female)" },
];

export default function TTSDemo() {
  const [text, setText] = useState(
    "Hello! Welcome to BOOM AI Text-to-Speech demo. This is a simple example of converting text to natural-sounding speech."
  );
  const [selectedVoice, setSelectedVoice] = useState("9BWtsMINqrJLrRacOk9x");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateSpeech = async () => {
    if (!text.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to convert to speech.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('generate-voice-speech', {
        body: { 
          text: text.trim(),
          voiceModelId: selectedVoice,
          scriptType: 'demo'
        }
      });

      if (error) throw error;

      if (data?.audioContent) {
        // Convert base64 to blob and play
        const binaryString = atob(data.audioContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        await audio.play();
        
        toast({
          title: "Success",
          description: "Speech generated and playing!",
        });
      }
    } catch (error: any) {
      console.error('TTS error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate speech. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-boom-secondary via-boom-primary to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-background/95 backdrop-blur-sm border-border/50">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Mic className="h-6 w-6 text-primary" />
              BOOM AI TTS
            </h1>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Enter Text:
              </label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter the text you want to convert to speech..."
                className="min-h-[120px] resize-none bg-muted/50 border-border"
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground text-right">
                {text.length}/500
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Select Voice:
              </label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger className="bg-muted/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={generateSpeech}
              disabled={isGenerating || !text.trim()}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-boom-secondary to-boom-primary hover:from-boom-secondary/90 hover:to-boom-primary/90 text-white border-0"
            >
              {isGenerating ? "Generating Speech..." : "Generate Speech"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}