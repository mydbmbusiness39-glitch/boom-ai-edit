import React, { useState } from 'react';
import { Upload, Zap, Eye, Download, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const ThumbnailGenerator = () => {
  const [transcript, setTranscript] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [suggestedHooks, setSuggestedHooks] = useState<string[]>([]);
  const [generatedThumbnails, setGeneratedThumbnails] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState('viral');

  const thumbnailStyles = [
    { id: 'viral', name: 'Viral', description: 'Bright colors, shocked expressions, big text' },
    { id: 'clickbait', name: 'Clickbait', description: 'Red arrows, circles, dramatic effects' },
    { id: 'educational', name: 'Educational', description: 'Clean, professional, informative' },
    { id: 'gaming', name: 'Gaming', description: 'Neon effects, game elements, energy' },
    { id: 'lifestyle', name: 'Lifestyle', description: 'Aesthetic, clean, aspirational' },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      toast.success('Video uploaded successfully');
    }
  };

  const analyzeTranscript = async () => {
    if (!transcript.trim()) {
      toast.error('Please provide a transcript to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Simulate AI analysis - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockTitles = [
        "This ONE Trick Will Change Everything (You Won't Believe It)",
        "I Tried This For 30 Days... The Results Are INSANE",
        "Why Everyone Is Doing This WRONG (The Truth)",
        "The Secret That Companies Don't Want You To Know",
        "This Video Will Save You 10 Years of Mistakes"
      ];
      
      const mockHooks = [
        "What if I told you that everything you know is wrong?",
        "In the next 60 seconds, your life could completely change...",
        "I'm about to reveal something that will blow your mind",
        "Stop what you're doing and listen to this",
        "This is the moment that changed everything for me"
      ];

      setSuggestedTitles(mockTitles);
      setSuggestedHooks(mockHooks);
      toast.success('Analysis complete! Generated viral suggestions');
    } catch (error) {
      toast.error('Failed to analyze transcript');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateThumbnails = async () => {
    if (!videoFile && !transcript.trim()) {
      toast.error('Please upload a video or provide transcript');
      return;
    }

    setIsGenerating(true);
    try {
      // Simulate thumbnail generation - replace with actual AI generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockThumbnails = [
        '/placeholder.svg?height=180&width=320&text=Thumbnail+1',
        '/placeholder.svg?height=180&width=320&text=Thumbnail+2',
        '/placeholder.svg?height=180&width=320&text=Thumbnail+3',
        '/placeholder.svg?height=180&width=320&text=Thumbnail+4',
      ];

      setGeneratedThumbnails(mockThumbnails);
      toast.success('Generated scroll-stopping thumbnails!');
    } catch (error) {
      toast.error('Failed to generate thumbnails');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AI Thumbnail Generator
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Auto-create scroll-stopping YouTube/TikTok thumbnails and get viral title suggestions based on transcript analysis. 
          Instantly increase your CTR and watch starts.
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload & Analyze</TabsTrigger>
          <TabsTrigger value="generate">Generate Thumbnails</TabsTrigger>
          <TabsTrigger value="results">Results & Export</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Video
                </CardTitle>
                <CardDescription>
                  Upload your video file for automatic thumbnail generation
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
                    <p className="text-sm text-muted-foreground">Supports MP4, MOV, AVI files</p>
                  </label>
                </div>
                {videoFile && (
                  <div className="mt-4 p-3 bg-muted rounded-lg flex items-center gap-2">
                    <Badge variant="secondary">Uploaded</Badge>
                    <span className="text-sm">{videoFile.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Transcript Analysis
                </CardTitle>
                <CardDescription>
                  Paste your video transcript for AI-powered viral suggestions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="transcript">Video Transcript</Label>
                  <Textarea
                    id="transcript"
                    placeholder="Paste your video transcript here for AI analysis..."
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={6}
                  />
                </div>
                <Button 
                  onClick={analyzeTranscript} 
                  disabled={isAnalyzing || !transcript.trim()}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing Transcript...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Analyze for Viral Potential
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {(suggestedTitles.length > 0 || suggestedHooks.length > 0) && (
            <div className="grid md:grid-cols-2 gap-6">
              {suggestedTitles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Viral Title Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {suggestedTitles.map((title, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer transition-colors">
                        <p className="font-medium">{title}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {suggestedHooks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Hook Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {suggestedHooks.map((hook, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer transition-colors">
                        <p className="italic">"{hook}"</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thumbnail Style Selection</CardTitle>
              <CardDescription>Choose the style that matches your content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {thumbnailStyles.map((style) => (
                  <div
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedStyle === style.id
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <h3 className="font-medium">{style.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{style.description}</p>
                  </div>
                ))}
              </div>
              <Button 
                onClick={generateThumbnails}
                disabled={isGenerating}
                className="w-full mt-6"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Viral Thumbnails...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Scroll-Stopping Thumbnails
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {generatedThumbnails.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Generated Thumbnails</span>
                  <Badge variant="secondary">{generatedThumbnails.length} thumbnails</Badge>
                </CardTitle>
                <CardDescription>
                  Click on any thumbnail to download or customize further
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {generatedThumbnails.map((thumbnail, index) => (
                    <div key={index} className="space-y-2">
                      <div className="relative group">
                        <img
                          src={thumbnail}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full aspect-video rounded-lg border hover:border-primary transition-colors cursor-pointer"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <Button size="sm" variant="secondary">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Style: {selectedStyle}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No thumbnails generated yet</h3>
                <p className="text-muted-foreground">Upload a video and generate thumbnails to see results here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ThumbnailGenerator;