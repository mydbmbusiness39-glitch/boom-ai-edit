import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Bot, Play, Pause, Download, Zap, Palette, Sparkles, User, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout/Layout";

interface AiAvatar {
  id: string;
  name: string;
  avatar_type: string;
  avatar_url?: string;
  animation_style: string;
  voice_model_id?: string;
  status: string;
  created_at: string;
}

interface VoiceModel {
  id: string;
  name: string;
  status: string;
}

const AiHost = () => {
  const [aiAvatars, setAiAvatars] = useState<AiAvatar[]>([]);
  const [voiceModels, setVoiceModels] = useState<VoiceModel[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  
  const [newAvatar, setNewAvatar] = useState({
    name: "",
    avatar_type: "cartoon",
    animation_style: "friendly",
    voice_model_id: ""
  });

  const [scriptConfig, setScriptConfig] = useState({
    avatar_id: "",
    script_type: "intro",
    custom_text: "",
    style_prompt: "",
    brand_colors: "#6366f1,#8b5cf6"
  });

  const { toast } = useToast();

  useEffect(() => {
    loadAiAvatars();
    loadVoiceModels();
  }, []);

  const loadAiAvatars = async () => {
    const { data, error } = await supabase
      .from('ai_avatars')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading AI avatars:', error);
      return;
    }

    setAiAvatars(data || []);
  };

  const loadVoiceModels = async () => {
    const { data, error } = await supabase
      .from('voice_models')
      .select('id, name, status')
      .eq('status', 'ready')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading voice models:', error);
      return;
    }

    setVoiceModels(data || []);
  };

  const createAiAvatar = async () => {
    if (!newAvatar.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide an avatar name",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create avatar record
      const { data: avatarData, error: avatarError } = await supabase
        .from('ai_avatars')
        .insert({
          user_id: user.id,
          name: newAvatar.name,
          avatar_type: newAvatar.avatar_type,
          animation_style: newAvatar.animation_style,
          voice_model_id: newAvatar.voice_model_id || null,
          status: 'generating'
        })
        .select()
        .single();

      if (avatarError) throw avatarError;

      // Call avatar generation service
      const { data, error } = await supabase.functions.invoke('generate-ai-avatar', {
        body: {
          avatarId: avatarData.id,
          avatarType: newAvatar.avatar_type,
          animationStyle: newAvatar.animation_style,
          name: newAvatar.name
        }
      });

      if (error) throw error;

      toast({
        title: "Avatar Creation Started",
        description: "Your AI avatar is being generated. This may take a few minutes.",
      });

      // Reset form
      setNewAvatar({
        name: "",
        avatar_type: "cartoon",
        animation_style: "friendly",
        voice_model_id: ""
      });

      // Reload avatars
      loadAiAvatars();

    } catch (error: any) {
      console.error('Avatar creation error:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create AI avatar",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateHostVideo = async () => {
    if (!scriptConfig.avatar_id) {
      toast({
        title: "Missing Information",
        description: "Please select an AI avatar",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-host-video', {
        body: {
          avatarId: scriptConfig.avatar_id,
          scriptType: scriptConfig.script_type,
          customText: scriptConfig.custom_text,
          stylePrompt: scriptConfig.style_prompt,
          brandColors: scriptConfig.brand_colors.split(',')
        }
      });

      if (error) throw error;

      toast({
        title: "Host Video Generated",
        description: "Your AI host intro/outro has been created successfully!",
      });

      // Reset form
      setScriptConfig({
        avatar_id: "",
        script_type: "intro",
        custom_text: "",
        style_prompt: "",
        brand_colors: "#6366f1,#8b5cf6"
      });

    } catch (error: any) {
      console.error('Host video generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate host video",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const playPreview = (avatarId: string) => {
    if (isPlaying === avatarId) {
      setIsPlaying(null);
      return;
    }

    // Simulate preview playback
    setIsPlaying(avatarId);
    setTimeout(() => {
      setIsPlaying(null);
    }, 3000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'generating': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const readyAvatars = aiAvatars.filter(avatar => avatar.status === 'ready');

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Bot className="h-8 w-8 text-neon-purple" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
              AI Host & Digital Double
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Create cartoon/digital versions of yourself for auto-generated intros, outros & commentary
          </p>
        </div>

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create Avatar</TabsTrigger>
            <TabsTrigger value="generate">Generate Content</TabsTrigger>
            <TabsTrigger value="library">Avatar Library</TabsTrigger>
          </TabsList>

          {/* Create Avatar Tab */}
          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Create AI Avatar</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="avatar-name">Avatar Name</Label>
                      <Input
                        id="avatar-name"
                        placeholder="My Digital Twin"
                        value={newAvatar.name}
                        onChange={(e) => setNewAvatar(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Avatar Type</Label>
                      <Select
                        value={newAvatar.avatar_type}
                        onValueChange={(value) => setNewAvatar(prev => ({ ...prev, avatar_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cartoon">Cartoon Style</SelectItem>
                          <SelectItem value="realistic">Realistic Digital</SelectItem>
                          <SelectItem value="anime">Anime Style</SelectItem>
                          <SelectItem value="pixar">Pixar Style</SelectItem>
                          <SelectItem value="minimal">Minimal Design</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Animation Style</Label>
                      <Select
                        value={newAvatar.animation_style}
                        onValueChange={(value) => setNewAvatar(prev => ({ ...prev, animation_style: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="friendly">Friendly & Approachable</SelectItem>
                          <SelectItem value="professional">Professional & Serious</SelectItem>
                          <SelectItem value="energetic">High Energy & Exciting</SelectItem>
                          <SelectItem value="calm">Calm & Relaxed</SelectItem>
                          <SelectItem value="playful">Playful & Fun</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Voice Model (Optional)</Label>
                      <Select
                        value={newAvatar.voice_model_id}
                        onValueChange={(value) => setNewAvatar(prev => ({ ...prev, voice_model_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select voice model..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No voice (visual only)</SelectItem>
                          {voiceModels.map((voice) => (
                            <SelectItem key={voice.id} value={voice.id}>
                              {voice.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {voiceModels.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Create voice models in the Voice Cloning section to add speech.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-muted p-6 rounded-lg text-center">
                      <Bot className="h-20 w-20 mx-auto mb-4 text-primary" />
                      <p className="text-sm text-muted-foreground">Avatar Preview</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Your avatar will appear here once generated
                      </p>
                    </div>

                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="font-medium">Style Preview:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <p className="capitalize">{newAvatar.avatar_type}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Style:</span>
                          <p className="capitalize">{newAvatar.animation_style}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={createAiAvatar}
                  disabled={!newAvatar.name.trim() || isGenerating}
                  className="w-full bg-gradient-to-r from-neon-purple to-neon-green text-background"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Zap className="h-5 w-5 mr-2 animate-spin" />
                      Generating Avatar...
                    </>
                  ) : (
                    <>
                      <Bot className="h-5 w-5 mr-2" />
                      Create AI Avatar
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generate Content Tab */}
          <TabsContent value="generate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5" />
                  <span>Generate Host Content</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select AI Avatar</Label>
                      <Select
                        value={scriptConfig.avatar_id}
                        onValueChange={(value) => setScriptConfig(prev => ({ ...prev, avatar_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an avatar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {readyAvatars.map((avatar) => (
                            <SelectItem key={avatar.id} value={avatar.id}>
                              {avatar.name} ({avatar.avatar_type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {readyAvatars.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No ready avatars. Create one in the "Create Avatar" tab.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Content Type</Label>
                      <Select
                        value={scriptConfig.script_type}
                        onValueChange={(value) => setScriptConfig(prev => ({ ...prev, script_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="intro">Video Intro</SelectItem>
                          <SelectItem value="outro">Video Outro</SelectItem>
                          <SelectItem value="transition">Transition Segment</SelectItem>
                          <SelectItem value="cta">Call-to-Action</SelectItem>
                          <SelectItem value="custom">Custom Script</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {scriptConfig.script_type === 'custom' && (
                      <div className="space-y-2">
                        <Label htmlFor="custom-text">Custom Script</Label>
                        <Textarea
                          id="custom-text"
                          placeholder="Enter what your AI host should say..."
                          value={scriptConfig.custom_text}
                          onChange={(e) => setScriptConfig(prev => ({ ...prev, custom_text: e.target.value }))}
                          className="min-h-[100px]"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="style-prompt">Style & Tone (Optional)</Label>
                      <Input
                        id="style-prompt"
                        placeholder="e.g., energetic, professional, casual..."
                        value={scriptConfig.style_prompt}
                        onChange={(e) => setScriptConfig(prev => ({ ...prev, style_prompt: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="brand-colors">Brand Colors</Label>
                      <Input
                        id="brand-colors"
                        placeholder="#6366f1,#8b5cf6"
                        value={scriptConfig.brand_colors}
                        onChange={(e) => setScriptConfig(prev => ({ ...prev, brand_colors: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Comma-separated hex colors for background/elements
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-muted p-6 rounded-lg text-center">
                      <Play className="h-16 w-16 mx-auto mb-4 text-primary" />
                      <p className="text-sm text-muted-foreground">Content Preview</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Generated content will appear here
                      </p>
                    </div>

                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="font-medium">Generation Settings:</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="capitalize">{scriptConfig.script_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avatar:</span>
                          <span>{scriptConfig.avatar_id ? 
                            readyAvatars.find(a => a.id === scriptConfig.avatar_id)?.name || 'Selected' 
                            : 'None'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span>15-30 seconds</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={generateHostVideo}
                  disabled={!scriptConfig.avatar_id || isGenerating}
                  className="w-full bg-gradient-to-r from-neon-purple to-neon-green text-background"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Zap className="h-5 w-5 mr-2 animate-spin" />
                      Generating Content...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate Host Content
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Avatar Library Tab */}
          <TabsContent value="library" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Avatar Library ({aiAvatars.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {aiAvatars.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bot className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>No AI avatars created yet</p>
                    <p className="text-sm mt-2">Create your first avatar to get started</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {aiAvatars.map((avatar) => (
                      <Card key={avatar.id} className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="aspect-video bg-muted flex items-center justify-center">
                            {avatar.avatar_url ? (
                              <img 
                                src={avatar.avatar_url} 
                                alt={avatar.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Bot className="h-16 w-16 text-muted-foreground" />
                            )}
                          </div>
                          <div className="p-4 space-y-3">
                            <div className="space-y-1">
                              <h3 className="font-medium">{avatar.name}</h3>
                              <div className="flex items-center space-x-2">
                                <Badge className={`${getStatusColor(avatar.status)} text-white text-xs`}>
                                  {avatar.status}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {avatar.avatar_type}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {avatar.animation_style} • {new Date(avatar.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => playPreview(avatar.id)}
                                disabled={avatar.status !== 'ready'}
                                className="flex-1"
                              >
                                {isPlaying === avatar.id ? (
                                  <Pause className="h-4 w-4 mr-2" />
                                ) : (
                                  <Play className="h-4 w-4 mr-2" />
                                )}
                                Preview
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={avatar.status !== 'ready'}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AiHost;