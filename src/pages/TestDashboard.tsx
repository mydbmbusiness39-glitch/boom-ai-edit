import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play,
  Plus,
  Activity,
  User,
  Database,
  Settings,
  Zap
} from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import Layout from "@/components/Layout/Layout";

interface TestProject {
  id: string;
  title: string;
  owner: string;
  status: 'active' | 'processing' | 'completed';
  createdAt: string;
}

interface TestSession {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details: string;
}

const TestDashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<TestProject[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTestData();
  }, [user]);

  const loadTestData = () => {
    console.log('🔧 Loading Test Dashboard Data');
    
    // Mock projects data
    const mockProjects: TestProject[] = [
      {
        id: 'p1',
        title: 'Test Project A',
        owner: user?.email || 'unknown',
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'p2', 
        title: 'Video Upload Test',
        owner: user?.email || 'unknown',
        status: 'processing',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'p3',
        title: 'AI Processing Demo',
        owner: user?.email || 'unknown', 
        status: 'completed',
        createdAt: new Date(Date.now() - 7200000).toISOString()
      }
    ];

    // Mock activity sessions
    const mockSessions: TestSession[] = [
      {
        id: 's1',
        userId: user?.id || 'u1',
        action: 'video_upload',
        timestamp: new Date().toISOString(),
        details: 'Uploaded test.mp4 (2.3MB)'
      },
      {
        id: 's2',
        userId: user?.id || 'u1', 
        action: 'ai_processing',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        details: 'Generated 3 clips from video'
      },
      {
        id: 's3',
        userId: user?.id || 'u1',
        action: 'login',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        details: 'User authenticated successfully'
      }
    ];

    setProjects(mockProjects);
    setSessions(mockSessions);
  };

  const createTestSession = () => {
    console.log('🔧 Creating Test Session');
    const newSession: TestSession = {
      id: `s${Date.now()}`,
      userId: user?.id || 'test',
      action: 'test_session',
      timestamp: new Date().toISOString(),
      details: 'Manual test session created'
    };
    
    setSessions(prev => [newSession, ...prev]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-boom-secondary/10 text-boom-secondary border-boom-secondary/20';
      case 'processing': return 'bg-boom-accent/10 text-boom-accent border-boom-accent/20';  
      case 'completed': return 'bg-boom-primary/10 text-boom-primary border-boom-primary/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto p-6 space-y-8">
        {/* Debug Header */}
        <div className="bg-boom-accent/10 border border-boom-accent/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-5 w-5 text-boom-accent" />
            <h1 className="text-xl font-bold text-boom-accent">Phase 2 Testing Dashboard</h1>
            <Badge variant="outline" className="text-boom-accent border-boom-accent">v2.1-test</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Debug mode active • User: {user?.email || 'Not authenticated'} • Console logging enabled
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project List Widget */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Test Projects
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <h3 className="font-medium">{project.title}</h3>
                      <p className="text-sm text-muted-foreground">ID: {project.id}</p>
                    </div>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Quick Start Widget */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={createTestSession}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Test Session
                </Button>
                <Button 
                  onClick={() => console.log('🔧 Refresh Test Data')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Debug Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">User ID:</span>
                  <br />
                  <code className="text-xs bg-muted p-1 rounded">{user?.id?.slice(0, 8) || 'none'}...</code>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Projects:</span> {projects.length}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Sessions:</span> {sessions.length}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Feed Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                  <div className="h-2 w-2 bg-boom-primary rounded-full"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{session.action.replace('_', ' ')}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(session.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{session.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TestDashboard;