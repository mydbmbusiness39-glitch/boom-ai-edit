import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout/Layout";

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

        <Card>
          <CardHeader>
            <CardTitle>Project Editor</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Edit tools coming next.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              This project workspace will include video editing, AI tools, and collaboration features.
            </p>
            <Button onClick={() => navigate('/upload')} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Upload to this Project
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Project;