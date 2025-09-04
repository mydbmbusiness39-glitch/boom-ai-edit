import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout/Layout";
import ProjectUpload from "@/components/ProjectUpload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/hooks/use-toast";

const Project = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [projectExists, setProjectExists] = useState(false);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    const checkProject = async () => {
      if (!id || !user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('jobs_new')
          .select('id, name')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error checking project:', error);
          setProjectExists(false);
          toast({
            title: "Project not found",
            description: "This project doesn't exist or you don't have access to it.",
            variant: "destructive"
          });
        } else if (data) {
          setProjectExists(true);
          setProjectName(data.name || `Project ${id}`);
        }
      } catch (error) {
        console.error('Error checking project:', error);
        setProjectExists(false);
        toast({
          title: "Error loading project",
          description: "Failed to load project. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    checkProject();
  }, [id, user, toast]);

  if (loading) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!projectExists) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold">Project Not Found</h1>
          </div>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
            <p className="text-muted-foreground">
              The project you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button 
              onClick={() => navigate('/dashboard')}
              className="mt-4"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">{projectName}</h1>
        </div>

        <div className="space-y-6">
          <div className="bg-muted/30 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">{projectName}</h2>
            <p className="text-muted-foreground text-sm">
              Upload clips, images, or PDFs. Edit tools coming next.
            </p>
          </div>
          
          <ProjectUpload projectId={id || ""} />
        </div>
      </div>
    </Layout>
  );
};

export default Project;