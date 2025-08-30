import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, ArrowLeft, File, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import Layout from "@/components/Layout/Layout";

const Upload = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    const uploadedFiles = [];

    try {
      for (const file of Array.from(files)) {
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        
        const { data, error } = await supabase.storage
          .from('uploads')
          .upload(fileName, file);

        if (error) throw error;
        
        uploadedFiles.push({
          name: file.name,
          size: file.size,
          path: data.path
        });
      }

      toast({
        title: "Upload successful",
        description: `${uploadedFiles.length} file(s) uploaded successfully.`
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

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
          <div>
            <h1 className="text-3xl font-bold">Upload</h1>
            <p className="text-muted-foreground">Add clips, then auto-edit.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="h-5 w-5" />
              Upload Media Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Video className="h-8 w-8 text-muted-foreground" />
                </div>
                
                <h3 className="mb-2 text-lg font-medium">
                  Drop your videos here
                </h3>
                
                <p className="mb-4 text-sm text-muted-foreground">
                  Or click to browse and select files from your computer
                </p>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <File className="h-3 w-3" />
                  <span>Supports: MP4, MOV, AVI, MKV (Max 100MB per file)</span>
                </div>
                
                <label htmlFor="file-upload">
                  <Button
                    variant="outline"
                    disabled={uploading}
                    className="cursor-pointer"
                  >
                    {uploading ? "Uploading..." : "Choose Files"}
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept="video/*"
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files)}
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Upload your raw footage</p>
              <p>• AI will analyze and suggest edits</p>
              <p>• Review and customize the timeline</p>
              <p>• Export optimized clips for each platform</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Use good lighting for best results</p>
              <p>• Keep clips under 10 minutes for faster processing</p>
              <p>• Multiple angles? Upload them all!</p>
              <p>• Audio will be automatically enhanced</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Upload;