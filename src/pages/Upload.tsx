import { useState, useRef, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Upload as UploadIcon, Video, Image, Music, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout/Layout";
import { supabase } from "@/integrations/supabase/client";

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  type: 'video' | 'image' | 'audio';
}

const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.mov',
  '.m4v',
  '.webm',
]);

const isVideoExtension = (name: string) => {
  const lower = name.toLowerCase();
  for (const ext of VIDEO_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
};

const getFileKind = (file: File) => {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('image/')) return 'image';
  if (isVideoExtension(file.name)) return 'video';
  return null;
};

const Upload = () => {
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const accepted: File[] = [];
    const rejected: string[] = [];

    Array.from(files).forEach(file => {
      const kind = getFileKind(file);
      if (kind === 'video' || kind === 'image') {
        accepted.push(file);
      } else {
        rejected.push(file.name || 'Unnamed file');
      }
    });

    if (rejected.length > 0) {
      alert(`Unsupported file type${rejected.length > 1 ? 's' : ''}: ${rejected.join(', ')}`);
      if (accepted.length === 0) return;
    }

    const videoFiles = accepted.filter(f => getFileKind(f) === 'video');
    const imageFiles = accepted.filter(f => getFileKind(f) === 'image');

    if (videoFiles.length > 0 && imageFiles.length > 0) {
      alert('Please upload either videos OR images, not both');
      return;
    }
    if (videoFiles.length > 5) {
      alert('Maximum 5 videos allowed');
      return;
    }
    if (imageFiles.length > 1) {
      alert('Only 1 image allowed');
      return;
    }

    const newFiles = accepted.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: getFileKind(file) === 'image' ? URL.createObjectURL(file) : undefined,
      type: (getFileKind(file) === 'video' ? 'video' : 'image') as 'video' | 'image',
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-6 w-6" />;
      case 'image': return <Image className="h-6 w-6" />;
      case 'audio': return <Music className="h-6 w-6" />;
      default: return <UploadIcon className="h-6 w-6" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-boom-primary via-boom-secondary to-boom-accent bg-clip-text text-transparent">
            Upload Your Media
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload videos, images, and audio files to get started with your AI-powered video editing project
          </p>
        </div>

        <Card className="border-dashed border-2 border-border hover:border-primary/50 transition-colors">
          <CardContent className="p-8">
            <div
              className={cn(
                "flex flex-col items-center justify-center space-y-4 py-12 cursor-pointer transition-all",
                isDragActive && "scale-105 opacity-70"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={openFileDialog}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,image/*"
                onChange={handleFileInput}
                className="hidden"
              />
              <div className="relative">
                <UploadIcon className="h-16 w-16 text-muted-foreground" />
                {isDragActive && (
                  <div className="absolute inset-0 h-16 w-16 text-boom-primary animate-pulse" />
                )}
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">
                  {isDragActive ? "Drop your files here!" : "Drag & drop files here"}
                </p>
                <p className="text-muted-foreground">
                  Or click to select files • 1-5 videos (MP4, MOV) or 1 image (PNG, JPG)
                </p>
              </div>

              <Button variant="outline" className="mt-4" type="button">
                <Plus className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
            </div>
          </CardContent>
        </Card>

        {uploadedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Uploaded Files</span>
                <Badge variant="secondary">{uploadedFiles.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uploadedFiles.map((uploadedFile) => (
                  <div
                    key={uploadedFile.id}
                    className="relative group border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(uploadedFile.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>

                    <div className="flex items-start space-x-3">
                      <div className="text-boom-primary">
                        {getFileIcon(uploadedFile.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{uploadedFile.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(uploadedFile.file.size)}
                        </p>
                        <Badge variant="outline" className="mt-2">
                          {uploadedFile.type}
                        </Badge>
                      </div>
                    </div>

                    {uploadedFile.preview && (
                      <div className="mt-3">
                        <img
                          src={uploadedFile.preview}
                          alt={uploadedFile.file.name}
                          className="w-full h-24 object-cover rounded"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {uploadedFiles.length > 0 && (
          <div className="flex justify-end mt-6">
            <Button 
              className="bg-gradient-to-r from-boom-primary to-boom-secondary text-white hover:shadow-lg hover:shadow-boom-primary/25"
              disabled={uploadedFiles.length === 0 || !selectedMusic || isUploading}
              onClick={async () => {
                setIsUploading(true);
                try {
                  // Upload files to Supabase Storage (cloud save — survives refresh)
                  const uploaded: any[] = [];
                  const { data: { user } } = await supabase.auth.getUser();
                  const userId = user?.id || 'anon';

                  for (const f of uploadedFiles) {
                    const path = `uploads/${userId}/${Date.now()}-${f.file.name}`;
                    const { data, error } = await supabase.storage
                      .from('videoupload')
                      .upload(path, f.file);
                    if (error) {
                      console.warn('Upload skipped:', error.message);
                      continue;
                    }
                    const { data: { publicUrl } } = supabase.storage
                      .from('videoupload')
                      .getPublicUrl(path);
                    uploaded.push({
                      id: f.id,
                      name: f.file.name,
                      type: f.type,
                      url: publicUrl,
                      size: f.file.size
                    });
                  }

                  // Store data for next step (with cloud URLs)
                  localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
                  localStorage.setItem('uploadedFileUrls', JSON.stringify(uploaded));
                  localStorage.setItem('selectedMusic', selectedMusic);
                  navigate('/style');
                } catch (e) {
                  console.error('Upload error:', e);
                  // Fallback: still proceed with local files
                  localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
                  localStorage.setItem('selectedMusic', selectedMusic);
                  navigate('/style');
                } finally {
                  setIsUploading(false);
                }
              }}
            >
              {isUploading ? 'Uploading...' : 'Continue to Style Selection'}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Upload;
