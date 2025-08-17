import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Palette, Sparkles, Film, Zap, ArrowRight, Gamepad2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout/Layout";
import { AIStylePreset } from "@/types";

const Style = () => {
  const navigate = useNavigate();
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(15);

  const stylePresets: AIStylePreset[] = [
    {
      id: "rgb-gamer",
      name: "RGB Gamer",
      description: "High-energy gaming aesthetic with vibrant RGB lighting effects",
      thumbnail: "/api/placeholder/300/200",
      category: "gaming",
      parameters: { rgbIntensity: 0.9, saturation: 1.4, energy: 0.8 }
    },
    {
      id: "luxury", 
      name: "Luxury",
      description: "Premium elegant look with sophisticated color grading",
      thumbnail: "/api/placeholder/300/200",
      category: "luxury",
      parameters: { elegance: 0.9, contrast: 1.2, sophistication: 0.8 }
    }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'gaming': return <Gamepad2 className="h-5 w-5" />;
      case 'luxury': return <Crown className="h-5 w-5" />;
      default: return <Palette className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'gaming': return 'text-neon-purple';
      case 'luxury': return 'text-yellow-400';
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
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

        {/* Duration Selection */}
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Video Duration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <span className="text-3xl font-bold text-neon-purple">{duration}s</span>
            </div>
            <input
              type="range"
              min="10"
              max="30"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>10s</span>
              <span>30s</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-8">
          <Button 
            size="lg"
            className="bg-gradient-to-r from-neon-purple to-neon-green text-background hover:shadow-lg hover:shadow-neon-purple/25"
            disabled={!selectedStyle}
            onClick={() => {
              // Store data in localStorage for next step
              localStorage.setItem('selectedStyle', selectedStyle!);
              localStorage.setItem('videoDuration', duration.toString());
              navigate('/editor');
            }}
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