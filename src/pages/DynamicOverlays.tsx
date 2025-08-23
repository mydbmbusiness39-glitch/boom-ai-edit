import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Monitor, Play, Pause, Settings, Trash2, Plus, Eye, EyeOff, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout/Layout";

interface DynamicOverlay {
  id: string;
  name: string;
  avatar_id?: string;
  position: string;
  size: string;
  reactions: any;
  trigger_keywords: any;
  style_settings: any;
  created_at: string;
}

interface AiAvatar {
  id: string;
  name: string;
  avatar_type: string;
  status: string;
}

interface Reaction {
  id: string;
  name: string;
  animation: string;
  duration: number;
  trigger_words: string[];
}

const DynamicOverlays = () => {
  const [overlays, setOverlays] = useState<DynamicOverlay[]>([]);
  const [aiAvatars, setAiAvatars] = useState<AiAvatar[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);

  const [newOverlay, setNewOverlay] = useState({
    name: "",
    avatar_id: "",
    position: "bottom-right",
    size: "medium",
    reactions: [] as Reaction[],
    trigger_keywords: [] as string[],
    style_settings: {
      opacity: 85,
      border_radius: 12,
      shadow: true,
      animation_speed: 1.0,
      auto_hide: true,
      hide_delay: 3000
    }
  });

  const [currentReaction, setCurrentReaction] = useState<Reaction>({
    id: "",
    name: "",
    animation: "nod",
    duration: 2000,
    trigger_words: []
  });

  const [keywordInput, setKeywordInput] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    loadOverlays();
    loadAiAvatars();
  }, []);

  const loadOverlays = async () => {
    const { data, error } = await supabase
      .from('dynamic_overlays')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading overlays:', error);
      return;
    }

    setOverlays((data || []).map(overlay => ({
      ...overlay,
      reactions: Array.isArray(overlay.reactions) ? overlay.reactions : [],
      trigger_keywords: Array.isArray(overlay.trigger_keywords) ? overlay.trigger_keywords : [],
      style_settings: typeof overlay.style_settings === 'object' ? overlay.style_settings : {}
    })));
  };

  const loadAiAvatars = async () => {
    const { data, error } = await supabase
      .from('ai_avatars')
      .select('id, name, avatar_type, status')
      .eq('status', 'ready')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading AI avatars:', error);
      return;
    }

    setAiAvatars(data || []);
  };

  const createOverlay = async () => {
    if (!newOverlay.name.trim() || !newOverlay.avatar_id) {
      toast({
        title: "Missing Information",
        description: "Please provide overlay name and select an avatar",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('dynamic_overlays')
        .insert({
          user_id: user.id,
          name: newOverlay.name,
          avatar_id: newOverlay.avatar_id,
          position: newOverlay.position,
          size: newOverlay.size,
          reactions: newOverlay.reactions as any,
          trigger_keywords: newOverlay.trigger_keywords as any,
          style_settings: newOverlay.style_settings as any
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Overlay Created",
        description: "Dynamic overlay has been created successfully!",
      });

      // Reset form
      setNewOverlay({
        name: "",
        avatar_id: "",
        position: "bottom-right",
        size: "medium",
        reactions: [],
        trigger_keywords: [],
        style_settings: {
          opacity: 85,
          border_radius: 12,
          shadow: true,
          animation_speed: 1.0,
          auto_hide: true,
          hide_delay: 3000
        }
      });

      // Reload overlays
      loadOverlays();

    } catch (error: any) {
      console.error('Overlay creation error:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create overlay",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const addReaction = () => {
    if (!currentReaction.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reaction name",
        variant: "destructive"
      });
      return;
    }

    const reaction: Reaction = {
      ...currentReaction,
      id: Date.now().toString(),
    };

    setNewOverlay(prev => ({
      ...prev,
      reactions: [...prev.reactions, reaction]
    }));

    // Reset current reaction
    setCurrentReaction({
      id: "",
      name: "",
      animation: "nod",
      duration: 2000,
      trigger_words: []
    });
  };

  const removeReaction = (reactionId: string) => {
    setNewOverlay(prev => ({
      ...prev,
      reactions: prev.reactions.filter(r => r.id !== reactionId)
    }));
  };

  const addKeyword = () => {
    if (!keywordInput.trim()) return;

    const keywords = keywordInput.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    if (currentReaction.id === "") {
      // Adding to global triggers
      setNewOverlay(prev => ({
        ...prev,
        trigger_keywords: [...prev.trigger_keywords, ...keywords]
      }));
    } else {
      // Adding to current reaction
      setCurrentReaction(prev => ({
        ...prev,
        trigger_words: [...prev.trigger_words, ...keywords]
      }));
    }

    setKeywordInput("");
  };

  const removeKeyword = (keyword: string, isReaction: boolean = false) => {
    if (isReaction) {
      setCurrentReaction(prev => ({
        ...prev,
        trigger_words: prev.trigger_words.filter(k => k !== keyword)
      }));
    } else {
      setNewOverlay(prev => ({
        ...prev,
        trigger_keywords: prev.trigger_keywords.filter(k => k !== keyword)
      }));
    }
  };

  const positions = [
    { value: "top-left", label: "Top Left" },
    { value: "top-right", label: "Top Right" },
    { value: "bottom-left", label: "Bottom Left" },
    { value: "bottom-right", label: "Bottom Right" },
    { value: "center", label: "Center" },
  ];

  const sizes = [
    { value: "small", label: "Small (120px)" },
    { value: "medium", label: "Medium (180px)" },
    { value: "large", label: "Large (240px)" },
  ];

  const animations = [
    { value: "nod", label: "Nod" },
    { value: "shake", label: "Head Shake" },
    { value: "laugh", label: "Laugh" },
    { value: "surprised", label: "Surprised" },
    { value: "thumbs_up", label: "Thumbs Up" },
    { value: "clap", label: "Clap" },
    { value: "wave", label: "Wave" },
    { value: "think", label: "Thinking" },
  ];

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Monitor className="h-8 w-8 text-neon-purple" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
              Dynamic Overlays
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Your AI twin "reacting" in the corner while main video plays (commentary mode)
          </p>
        </div>

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create Overlay</TabsTrigger>
            <TabsTrigger value="reactions">Setup Reactions</TabsTrigger>
            <TabsTrigger value="library">Overlay Library</TabsTrigger>
          </TabsList>

          {/* Create Overlay Tab */}
          <TabsContent value="create" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Overlay Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="overlay-name">Overlay Name</Label>
                    <Input
                      id="overlay-name"
                      placeholder="Gaming Commentary Overlay"
                      value={newOverlay.name}
                      onChange={(e) => setNewOverlay(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Select AI Avatar</Label>
                    <Select
                      value={newOverlay.avatar_id}
                      onValueChange={(value) => setNewOverlay(prev => ({ ...prev, avatar_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an avatar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {aiAvatars.map((avatar) => (
                          <SelectItem key={avatar.id} value={avatar.id}>
                            {avatar.name} ({avatar.avatar_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {aiAvatars.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Create AI avatars in the AI Host section first.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Select
                        value={newOverlay.position}
                        onValueChange={(value) => setNewOverlay(prev => ({ ...prev, position: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {positions.map((pos) => (
                            <SelectItem key={pos.value} value={pos.value}>
                              {pos.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Size</Label>
                      <Select
                        value={newOverlay.size}
                        onValueChange={(value) => setNewOverlay(prev => ({ ...prev, size: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sizes.map((size) => (
                            <SelectItem key={size.value} value={size.value}>
                              {size.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label>Style Settings</Label>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Opacity</Label>
                        <span className="text-sm text-muted-foreground">
                          {newOverlay.style_settings.opacity}%
                        </span>
                      </div>
                      <Slider
                        value={[newOverlay.style_settings.opacity]}
                        onValueChange={(value) => setNewOverlay(prev => ({
                          ...prev,
                          style_settings: { ...prev.style_settings, opacity: value[0] }
                        }))}
                        max={100}
                        min={10}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Animation Speed</Label>
                        <span className="text-sm text-muted-foreground">
                          {newOverlay.style_settings.animation_speed}x
                        </span>
                      </div>
                      <Slider
                        value={[newOverlay.style_settings.animation_speed]}
                        onValueChange={(value) => setNewOverlay(prev => ({
                          ...prev,
                          style_settings: { ...prev.style_settings, animation_speed: value[0] }
                        }))}
                        max={2.0}
                        min={0.5}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm">Auto Hide</Label>
                        <p className="text-xs text-muted-foreground">
                          Hide overlay when no reactions are triggered
                        </p>
                      </div>
                      <Switch
                        checked={newOverlay.style_settings.auto_hide}
                        onCheckedChange={(checked) => setNewOverlay(prev => ({
                          ...prev,
                          style_settings: { ...prev.style_settings, auto_hide: checked }
                        }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm">Drop Shadow</Label>
                        <p className="text-xs text-muted-foreground">
                          Add shadow effect to overlay
                        </p>
                      </div>
                      <Switch
                        checked={newOverlay.style_settings.shadow}
                        onCheckedChange={(checked) => setNewOverlay(prev => ({
                          ...prev,
                          style_settings: { ...prev.style_settings, shadow: checked }
                        }))}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label>Global Trigger Keywords</Label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="awesome, amazing, wow (comma separated)"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                      />
                      <Button onClick={addKeyword} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newOverlay.trigger_keywords.map((keyword, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeKeyword(keyword)}
                        >
                          {keyword} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="h-5 w-5" />
                    <span>Live Preview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gray-900 rounded-lg relative overflow-hidden">
                    {/* Main video placeholder */}
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <Play className="h-16 w-16 text-white/30" />
                      <span className="absolute top-4 left-4 text-white/50 text-sm">Main Video Content</span>
                    </div>

                    {/* Overlay preview */}
                    {newOverlay.avatar_id && (
                      <div 
                        className={`absolute ${
                          newOverlay.position === 'top-left' ? 'top-4 left-4' :
                          newOverlay.position === 'top-right' ? 'top-4 right-4' :
                          newOverlay.position === 'bottom-left' ? 'bottom-4 left-4' :
                          newOverlay.position === 'bottom-right' ? 'bottom-4 right-4' :
                          'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
                        } ${
                          newOverlay.size === 'small' ? 'w-20 h-20' :
                          newOverlay.size === 'medium' ? 'w-28 h-28' :
                          'w-36 h-36'
                        }`}
                        style={{
                          opacity: newOverlay.style_settings.opacity / 100,
                          borderRadius: `${newOverlay.style_settings.border_radius}px`,
                          boxShadow: newOverlay.style_settings.shadow ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
                        }}
                      >
                        <div className="w-full h-full bg-primary/20 rounded-full flex items-center justify-center border-2 border-primary/30">
                          <Monitor className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Preview Mode</Label>
                      <Switch
                        checked={previewMode}
                        onCheckedChange={setPreviewMode}
                      />
                    </div>
                    
                    <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                      <p><strong>Position:</strong> {positions.find(p => p.value === newOverlay.position)?.label}</p>
                      <p><strong>Size:</strong> {sizes.find(s => s.value === newOverlay.size)?.label}</p>
                      <p><strong>Reactions:</strong> {newOverlay.reactions.length} configured</p>
                      <p><strong>Keywords:</strong> {newOverlay.trigger_keywords.length} triggers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button
              onClick={createOverlay}
              disabled={!newOverlay.name.trim() || !newOverlay.avatar_id || isCreating}
              className="w-full bg-gradient-to-r from-neon-purple to-neon-green text-background"
              size="lg"
            >
              {isCreating ? (
                <>
                  <Zap className="h-5 w-5 mr-2 animate-spin" />
                  Creating Overlay...
                </>
              ) : (
                <>
                  <Monitor className="h-5 w-5 mr-2" />
                  Create Dynamic Overlay
                </>
              )}
            </Button>
          </TabsContent>

          {/* Reactions Setup Tab */}
          <TabsContent value="reactions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Add Reaction</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reaction-name">Reaction Name</Label>
                    <Input
                      id="reaction-name"
                      placeholder="Excited Reaction"
                      value={currentReaction.name}
                      onChange={(e) => setCurrentReaction(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Animation Type</Label>
                    <Select
                      value={currentReaction.animation}
                      onValueChange={(value) => setCurrentReaction(prev => ({ ...prev, animation: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {animations.map((anim) => (
                          <SelectItem key={anim.value} value={anim.value}>
                            {anim.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (ms)</Label>
                    <Input
                      type="number"
                      min="500"
                      max="10000"
                      step="100"
                      value={currentReaction.duration}
                      onChange={(e) => setCurrentReaction(prev => ({ ...prev, duration: parseInt(e.target.value) || 2000 }))}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Trigger Words</Label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="wow, amazing, cool"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                      />
                      <Button onClick={addKeyword} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentReaction.trigger_words.map((word, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeKeyword(word, true)}
                        >
                          {word} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={addReaction}
                    disabled={!currentReaction.name.trim()}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Reaction
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Configured Reactions ({newOverlay.reactions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {newOverlay.reactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No reactions configured yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {newOverlay.reactions.map((reaction) => (
                        <div key={reaction.id} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{reaction.name}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeReaction(reaction.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>Animation: {animations.find(a => a.value === reaction.animation)?.label}</p>
                            <p>Duration: {reaction.duration}ms</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {reaction.trigger_words.map((word, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {word}
                                </Badge>
                              ))}
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

          {/* Library Tab */}
          <TabsContent value="library" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Overlay Library ({overlays.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {overlays.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>No dynamic overlays created yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {overlays.map((overlay) => (
                      <Card key={overlay.id} className="overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                          <div className="space-y-1">
                            <h3 className="font-medium">{overlay.name}</h3>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {positions.find(p => p.value === overlay.position)?.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {sizes.find(s => s.value === overlay.size)?.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {overlay.reactions?.length || 0} reactions • {overlay.trigger_keywords?.length || 0} keywords
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setSelectedOverlay(overlay.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
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

export default DynamicOverlays;