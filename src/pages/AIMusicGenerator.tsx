import React, { useState } from 'react';
import { Music, Upload, BarChart3, Play, Pause, Download, RefreshCw, Sparkles, Volume2, Zap, Clock, CheckCircle, Settings, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import Layout from '@/components/Layout/Layout';

const AIMusicGenerator = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [selectedMood, setSelectedMood] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('idle');
  const [generatedTracks, setGeneratedTracks] = useState<Array<{ id: string; title: string; mood: string; duration: string; bpm: number; audioUrl: string; waveform: string }>>([]);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [musicSettings, setMusicSettings] = useState({
    energy: 70,
    tempo: 120,
    instruments: 'mixed',
    variation: 'medium'
  });

  const moods = [
    { 
      id: 'hype', 
      name: 'Hype', 
      icon: '🔥', 
      description: 'Energetic beats for action, sports, and high-energy content',
      color: 'bg-red-500 text-white',
      bpmRange: '120-140 BPM'
    },
    { 
      id: 'chill', 
      name: 'Chill', 
      icon: '😌', 
      description: 'Relaxed vibes for lifestyle, tutorials, and calm content',
      color: 'bg-blue-500 text-white',
      bpmRange: '80-110 BPM'
    },
    { 
      id: 'cinematic', 
      name: 'Cinematic', 
      icon: '🎬', 
      description: 'Epic orchestral for storytelling and dramatic moments',
      color: 'bg-purple-500 text-white',
      bpmRange: '70-100 BPM'
    },
    { 
      id: 'upbeat', 
      name: 'Upbeat', 
      icon: '✨', 
      description: 'Positive and motivational for brand content',
      color: 'bg-yellow-500 text-white',
      bpmRange: '110-130 BPM'
    },
    { 
      id: 'minimal', 
      name: 'Minimal', 
      icon: '⚪', 
      description: 'Clean and subtle for professional content',
      color: 'bg-gray-500 text-white',
      bpmRange: '90-120 BPM'
    },
    { 
      id: 'electronic', 
      name: 'Electronic', 
      icon: '🤖', 
      description: 'Synthetic beats for tech and futuristic content',
      color: 'bg-cyan-500 text-white',
      bpmRange: '128-140 BPM'
    }
  ];

  const processingSteps = [
    { id: 'analyzing', label: 'Analyzing Video Content', icon: Eye },
    { id: 'composing', label: 'AI Music Composition', icon: Music },
    { id: 'syncing', label: 'Beat Synchronization', icon: BarChart3 },
    { id: 'mastering', label: 'Audio Mastering', icon: Volume2 }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setGeneratedTracks([]);
      setSelectedTrack(null);
      toast.success('Video uploaded successfully');
    }
  };

  const generateMusic = async () => {
    if (!videoFile || !selectedMood) {
      toast.error('Please upload a video and select a mood');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setCurrentStep('analyzing');

    try {
      // Simulate the AI music generation process
      const steps = ['analyzing', 'composing', 'syncing', 'mastering'];
      
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i]);
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
        setProgress((i + 1) * 25);
      }

      // Generate mock tracks
      const mood = moods.find(m => m.id === selectedMood);
      const tracks = [
        {
          id: '1',
          title: `${mood?.name} Beat 1`,
          mood: mood?.name || '',
          duration: '2:30',
          bpm: musicSettings.tempo,
          audioUrl: `/placeholder.svg?height=60&width=300&text=Track+1`,
          waveform: `/placeholder.svg?height=80&width=400&text=Waveform+1`
        },
        {
          id: '2',
          title: `${mood?.name} Beat 2`,
          mood: mood?.name || '',
          duration: '1:45',
          bpm: musicSettings.tempo + 10,
          audioUrl: `/placeholder.svg?height=60&width=300&text=Track+2`,
          waveform: `/placeholder.svg?height=80&width=400&text=Waveform+2`
        },
        {
          id: '3',
          title: `${mood?.name} Beat 3`,
          mood: mood?.name || '',
          duration: '3:15',
          bpm: musicSettings.tempo - 5,
          audioUrl: `/placeholder.svg?height=60&width=300&text=Track+3`,
          waveform: `/placeholder.svg?height=80&width=400&text=Waveform+3`
        }
      ];

      setGeneratedTracks(tracks);
      setSelectedTrack(tracks[0].id);
      setCurrentStep('complete');
      setProgress(100);
      
      toast.success(`Generated ${tracks.length} royalty-free tracks!`);
      
    } catch (error) {
      toast.error('Failed to generate music');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const resetForm = () => {
    setVideoFile(null);
    setSelectedMood('');
    setGeneratedTracks([]);
    setSelectedTrack(null);
    setIsGenerating(false);
    setProgress(0);
    setCurrentStep('idle');
    setIsPlaying(false);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Music className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              AI Music Generator
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            AI composes royalty-free beats matched to mood: hype, chill, cinematic. Syncs audio drops with clip highlights automatically. No need to license or hunt for tracks.
          </p>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload & Settings</TabsTrigger>
            <TabsTrigger value="moods">Select Mood</TabsTrigger>
            <TabsTrigger value="generate">Generate Music</TabsTrigger>
            <TabsTrigger value="results">Tracks & Export</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Video Upload
                  </CardTitle>
                  <CardDescription>
                    Upload your video to analyze content and generate matching music
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="video-upload"
                    />
                    <label htmlFor="video-upload" className="cursor-pointer space-y-2">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="font-medium">Drop your video here or click to browse</p>
                      <p className="text-sm text-muted-foreground">AI will analyze the content to match music</p>
                    </label>
                  </div>
                  {videoFile && (
                    <div className="mt-4 p-3 bg-muted rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Uploaded</Badge>
                        <span className="text-sm">{videoFile.name}</span>
                      </div>
                      <Badge variant="outline">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Music Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Energy Level: {musicSettings.energy}%</Label>
                    <Slider
                      value={[musicSettings.energy]}
                      onValueChange={([value]) => setMusicSettings(prev => ({ ...prev, energy: value }))}
                      max={100}
                      step={10}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Calm</span>
                      <span>High Energy</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tempo (BPM): {musicSettings.tempo}</Label>
                    <Slider
                      value={[musicSettings.tempo]}
                      onValueChange={([value]) => setMusicSettings(prev => ({ ...prev, tempo: value }))}
                      min={60}
                      max={180}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Slow</span>
                      <span>Fast</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Instruments</Label>
                    <Select
                      value={musicSettings.instruments}
                      onValueChange={(value) => setMusicSettings(prev => ({ ...prev, instruments: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electronic">Electronic</SelectItem>
                        <SelectItem value="orchestral">Orchestral</SelectItem>
                        <SelectItem value="acoustic">Acoustic</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="auto-sync">Auto-Sync with Highlights</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically sync beat drops with video highlights
                      </p>
                    </div>
                    <Switch
                      id="auto-sync"
                      checked={autoSync}
                      onCheckedChange={setAutoSync}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="moods" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Select Music Mood
                </CardTitle>
                <CardDescription>
                  Choose the mood that matches your content for AI music generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {moods.map((mood) => (
                    <div
                      key={mood.id}
                      onClick={() => setSelectedMood(mood.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedMood === mood.id
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${mood.color}`}>
                            <span className="text-xl">{mood.icon}</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{mood.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {mood.bpmRange}
                            </Badge>
                          </div>
                          {selectedMood === mood.id && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{mood.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedMood && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Music className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Selected Mood</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{moods.find(m => m.id === selectedMood)?.icon}</span>
                      <span className="font-medium">{moods.find(m => m.id === selectedMood)?.name}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  AI Music Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentStep === 'idle' && !isGenerating && (
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                      <Music className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Ready to generate royalty-free music</p>
                    <Button
                      onClick={generateMusic}
                      disabled={!videoFile || !selectedMood}
                      size="lg"
                      className="px-8"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate AI Music
                    </Button>
                  </div>
                )}

                {isGenerating && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Generation Progress</span>
                        <span className="text-sm text-muted-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      {processingSteps.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = currentStep === step.id;
                        const isComplete = processingSteps.findIndex(s => s.id === currentStep) > index;
                        
                        return (
                          <div key={step.id} className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isComplete ? "bg-green-500 text-white" :
                              isActive ? "bg-primary text-primary-foreground" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {isComplete ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : isActive ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Icon className="h-4 w-4" />
                              )}
                            </div>
                            <span className={`text-sm ${
                              isActive ? "font-medium text-foreground" :
                              isComplete ? "text-green-600" :
                              "text-muted-foreground"
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">AI Processing</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Analyzing video highlights and generating {moods.find(m => m.id === selectedMood)?.name.toLowerCase()} beats...
                      </p>
                    </div>
                  </div>
                )}

                {currentStep === 'complete' && (
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium text-green-600">Music Generation Complete!</p>
                      <p className="text-sm text-muted-foreground">
                        Generated {generatedTracks.length} royalty-free tracks
                      </p>
                    </div>
                    <Button variant="outline" onClick={resetForm}>
                      Generate More Music
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {generatedTracks.length > 0 ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Generated Tracks</span>
                      <Badge variant="secondary">{generatedTracks.length} tracks</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {generatedTracks.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => setSelectedTrack(track.id)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedTrack === track.id
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePlayback();
                              }}
                            >
                              {isPlaying && selectedTrack === track.id ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <div>
                              <h4 className="font-medium">{track.title}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {track.mood}
                                </Badge>
                                <span>{track.duration}</span>
                                <span>{track.bpm} BPM</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-2" />
                              Preview with Video
                            </Button>
                            <Button size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                        
                        {/* Waveform Visualization */}
                        <div className="bg-muted/50 rounded-lg p-3">
                          <img
                            src={track.waveform}
                            alt="Audio waveform"
                            className="w-full h-16 rounded opacity-80"
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Sync Points
                  </CardTitle>
                    <CardDescription>
                      AI-detected highlights where music syncs with video
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-2xl font-bold text-primary">4</div>
                        <div className="text-xs text-muted-foreground">Beat Drops</div>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">7</div>
                        <div className="text-xs text-muted-foreground">Sync Points</div>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">98%</div>
                        <div className="text-xs text-muted-foreground">Match Score</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No tracks generated yet</h3>
                  <p className="text-muted-foreground">
                    Upload a video, select a mood, and generate music to see royalty-free tracks here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AIMusicGenerator;