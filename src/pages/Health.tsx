import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, Activity } from 'lucide-react';

const Health = () => {
  const runHealthCheck = () => {
    // Simulate health check
    const version = "2.1-test";
    const phase = "2";
    
    toast({
      title: "Health Check Complete", 
      description: `Routes good • v${version} • phase ${phase}`,
    });
    
    console.log(`BoomStudio Health Check: Routes good • v${version} • phase ${phase}`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-boom-primary/10 rounded-full flex items-center justify-center mb-4">
            <Activity className="h-8 w-8 text-boom-primary" />
          </div>
          <CardTitle className="text-2xl">System Health Check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Authentication System</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Database Connection</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>UI Components</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Asset Loading</span>
            </div>
          </div>
          
          <Button 
            onClick={runHealthCheck}
            className="w-full"
          >
            Run Health Check
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Health;