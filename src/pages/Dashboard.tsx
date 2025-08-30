import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus,
  FolderOpen,
  Settings,
  Play
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import Layout from "@/components/Layout/Layout";

interface Project {
  id: string;
  title: string;
  created_at: string;
  owner: string;
}

const Dashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (user) {
      loadProjects();
      ensureSeedData();
    }
  }, [user]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs_new')
        .select('id, name, created_at, user_id')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedProjects: Project[] = (data || []).map(job => ({
        id: job.id,
        title: job.name,
        created_at: job.created_at,
        owner: job.user_id
      }));
      
      setProjects(mappedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const ensureSeedData = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs_new')
        .select('id')
        .eq('user_id', user?.id)
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        await createProject("Welcome Project");
        toast({
          title: "Welcome!",
          description: "Added a sample project to get you started.",
        });
      }
    } catch (error) {
      console.error('Error checking seed data:', error);
    }
  };

  const createProject = async (title = "Untitled Project") => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('jobs_new')
        .insert([{
          user_id: user.id,
          name: title,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project created successfully",
      });

      if (title === "Untitled Project") {
        navigate(`/project/${data.id}`);
      } else {
        loadProjects();
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive"
      });
    }
  };

  const openProject = (id: string) => {
    navigate(`/project/${id}`);
  };

  const createSession = async () => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from('jobs_new')
        .insert([{
          user_id: user.id,
          name: `Session ${new Date().toLocaleString()}`,
          status: 'pending'
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Session started successfully",
      });

      loadProjects();
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to start session",
        variant: "destructive"
      });
    }
  };


  if (loading) {
    return (
      <Layout>
        <div className="container max-w-6xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="space-y-4">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto p-6 space-y-8">
        {/* Your Projects */}
        <div>
          <h1 className="text-3xl font-bold mb-6">Your Projects</h1>
          
          {projects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">No projects yet. Create your first one.</p>
                <Button onClick={() => createProject()} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <Card key={project.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openProject(project.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{project.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(project.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t"></div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => createProject()} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
            <Button onClick={createSession} variant="secondary" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Start Session
            </Button>
            <Button onClick={() => navigate('/settings')} variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;