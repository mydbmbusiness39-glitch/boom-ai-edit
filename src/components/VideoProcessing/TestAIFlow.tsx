import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";

interface TestItem {
  id: string;
  task: string;
  status: "completed" | "in-progress" | "pending" | "failed";
  description?: string;
}

export function TestAIFlow() {
  const testItems: TestItem[] = [
    { 
      id: "1", 
      task: "Video Upload", 
      status: "completed",
      description: "Multi-format support working"
    },
    { 
      id: "2", 
      task: "AI Clip Detection", 
      status: "completed",
      description: "Viral moments identified"
    },
    { 
      id: "3", 
      task: "Voice Cloning", 
      status: "in-progress",
      description: "ElevenLabs integration active"
    },
    { 
      id: "4", 
      task: "Batch Processing", 
      status: "completed",
      description: "Queue system operational"
    },
    { 
      id: "5", 
      task: "Social API Integration", 
      status: "pending",
      description: "Platform connections ready"
    },
    { 
      id: "6", 
      task: "Auto Captions", 
      status: "in-progress",
      description: "Brand styling applied"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-boom-primary animate-pulse" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 bg-muted rounded-full" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ Done</Badge>;
      case "in-progress":
        return <Badge className="bg-boom-primary/20 text-boom-primary border-boom-primary/30">⏳ Testing</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">✗ Failed</Badge>;
      default:
        return <Badge variant="secondary">⏸ Pending</Badge>;
    }
  };

  const completedCount = testItems.filter(item => item.status === "completed").length;
  const totalCount = testItems.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <Card className="bg-card border-boom-accent/20 max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-card-foreground">
          Phase 2 AI Testing Dashboard
        </CardTitle>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            Progress: {completedCount}/{totalCount} features tested
          </span>
          <Badge className="bg-boom-accent/20 text-boom-accent border-boom-accent/30">
            {progressPercent}% Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {testItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(item.status)}
              <div>
                <h4 className="font-semibold text-card-foreground">{item.task}</h4>
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
              </div>
            </div>
            {getStatusBadge(item.status)}
          </div>
        ))}
        
        <div className="mt-6 p-4 bg-boom-primary/10 border border-boom-primary/20 rounded-lg">
          <h4 className="font-semibold text-card-foreground mb-2">Next Steps:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Connect real AI processing endpoints</li>
            <li>• Integrate social platform APIs</li>
            <li>• Add error handling & retry logic</li>
            <li>• Implement progress tracking</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}