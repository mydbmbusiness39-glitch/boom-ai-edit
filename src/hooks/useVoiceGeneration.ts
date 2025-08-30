import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VoiceGenerationOptions {
  text: string;
  voice?: string;
  format?: string;
}

interface VoiceGenerationResult {
  audioUrl: string | null;
  isGenerating: boolean;
  error: string | null;
}

export const useVoiceGeneration = () => {
  const [result, setResult] = useState<VoiceGenerationResult>({
    audioUrl: null,
    isGenerating: false,
    error: null,
  });

  const generateVoice = async (options: VoiceGenerationOptions) => {
    if (!options.text.trim()) {
      toast.error("Please enter some text first");
      return;
    }

    setResult(prev => ({ ...prev, isGenerating: true, error: null }));
    toast.loading("Generating AI voice…");

    try {
      // Try to call the voice generation edge function
      const { data, error } = await supabase.functions.invoke('generate-voice-speech', {
        body: {
          text: options.text,
          voiceModelId: options.voice || 'default',
          scriptType: 'general'
        }
      });

      if (error) throw error;

      if (data?.success && data?.audioContent) {
        // Convert base64 to blob URL
        const audioBlob = new Blob([
          new Uint8Array(atob(data.audioContent).split('').map(c => c.charCodeAt(0)))
        ], { type: 'audio/mpeg' });
        
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setResult({
          audioUrl,
          isGenerating: false,
          error: null,
        });
        
        toast.success("AI voice generated successfully!");
        return audioUrl;
      } else {
        throw new Error("Voice generation failed");
      }
    } catch (error) {
      console.warn("Voice API failed, using mock fallback:", error);
      return await useMockVoice();
    }
  };

  const useMockVoice = async () => {
    try {
      // Create a short mock audio blob for fallback
      const mockAudioUrl = "/assets/mock-voice.mp3";
      
      setResult({
        audioUrl: mockAudioUrl,
        isGenerating: false,
        error: null,
      });
      
      toast.success("Mock voice attached (check API keys/config)");
      console.warn("Using MOCK voice due to API failure");
      
      return mockAudioUrl;
    } catch (error) {
      setResult({
        audioUrl: null,
        isGenerating: false,
        error: "Voice generation failed completely",
      });
      
      toast.error("Voice generation failed");
      return null;
    }
  };

  const reset = () => {
    setResult({
      audioUrl: null,
      isGenerating: false,
      error: null,
    });
  };

  return {
    ...result,
    generateVoice,
    reset,
  };
};