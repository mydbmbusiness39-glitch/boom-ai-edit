import { useState } from "react";
import { Palette, Sparkles, Film, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout/Layout";
import { AIStylePreset } from "@/types";

const Style = () => {
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  const stylePresets: AIStylePreset[] = [
    {
      id: "cinematic-1",
      name: "Cinematic Drama",
      description: "Hollywood-style color grading with enhanced contrast and warm tones",
      thumbnail: "/api/placeholder/300/200",
      category: "cinematic",
      parameters: { contrast: 1.3, saturation: 1.1, warmth: 0.2 }
    },
    {
      id: "artistic-1", 
      name: "Artistic Vision",
      description: "Creative art-inspired filters with unique color palettes",
      thumbnail: "/api/placeholder/300/200",
      category: "artistic",
      parameters: { creativity: 0.8, stylization: 0.9 }
    },
    {
      id: "vintage-1",
      name: "Retro Vintage",
      description: "Classic film aesthetic with grain and nostalgic color tones",
      thumbnail: "/api/placeholder/300/200", 
      category: "vintage",
      parameters: { grain: 0.3, sepia: 0.4, vignette: 0.2 }
    },
    {
      id: "modern-1",
      name: "Modern Clean",
      description: "Crisp, clean modern look with enhanced clarity",
      thumbnail: "/api/placeholder/300/200",
      category: "modern", 
      parameters: { clarity: 1.4, sharpness: 1.2, brightness: 0.1 }
    },
    {
      id: "experimental-1",
      name: "AI Experimental",
      description: "Cutting-edge AI-generated visual effects and transformations",
      thumbnail: "/api/placeholder/300/200",
      category: "experimental",
      parameters: { aiStrength: 0.7, innovation: 0.9 }
    },
    {
      id: "cinematic-2",
      name: "Neon Cyber",
      description: "Futuristic cyberpunk aesthetic with neon highlights",
      thumbnail: "/api/placeholder/300/200",
      category: "experimental",
      parameters: { neonGlow: 0.8, contrast: 1.5, cyberpunk: 0.9 }
    }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cinematic': return <Film className="h-5 w-5" />;
      case 'artistic': return <Palette className="h-5 w-5" />;
      case 'vintage': return <Sparkles className="h-5 w-5" />;
      case 'modern': return <Zap className="h-5 w-5" />;
      case 'experimental': return <Sparkles className="h-5 w-5" />;
      default: return <Palette className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cinematic': return 'text-yellow-400';
      case 'artistic': return 'text-pink-400';
      case 'vintage': return 'text-orange-400';
      case 'modern': return 'text-blue-400';
      case 'experimental': return 'text-neon-purple';
      default: return 'text-neon-green';
    }
  };

  return (
    <Layout>
      <div className="container max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
            Choose Your AI Style
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform your videos with AI-powered visual effects and color grading presets
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stylePresets.map((preset) => (
            <Card
              key={preset.id}
              className={cn(
                "cursor-pointer transition-all duration-300 hover:scale-105",
                "border-2 hover:border-primary/50",
                selectedStyle === preset.id && [
                  "border-primary ring-2 ring-primary/20",
                  "shadow-lg shadow-primary/25"
                ]
              )}
              onClick={() => setSelectedStyle(preset.id)}
            >
              <CardHeader className="pb-3">
                <div className="aspect-video bg-muted rounded-lg mb-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
                  <div className="absolute bottom-2 right-2">
                    <div className={cn("p-2 rounded-full bg-background/80", getCategoryColor(preset.category))}>
                      {getCategoryIcon(preset.category)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{preset.name}</CardTitle>
                  <Badge variant="secondary" className="capitalize">
                    {preset.category}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  {preset.description}
                </p>
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {Object.entries(preset.parameters).slice(0, 3).map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-xs">
                      {key}: {typeof value === 'number' ? value.toFixed(1) : value}
                    </Badge>
                  ))}
                </div>

                {selectedStyle === preset.id && (
                  <div className="flex items-center justify-center p-2 bg-primary/10 rounded-lg">
                    <Zap className="h-4 w-4 text-primary mr-2" />
                    <span className="text-sm font-medium text-primary">Selected</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center pt-8">
          <Button 
            size="lg"
            className="bg-gradient-to-r from-neon-purple to-neon-green text-background hover:shadow-lg hover:shadow-neon-purple/25"
            disabled={!selectedStyle}
          >
            Continue to Editor
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Style;