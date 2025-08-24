import React, { useState } from 'react';
import { Upload, Globe, Mic, Type, Download, RefreshCw, Play, Pause, Volume2, Languages, Sparkles, CheckCircle, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import Layout from '@/components/Layout/Layout';

const VideoDubbing = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('idle');
  const [generatedDubs, setGeneratedDubs] = useState<Record<string, { audioUrl: string; captions: string; transcript: string }>>({});
  const [voiceCloneEnabled, setVoiceCloneEnabled] = useState(true);
  const [originalTranscript, setOriginalTranscript] = useState('');

  const languages = [
    { code: 'es', name: 'Spanish', flag: '🇪🇸', speakers: '500M+' },
    { code: 'fr', name: 'French', flag: '🇫🇷', speakers: '280M+' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳', speakers: '600M+' },
    { code: 'pt', name: 'Portuguese', flag: '🇧🇷', speakers: '260M+' },
    { code: 'de', name: 'German', flag: '🇩🇪', speakers: '100M+' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵', speakers: '125M+' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷', speakers: '77M+' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳', speakers: '1.1B+' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦', speakers: '400M+' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺', speakers: '260M+' },
    { code: 'it', name: 'Italian', flag: '🇮🇹', speakers: '65M+' },
    { code: 'tr', name: 'Turkish', flag: '🇹🇷', speakers: '80M+' },
  ];

  const processingSteps = [
    { id: 'transcribing', label: 'Extracting Audio & Transcript', icon: Type },
    { id: 'translating', label: 'AI Translation', icon: Languages },
    { id: 'cloning', label: 'Voice Cloning & Synthesis', icon: Mic },
    { id: 'captioning', label: 'Generating Captions', icon: Type },
    { id: 'finalizing', label: 'Finalizing Dubs', icon: Volume2 }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setGeneratedDubs({});
      setOriginalTranscript('');
      toast.success('Video uploaded successfully');
    }
  };

  const toggleLanguage = (languageCode: string) => {
    setSelectedLanguages(prev => 
      prev.includes(languageCode)
        ? prev.filter(code => code !== languageCode)
        : [...prev, languageCode]
    );
  };

  const startDubbing = async () => {
    if (!videoFile || selectedLanguages.length === 0) {
      toast.error('Please upload a video and select at least one language');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('transcribing');

    try {
      // Simulate the dubbing process
      const steps = ['transcribing', 'translating', 'cloning', 'captioning', 'finalizing'];
      
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i]);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
        
        if (steps[i] === 'transcribing') {
          setOriginalTranscript('Hello everyone, welcome to this amazing video. Today we are going to explore some incredible features that will transform how you work with video content...');
        }
        
        setProgress((i + 1) * 20);
      }

      // Generate mock dubs for selected languages
      const dubs: Record<string, { audioUrl: string; captions: string; transcript: string }> = {};
      
      for (const langCode of selectedLanguages) {
        const language = languages.find(l => l.code === langCode);
        if (language) {
          dubs[langCode] = {
            audioUrl: `/placeholder.svg?height=100&width=400&text=${language.name}+Audio`,
            captions: generateMockCaptions(language.name),
            transcript: generateMockTranscript(language.name)
          };
        }
      }
      
      setGeneratedDubs(dubs);
      setCurrentStep('complete');
      setProgress(100);
      
      toast.success(`Successfully dubbed video into ${selectedLanguages.length} language(s)!`);
      
    } catch (error) {
      toast.error('Failed to process video dubbing');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateMockCaptions = (languageName: string): string => {
    const mockCaptions = {
      'Spanish': '[00:00] Hola a todos, bienvenidos a este increíble video.\n[00:03] Hoy vamos a explorar algunas características increíbles...',
      'French': '[00:00] Bonjour tout le monde, bienvenue dans cette vidéo incroyable.\n[00:03] Aujourd\'hui, nous allons explorer des fonctionnalités incroyables...',
      'Hindi': '[00:00] सभी को नमस्कार, इस अद्भुत वीडियो में आपका स्वागत है।\n[00:03] आज हम कुछ अविश्वसनीय सुविधाओं का पता लगाएंगे...',
      'Portuguese': '[00:00] Olá pessoal, bem-vindos a este vídeo incrível.\n[00:03] Hoje vamos explorar alguns recursos incríveis...',
    };
    return mockCaptions[languageName as keyof typeof mockCaptions] || `[00:00] Mock captions in ${languageName}...`;
  };

  const generateMockTranscript = (languageName: string): string => {
    const mockTranscripts = {
      'Spanish': 'Hola a todos, bienvenidos a este increíble video. Hoy vamos a explorar algunas características increíbles que transformarán la forma en que trabajas con contenido de video...',
      'French': 'Bonjour tout le monde, bienvenue dans cette vidéo incroyable. Aujourd\'hui, nous allons explorer des fonctionnalités incroyables qui transformeront votre façon de travailler avec le contenu vidéo...',
      'Hindi': 'सभी को नमस्कार, इस अद्भुत वीडियो में आपका स्वागत है। आज हम कुछ अविश्वसनीय सुविधाओं का पता लगाएंगे जो वीडियो सामग्री के साथ आपके काम करने के तरीके को बदल देंगी...',
      'Portuguese': 'Olá pessoal, bem-vindos a este vídeo incrível. Hoje vamos explorar alguns recursos incríveis que transformarão a maneira como vocês trabalham com conteúdo de vídeo...',
    };
    return mockTranscripts[languageName as keyof typeof mockTranscripts] || `Mock transcript in ${languageName}...`;
  };

  const resetForm = () => {
    setVideoFile(null);
    setSelectedLanguages([]);
    setGeneratedDubs({});
    setOriginalTranscript('');
    setIsProcessing(false);
    setProgress(0);
    setCurrentStep('idle');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Globe className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              AI Video Dubbing
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Translate & dub videos into Spanish, French, Hindi, and more. Auto-generate captions with cloned voices to unlock global audience reach.
          </p>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload & Setup</TabsTrigger>
            <TabsTrigger value="languages">Language Selection</TabsTrigger>
            <TabsTrigger value="process">Processing</TabsTrigger>
            <TabsTrigger value="results">Results & Export</TabsTrigger>
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
                    Upload your video file for AI translation and dubbing
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
                      <p className="text-sm text-muted-foreground">Supports MP4, MOV, AVI files up to 2GB</p>
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
                    <Mic className="h-5 w-5" />
                    Dubbing Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="voice-clone">Voice Cloning</Label>
                      <p className="text-xs text-muted-foreground">
                        Clone the original speaker's voice for natural dubbing
                      </p>
                    </div>
                    <Switch
                      id="voice-clone"
                      checked={voiceCloneEnabled}
                      onCheckedChange={setVoiceCloneEnabled}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Original Language Detection</Label>
                    <Select defaultValue="auto">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Audio Quality</Label>
                    <Select defaultValue="high">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="high">High Quality</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI Enhancement</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Our AI will automatically enhance voice clarity, remove background noise, and maintain emotional tone across all languages.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {originalTranscript && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Type className="h-5 w-5" />
                    Original Transcript
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={originalTranscript}
                    onChange={(e) => setOriginalTranscript(e.target.value)}
                    placeholder="Original transcript will appear here..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    You can edit the transcript to improve translation accuracy
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="languages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="h-5 w-5" />
                  Select Target Languages
                </CardTitle>
                <CardDescription>
                  Choose which languages to translate and dub your video into
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {languages.map((language) => (
                    <div
                      key={language.code}
                      onClick={() => toggleLanguage(language.code)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedLanguages.includes(language.code)
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <div className="text-center space-y-2">
                        <div className="text-3xl">{language.flag}</div>
                        <div className="font-medium">{language.name}</div>
                        <div className="text-xs text-muted-foreground">{language.speakers} speakers</div>
                        {selectedLanguages.includes(language.code) && (
                          <CheckCircle className="h-5 w-5 text-primary mx-auto" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedLanguages.length > 0 && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">
                      Selected Languages ({selectedLanguages.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedLanguages.map(code => {
                        const language = languages.find(l => l.code === code);
                        return language ? (
                          <Badge key={code} variant="secondary" className="gap-1">
                            <span>{language.flag}</span>
                            {language.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Total estimated reach: {selectedLanguages.reduce((acc, code) => {
                        const lang = languages.find(l => l.code === code);
                        const speakers = lang?.speakers.replace(/[^\d]/g, '') || '0';
                        return acc + parseInt(speakers);
                      }, 0)}M+ speakers
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="process" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Processing Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentStep === 'idle' && !isProcessing && (
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                      <Globe className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Ready to start dubbing process</p>
                    <Button
                      onClick={startDubbing}
                      disabled={!videoFile || selectedLanguages.length === 0}
                      size="lg"
                      className="px-8"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Start AI Dubbing
                    </Button>
                  </div>
                )}

                {isProcessing && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Overall Progress</span>
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
                      <p className="text-sm">
                        Processing {selectedLanguages.length} language{selectedLanguages.length !== 1 ? 's' : ''}...
                        This may take a few minutes depending on video length.
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
                      <p className="font-medium text-green-600">Dubbing Complete!</p>
                      <p className="text-sm text-muted-foreground">
                        Successfully dubbed video into {selectedLanguages.length} language(s)
                      </p>
                    </div>
                    <Button variant="outline" onClick={resetForm}>
                      Process Another Video
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {Object.keys(generatedDubs).length > 0 ? (
              <div className="grid gap-6">
                {Object.entries(generatedDubs).map(([langCode, dub]) => {
                  const language = languages.find(l => l.code === langCode);
                  if (!language) return null;
                  
                  return (
                    <Card key={langCode}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{language.flag}</span>
                            <span>{language.name} Dub</span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                            <Button size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Translated Transcript</Label>
                            <Textarea
                              value={dub.transcript}
                              readOnly
                              rows={4}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Generated Captions (SRT)</Label>
                            <Textarea
                              value={dub.captions}
                              readOnly
                              rows={4}
                              className="text-sm font-mono"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                          <Volume2 className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Dubbed Audio Track</span>
                              <Badge variant="secondary">AI Generated</Badge>
                            </div>
                            <div className="h-2 bg-muted-foreground/20 rounded-full">
                              <div className="h-full bg-primary rounded-full" style={{width: '45%'}}></div>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Play className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No dubs generated yet</h3>
                  <p className="text-muted-foreground">
                    Upload a video, select languages, and start the dubbing process to see results here
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

export default VideoDubbing;