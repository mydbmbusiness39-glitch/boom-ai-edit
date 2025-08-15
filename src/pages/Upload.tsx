import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload as UploadIcon, Video, Image, Music, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout/Layout";

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  type: 'video' | 'image' | 'audio';
}

const Upload = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      type: file.type.startsWith('video/') ? 'video' as const :
            file.type.startsWith('image/') ? 'image' as const :
            'audio' as const
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'audio/*': ['.mp3', '.wav', '.aac']
    }
  });

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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
            Upload Your Media
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload videos, images, and audio files to get started with your AI-powered video editing project
          </p>
        </div>

        <Card className="border-dashed border-2 border-border hover:border-primary/50 transition-colors">
          <CardContent className="p-8">
            <div
              {...getRootProps()}
              className={cn(
                "flex flex-col items-center justify-center space-y-4 py-12 cursor-pointer transition-all",
                isDragActive && "scale-105 opacity-70"
              )}
            >
              <input {...getInputProps()} />
              <div className="relative">
                <UploadIcon className="h-16 w-16 text-muted-foreground" />
                {isDragActive && (
                  <div className="absolute inset-0 h-16 w-16 text-neon-purple animate-pulse" />
                )}
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">
                  {isDragActive ? "Drop your files here!" : "Drag & drop files here"}
                </p>
                <p className="text-muted-foreground">
                  Or click to select files • MP4, MOV, PNG, JPG, MP3, WAV
                </p>
              </div>

              <Button variant="outline" className="mt-4">
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
                      <div className="text-neon-purple">
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

              <div className="flex justify-end mt-6">
                <Button 
                  className="bg-gradient-to-r from-neon-purple to-neon-green text-background hover:shadow-lg hover:shadow-neon-purple/25"
                  disabled={uploadedFiles.length === 0}
                >
                  Continue to Style Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Upload;