import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function VoiceDemo() {
  const [log, setLog] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const addLog = (message: string) => {
    setLog(prev => prev + message + "\n");
  };

  const speak = async (text: string) => {
    try {
      setIsSpeaking(true);
      addLog("Generating speech...");
      
      const { data, error } = await supabase.functions.invoke('generate-voice-speech', {
        body: { 
          text, 
          voiceModelId: 'EXAVITQu4vr4xnSDxMaL', // Sarah voice
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
        addLog("Spoke sample line.");
      }
    } catch (error: any) {
      addLog("TTS error: " + error.message);
    } finally {
      setIsSpeaking(false);
    }
  };

  const record = async (duration = 4000): Promise<Blob> => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };

    mediaRecorder.start();
    
    await new Promise(resolve => setTimeout(resolve, duration));
    
    mediaRecorder.stop();
    
    await new Promise(resolve => {
      mediaRecorder.onstop = () => resolve(undefined);
    });

    stream.getTracks().forEach(track => track.stop());
    
    return new Blob(chunks, { type: chunks[0]?.constructor.name === 'Blob' ? 'audio/webm' : 'audio/webm' });
  };

  const transcribe = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "clip.webm");

    const { data, error } = await supabase.functions.invoke('speech-to-text', {
      body: formData
    });

    if (error) throw error;
    return data;
  };

  const handleRecord = async () => {
    try {
      setIsRecording(true);
      addLog("Recording 4 seconds…");
      
      const audioBlob = await record(4000);
      
      addLog("Uploading for transcription…");
      const result = await transcribe(audioBlob);
      
      const transcribedText = result.text || "nothing detected";
      addLog("You said: " + transcribedText);
      
      await speak("You said: " + transcribedText);
    } catch (error: any) {
      addLog("STT/TTS error: " + error.message);
    } finally {
      setIsRecording(false);
    }
  };

  const handleSpeak = async () => {
    await speak("Boom Studio locked in, let's work.");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">🎙️ Boom Studio • Voice Demo</h1>
        <p className="text-lg text-muted-foreground">
          Tap a button (required for mic + playbook on iOS/Safari).
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Voice Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleRecord}
            disabled={isRecording || isSpeaking}
            className="w-full"
            size="lg"
          >
            {isRecording ? "🔴 Recording..." : "🎤 Record 4s & Transcribe"}
          </Button>
          
          <Button 
            onClick={handleSpeak}
            disabled={isRecording || isSpeaking}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {isSpeaking ? "🔊 Speaking..." : "🔊 Say \"Boom Studio locked in.\""}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg min-h-[200px] text-sm font-mono">
            {log || "Activity will appear here..."}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}