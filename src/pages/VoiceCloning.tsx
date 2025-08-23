import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, MicOff, Play, Pause, Download, Upload, Trash2, Zap, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout/Layout";

interface VoiceModel {
  id: string;
  name: string;
  elevenlabs_voice_id?: string;
  sample_audio_url?: string;
  status: string;
  created_at: string;
}

interface VoiceScript {
  id: string;
  voice_model_id: string;
  script_text: string;
  audio_url?: string;
  script_type: string;
  duration_ms?: number;
  created_at: string;
}

const VoiceCloning = () => {
  const [voiceModels, setVoiceModels] = useState<VoiceModel[]>([]);
  const [voiceScripts, setVoiceScripts] = useState<VoiceScript[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [newModelName, setNewModelName] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTraining, setIsTraining] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadVoiceModels();
    loadVoiceScripts();
  }, []);

  const loadVoiceModels = async () => {
    const { data, error } = await supabase
      .from('voice_models')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading voice models:', error);
      return;
    }

    setVoiceModels(data || []);
  };

  const loadVoiceScripts = async () => {
    const { data, error } = await supabase
      .from('voice_scripts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading voice scripts:', error);
      return;
    }

    setVoiceScripts(data || []);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const playAudio = (audioUrl: string, id: string) => {
    if (isPlaying === id) {
      setIsPlaying(null);
      return;
    }

    const audio = new Audio(audioUrl);
    setIsPlaying(id);
    
    audio.onended = () => setIsPlaying(null);
    audio.onerror = () => {
      setIsPlaying(null);
      toast({
        title: "Playback Error",
        description: "Could not play audio file",
        variant: "destructive"
      });
    };
    
    audio.play();
  };

  const trainVoiceModel = async () => {
    if (!audioBlob || !newModelName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please record audio and provide a model name",
        variant: "destructive"
      });
      return;
    }

    setIsTraining(true);

    try {
      // Upload audio to Supabase Storage
      const fileName = `voice-samples/${Date.now()}-sample.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('video-uploads')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('video-uploads')
        .getPublicUrl(fileName);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create voice model record
      const { data: modelData, error: modelError } = await supabase
        .from('voice_models')
        .insert({
          user_id: user.id,
          name: newModelName,
          sample_audio_url: publicUrl,
          status: 'training'
        })
        .select()
        .single();

      if (modelError) throw modelError;

      // Call voice cloning service
      const { data, error } = await supabase.functions.invoke('clone-voice', {
        body: {
          modelId: modelData.id,
          audioUrl: publicUrl,
          modelName: newModelName
        }
      });

      if (error) throw error;

      toast({
        title: "Voice Training Started",
        description: "Your voice model is being trained. This may take a few minutes.",
      });

      // Reset form
      setNewModelName("");
      setAudioBlob(null);
      setRecordingTime(0);
      
      // Reload models
      loadVoiceModels();

    } catch (error: any) {
      console.error('Voice training error:', error);
      toast({
        title: "Training Failed",
        description: error.message || "Failed to train voice model",
        variant: "destructive"
      });
    } finally {
      setIsTraining(false);
    }
  };

  const generateVoiceSpeech = async () => {
    if (!scriptText.trim() || !selectedVoiceId) {
      toast({
        title: "Missing Information",
        description: "Please enter script text and select a voice model",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-voice-speech', {
        body: {
          text: scriptText,
          voiceModelId: selectedVoiceId,
          scriptType: 'custom'
        }
      });

      if (error) throw error;

      toast({
        title: "Speech Generated",
        description: "Your voice script has been generated successfully!",
      });

      // Reset form and reload scripts
      setScriptText("");
      loadVoiceScripts();

    } catch (error: any) {
      console.error('Speech generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate speech",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'training': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const readyModels = voiceModels.filter(model => model.status === 'ready');

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Volume2 className="h-8 w-8 text-neon-purple" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
              Voice Cloning Studio
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Create your AI twin voice that reads typed scripts in your real voice
          </p>
        </div>

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create Voice</TabsTrigger>
            <TabsTrigger value="generate">Generate Speech</TabsTrigger>
            <TabsTrigger value="library">Voice Library</TabsTrigger>
          </TabsList>

          {/* Create Voice Tab */}
          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mic className="h-5 w-5" />
                  <span>Record Voice Sample</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mx-auto relative">
                    {isRecording ? (
                      <>
                        <MicOff className="h-16 w-16 text-red-500" />
                        <div className="absolute inset-0 border-4 border-red-500 rounded-full animate-pulse" />
                      </>
                    ) : (
                      <Mic className="h-16 w-16 text-primary" />
                    )}
                  </div>

                  {isRecording && (
                    <div className="space-y-2">
                      <Progress value={(recordingTime / 120) * 100} className="w-48 mx-auto" />
                      <p className="text-lg font-mono">{formatTime(recordingTime)}</p>
                      <p className="text-sm text-muted-foreground">Recording... (2 min minimum)</p>
                    </div>
                  )}

                  {audioBlob && !isRecording && (
                    <div className="space-y-2">
                      <p className="text-sm text-green-600">✓ Recording Complete ({formatTime(recordingTime)})</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = URL.createObjectURL(audioBlob);
                          playAudio(url, 'preview');
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Preview Recording
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex justify-center space-x-4">
                  {!isRecording ? (
                    <Button 
                      onClick={startRecording}
                      className="bg-gradient-to-r from-neon-purple to-neon-green text-background"
                      size="lg"
                    >
                      <Mic className="h-5 w-5 mr-2" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button 
                      onClick={stopRecording}
                      variant="destructive"
                      size="lg"
                    >
                      <MicOff className="h-5 w-5 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="model-name">Voice Model Name</Label>
                    <Input
                      id="model-name"
                      placeholder="My AI Voice"
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={trainVoiceModel}
                    disabled={!audioBlob || !newModelName.trim() || isTraining}
                    className="w-full"
                    size="lg"
                  >
                    {isTraining ? (
                      <>
                        <Zap className="h-5 w-5 mr-2 animate-spin" />
                        Training Voice Model...
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5 mr-2" />
                        Train Voice Model
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="font-medium">Recording Tips:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Speak clearly and naturally</li>
                    <li>• Record at least 2 minutes for best quality</li>
                    <li>• Use a quiet environment</li>
                    <li>• Vary your tone and emotion</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generate Speech Tab */}
          <TabsContent value="generate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Volume2 className="h-5 w-5" />
                  <span>Generate Speech from Script</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="voice-select">Select Voice Model</Label>
                  <select
                    id="voice-select"
                    value={selectedVoiceId}
                    onChange={(e) => setSelectedVoiceId(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-background"
                  >
                    <option value="">Select a voice model...</option>
                    {readyModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                  {readyModels.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No trained voice models available. Create one in the "Create Voice" tab.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="script">Script Text</Label>
                  <Textarea
                    id="script"
                    placeholder="Enter the text you want your AI twin to speak..."
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {scriptText.length} characters
                  </p>
                </div>

                <Button
                  onClick={generateVoiceSpeech}
                  disabled={!scriptText.trim() || !selectedVoiceId || isGenerating}
                  className="w-full bg-gradient-to-r from-neon-purple to-neon-green text-background"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Zap className="h-5 w-5 mr-2 animate-spin" />
                      Generating Speech...
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-5 w-5 mr-2" />
                      Generate Speech
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Voice Library Tab */}
          <TabsContent value="library" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Voice Models */}
              <Card>
                <CardHeader>
                  <CardTitle>Voice Models ({voiceModels.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {voiceModels.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Volume2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No voice models created yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {voiceModels.map((model) => (
                        <div key={model.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="space-y-1">
                            <p className="font-medium">{model.name}</p>
                            <div className="flex items-center space-x-2">
                              <Badge className={`${getStatusColor(model.status)} text-white`}>
                                {model.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(model.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {model.sample_audio_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => playAudio(model.sample_audio_url!, `model-${model.id}`)}
                              >
                                {isPlaying === `model-${model.id}` ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Generated Scripts */}
              <Card>
                <CardHeader>
                  <CardTitle>Generated Scripts ({voiceScripts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {voiceScripts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No voice scripts generated yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {voiceScripts.map((script) => (
                        <div key={script.id} className="p-3 border rounded-lg space-y-2">
                          <p className="text-sm font-medium truncate">
                            {script.script_text.slice(0, 60)}...
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{script.script_type}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {script.duration_ms && `${Math.round(script.duration_ms / 1000)}s`}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {script.audio_url && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => playAudio(script.audio_url!, `script-${script.id}`)}
                                  >
                                    {isPlaying === `script-${script.id}` ? (
                                      <Pause className="h-4 w-4" />
                                    ) : (
                                      <Play className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = script.audio_url!;
                                      link.download = `script-${script.id}.mp3`;
                                      link.click();
                                    }}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default VoiceCloning;