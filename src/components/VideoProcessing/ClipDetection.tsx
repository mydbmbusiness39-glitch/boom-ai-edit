import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Clip {
  id: string;
  timestamp: string;
  title: string;
  type: "funny" | "epic" | "emotional" | "viral";
  score: number;
}

interface ClipDetectionProps {
  videoURL?: string;
  clips?: Clip[];
}

export function ClipDetection({ videoURL, clips }: ClipDetectionProps) {
  const defaultClips: Clip[] = [
    { id: "1", timestamp: "00:12", title: "Funny Moment", type: "funny", score: 95 },
    { id: "2", timestamp: "01:05", title: "Epic Highlight", type: "epic", score: 88 },
    { id: "3", timestamp: "02:30", title: "Emotional Spike", type: "emotional", score: 92 },
    { id: "4", timestamp: "03:15", title: "Viral Potential", type: "viral", score: 97 }
  ];

  const displayClips = clips || defaultClips;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "funny": return "bg-yellow-500/20 text-yellow-400";
      case "epic": return "bg-boom-primary/20 text-boom-primary";
      case "emotional": return "bg-purple-500/20 text-purple-400";
      case "viral": return "bg-green-500/20 text-green-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="bg-card border-boom-primary/20 max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-card-foreground">
          Detected Clips & Highlights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayClips.map((clip) => (
          <div key={clip.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="font-mono">
                {clip.timestamp}
              </Badge>
              <div>
                <h4 className="font-semibold text-card-foreground">{clip.title}</h4>
                <Badge className={getTypeColor(clip.type)} variant="secondary">
                  {clip.type}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-boom-primary">{clip.score}%</div>
              <div className="text-xs text-muted-foreground">viral score</div>
            </div>
          </div>
        ))}
        
        <Button className="w-full bg-boom-primary hover:bg-boom-primary/90 text-primary-foreground font-semibold">
          Export All Clips
        </Button>
      </CardContent>
    </Card>
  );
}