import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Copy, RefreshCw, Zap, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Layout from "@/components/Layout/Layout";
import { supabase } from "@/integrations/supabase/client";

const ScriptGenerator = () => {
  const [videoDescription, setVideoDescription] = useState("");
  const [generatedScripts, setGeneratedScripts] = useState<{
    hooks: string[];
    teasers: string[];
  }>({ hooks: [], teasers: [] });
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const viralHookTemplates = [
    "Turn this video into a viral hook",
    "Make this go viral in 5 seconds",
    "Create a TikTok-style hook",
    "Generate a story-driven opener",
    "Make it trend-worthy"
  ];

  const teaserTemplates = [
    "Write a 10 sec teaser",
    "Create a cliffhanger preview",
    "Make a series trailer",
    "Generate anticipation copy",
    "Build suspense in 15 seconds"
  ];

  const generateScripts = async (type: 'hooks' | 'teasers') => {
    if (!videoDescription.trim()) {
      toast({
        title: "Description required",
        description: "Please describe your video first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-script-generator', {
        body: {
          videoDescription,
          type,
          count: 5
        }
      });

      if (error) throw error;

      setGeneratedScripts(prev => ({
        ...prev,
        [type]: data.scripts
      }));

      toast({
        title: "Scripts generated!",
        description: `Generated ${data.scripts.length} ${type}`,
      });
    } catch (error) {
      console.error('Error generating scripts:', error);
      toast({
        title: "Generation failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Script copied to clipboard",
    });
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-80px)] bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-8 w-8 text-neon-purple" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
                AI Script Generator
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Transform your videos into viral content with AI-powered hooks and teasers
            </p>
          </div>

          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-neon-purple" />
                Describe Your Video
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe your video content, theme, target audience, or key moments you want to highlight..."
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                className="min-h-32 resize-none"
              />
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Trending Topics</Badge>
                <Badge variant="outline">Target Audience</Badge>
                <Badge variant="outline">Key Moments</Badge>
                <Badge variant="outline">Emotional Hooks</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Generation Tabs */}
          <Tabs defaultValue="hooks" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="hooks" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Viral Hooks
              </TabsTrigger>
              <TabsTrigger value="teasers" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Teasers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hooks" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Viral Hooks</h3>
                <Button 
                  onClick={() => generateScripts('hooks')}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-neon-purple to-neon-green"
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Hooks
                </Button>
              </div>

              <div className="grid gap-2 mb-4">
                {viralHookTemplates.map((template, index) => (
                  <Badge key={index} variant="secondary" className="justify-start">
                    {template}
                  </Badge>
                ))}
              </div>

              <div className="grid gap-4">
                {generatedScripts.hooks.map((hook, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <p className="flex-1 text-sm leading-relaxed">{hook}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(hook)}
                          className="shrink-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="teasers" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Video Teasers</h3>
                <Button 
                  onClick={() => generateScripts('teasers')}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-neon-purple to-neon-green"
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Teasers
                </Button>
              </div>

              <div className="grid gap-2 mb-4">
                {teaserTemplates.map((template, index) => (
                  <Badge key={index} variant="secondary" className="justify-start">
                    {template}
                  </Badge>
                ))}
              </div>

              <div className="grid gap-4">
                {generatedScripts.teasers.map((teaser, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <p className="flex-1 text-sm leading-relaxed">{teaser}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(teaser)}
                          className="shrink-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default ScriptGenerator;