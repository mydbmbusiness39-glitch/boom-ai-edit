import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Github, Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

interface GitHubImportProps {
  onImportComplete?: (projectId: string) => void;
}

const GitHubImport = ({ onImportComplete }: GitHubImportProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [repoUrl, setRepoUrl] = useState("https://github.com/mydbmbusiness39-glitch/boom-ai-edit.git");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const extractRepoInfo = (url: string) => {
    try {
      const cleanUrl = url.replace(/\.git$/, '');
      const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) throw new Error('Invalid GitHub URL');
      return { owner: match[1], repo: match[2] };
    } catch (error) {
      throw new Error('Please provide a valid GitHub repository URL');
    }
  };

  const downloadRepoAsZip = async (owner: string, repo: string) => {
    const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`;
    const response = await fetch(zipUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download repository: ${response.statusText}`);
    }
    
    return response.arrayBuffer();
  };

  const createProjectFromRepo = async (repoName: string) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('jobs_new')
      .insert([{
        user_id: user.id,
        name: `Imported: ${repoName}`,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const uploadRepoZip = async (projectId: string, zipData: ArrayBuffer, repoName: string) => {
    if (!user) throw new Error('User not authenticated');

    const fileName = `${repoName}-source.zip`;
    const filePath = `${user.id}/${projectId}/${fileName}`;
    
    // Upload zip file to storage
    const { error: uploadError } = await supabase.storage
      .from('video-uploads')
      .upload(filePath, zipData, {
        contentType: 'application/zip',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Save upload metadata
    const { error: dbError } = await supabase
      .from('uploads')
      .insert({
        user_id: user.id,
        project_id: projectId,
        filename: fileName,
        file_path: filePath,
        file_size: zipData.byteLength,
        mime_type: 'application/zip'
      });

    if (dbError) throw dbError;

    return filePath;
  };

  const handleImport = async () => {
    if (!repoUrl.trim()) {
      toast({
        title: "Invalid URL",
        description: "Please enter a GitHub repository URL",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      // Extract repository information
      setProgress(10);
      const { owner, repo } = extractRepoInfo(repoUrl);
      
      // Create new project
      setProgress(20);
      const projectId = await createProjectFromRepo(repo);
      
      // Download repository as zip
      setProgress(40);
      const zipData = await downloadRepoAsZip(owner, repo);
      
      // Upload zip to project
      setProgress(80);
      await uploadRepoZip(projectId, zipData, repo);
      
      setProgress(100);
      
      toast({
        title: "Import successful",
        description: `Repository "${repo}" imported successfully as a new project.`
      });

      // Reset form
      setRepoUrl("");
      
      // Notify parent component
      onImportComplete?.(projectId);

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import repository. Please try again.",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          Import from GitHub
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Import Process:</p>
            <ul className="space-y-1 text-xs">
              <li>• Downloads the repository as a ZIP file</li>
              <li>• Creates a new project in your dashboard</li>
              <li>• Uploads the source code for you to work with</li>
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="repo-url" className="text-sm font-medium">
            GitHub Repository URL
          </label>
          <Input
            id="repo-url"
            type="url"
            placeholder="https://github.com/username/repository"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={importing}
          />
        </div>

        {importing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              Importing repository... {Math.round(progress)}%
            </p>
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={importing || !repoUrl.trim()}
          className="w-full flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {importing ? "Importing..." : "Import Repository"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GitHubImport;