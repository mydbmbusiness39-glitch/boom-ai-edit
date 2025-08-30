import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout/Layout";
import ProjectUpload from "@/components/ProjectUpload";

const Project = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
          <h1 className="text-3xl font-bold">Project {id}</h1>
        </div>

        <div className="space-y-6">
          <div className="bg-muted/30 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">Project: {id}</h2>
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