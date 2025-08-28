import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Share2, Facebook, Twitter, Instagram, Music } from "lucide-react";
import { toast } from "sonner";

interface SocialShareProps {
  clipURL?: string;
}

export function SocialShare({ clipURL }: SocialShareProps) {
  const handleShare = (platform: string) => {
    toast.success(`Sharing to ${platform}...`);
    // Simulate sharing delay
    setTimeout(() => {
      toast.success(`Successfully shared to ${platform}!`);
    }, 2000);
  };

  const platforms = [
    { 
      name: "TikTok", 
      icon: Music, 
      color: "bg-black hover:bg-black/90", 
      textColor: "text-white" 
    },
    { 
      name: "Instagram", 
      icon: Instagram, 
      color: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600", 
      textColor: "text-white" 
    },
    { 
      name: "YouTube", 
      icon: Share2, 
      color: "bg-red-600 hover:bg-red-700", 
      textColor: "text-white" 
    },
    { 
      name: "Facebook", 
      icon: Facebook, 
      color: "bg-blue-600 hover:bg-blue-700", 
      textColor: "text-white" 
    },
    { 
      name: "Twitter", 
      icon: Twitter, 
      color: "bg-sky-500 hover:bg-sky-600", 
      textColor: "text-white" 
    }
  ];

  return (
    <Card className="bg-card border-boom-primary/20 max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
          <Share2 className="h-5 w-5 text-boom-primary" />
          Share Your Clips
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-muted-foreground text-center">
          Share your AI-generated clips directly to your favorite social platforms
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {platforms.map((platform) => {
            const IconComponent = platform.icon;
            return (
              <Button
                key={platform.name}
                onClick={() => handleShare(platform.name)}
                className={`${platform.color} ${platform.textColor} font-semibold flex items-center gap-2 h-12`}
              >
                <IconComponent className="h-4 w-4" />
                {platform.name}
              </Button>
            );
          })}
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-semibold text-card-foreground mb-2">Auto-Schedule Options:</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="border-boom-secondary text-boom-secondary hover:bg-boom-secondary/10">
              Post Now
            </Button>
            <Button variant="outline" size="sm" className="border-boom-secondary text-boom-secondary hover:bg-boom-secondary/10">
              Schedule for Peak Hours
            </Button>
            <Button variant="outline" size="sm" className="border-boom-secondary text-boom-secondary hover:bg-boom-secondary/10">
              Cross-Post All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}