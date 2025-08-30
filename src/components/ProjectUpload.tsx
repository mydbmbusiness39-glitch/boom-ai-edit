import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload as UploadIcon, File, Video, RefreshCw, ExternalLink, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

interface ProjectUploadProps {
  projectId: string;
}

interface UploadedFile {
  id: string;
  user_id: string;
  project_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  url?: string;
}

const ProjectUpload = ({ projectId }: ProjectUploadProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate safe path following Display Sync Pack format: {uid}/{project_id}/{safe_filename}
  const makePath = useCallback((fileName: string) => {
    if (!user) return '';
    const safeFileName = fileName.replace(/\s+/g, '_');
    return `${user.id}/${projectId}/${safeFileName}`;
  }, [user, projectId]);

  // Generate public URL for bucket/path
  const toPublicUrl = useCallback((bucket: string, path: string) => {
    return `https://qtvdzxxdydgncrfbtejj.supabase.co/storage/v1/object/public/${bucket}/${path}`;
  }, []);

  // Load uploaded files for this project
  const loadFiles = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsRefreshing(true);
      const { data, error } = await supabase
        .from('uploads')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUploadedFiles(data || []);
    } catch (error) {
      console.error('Error loading files:', error);
      toast({
        title: "Failed to load files",
        description: "Could not load uploaded files.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [user, projectId, toast]);

  // Load files on mount
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        const allowedTypes = ['video/', 'image/', 'audio/', 'application/pdf'];
        if (!allowedTypes.some(type => file.type.startsWith(type))) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a supported file type.`,
            variant: "destructive"
          });
          continue;
        }

        // Validate file size (500MB max)
        const maxSize = 500 * 1024 * 1024;
        if (file.size > maxSize) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds the 500MB limit.`,
            variant: "destructive"
          });
          continue;
        }

        // Generate path following Display Sync Pack format
        const filePath = makePath(file.name);
        
        // Upload directly to storage using the generated path
        const { error: uploadError } = await supabase.storage
          .from('video-uploads')
          .upload(filePath, file, {
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Generate public URL
        const publicUrl = toPublicUrl('video-uploads', filePath);

        // Save upload metadata with all required fields
        const { error: dbError } = await supabase
          .from('uploads')
          .insert({
            user_id: user.id,
            project_id: projectId,
            filename: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type
          });

        if (dbError) throw dbError;

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      toast({
        title: "Upload successful",
        description: `${files.length} file(s) uploaded successfully.`
      });

      // Refresh file list
      await loadFiles();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload files. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
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

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "File URL copied successfully."
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard.",
        variant: "destructive"
      });
    }
  };

  const getPublicUrl = (filePath: string) => {
    return toPublicUrl('video-uploads', filePath);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadIcon className="h-5 w-5" />
            Upload Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
                Drop your files here
              </h3>
              
              <p className="mb-4 text-sm text-muted-foreground">
                Or click to browse and select files from your computer
              </p>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <File className="h-3 w-3" />
                <span>Supports: Video, Image, Audio, PDF (Max 500MB per file)</span>
              </div>
              
              {uploading && (
                <div className="w-full mb-4">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Uploading... {Math.round(uploadProgress)}%
                  </p>
                </div>
              )}
              
              <label htmlFor="file-upload-project">
                <Button
                  variant="outline"
                  disabled={uploading}
                  className="cursor-pointer"
                >
                  {uploading ? "Uploading..." : "Choose Files"}
                </Button>
                <input
                  id="file-upload-project"
                  type="file"
                  className="hidden"
                  accept="video/*,image/*,audio/*,application/pdf"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Files in this project</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={loadFiles}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {uploadedFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No files uploaded yet.</p>
              <p className="text-sm">Upload your first file to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded">
                      {file.mime_type.startsWith('video/') ? (
                        <Video className="h-4 w-4" />
                      ) : (
                        <File className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{file.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.file_size)} • {file.mime_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getPublicUrl(file.file_path))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getPublicUrl(file.file_path), '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectUpload;