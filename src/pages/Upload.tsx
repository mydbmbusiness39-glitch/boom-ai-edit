import { useState, useRef, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Upload as UploadIcon, Video, Image, Music, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout/Layout";
import VideoUpload from "@/components/VideoProcessing/VideoUpload";
import { ClipDetection } from "@/components/VideoProcessing/ClipDetection";
import { AITwin } from "@/components/VideoProcessing/AITwin";
import { BatchProcessing } from "@/components/VideoProcessing/BatchProcessing";
import { SocialShare } from "@/components/VideoProcessing/SocialShare";
import { TestAIFlow } from "@/components/VideoProcessing/TestAIFlow";

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  type: 'video' | 'image' | 'audio';
}

const Upload = () => {
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    // Filter for videos and images only (1-5 videos or 1 image)
    const validFiles = Array.from(files).filter(file => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      return isVideo || isImage;
    });

    const videoFiles = validFiles.filter(f => f.type.startsWith('video/'));
    const imageFiles = validFiles.filter(f => f.type.startsWith('image/'));

    // Validation: 1-5 videos OR 1 image
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

    const newFiles = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      type: file.type.startsWith('video/') ? 'video' as const : 'image' as const
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

              {/* Music Selection */}
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-lg font-semibold mb-4">Choose Music</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all ${selectedMusic === 'auto' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setSelectedMusic('auto')}
                  >
                    <CardContent className="p-4 text-center">
                      <Music className="h-8 w-8 mx-auto mb-2 text-boom-primary" />
                      <p className="font-medium">Auto Music</p>
                      <p className="text-sm text-muted-foreground">AI-generated soundtrack</p>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`cursor-pointer transition-all ${selectedMusic === 'upbeat' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setSelectedMusic('upbeat')}
                  >
                    <CardContent className="p-4 text-center">
                      <Music className="h-8 w-8 mx-auto mb-2 text-boom-secondary" />
                      <p className="font-medium">Upbeat Pop</p>
                      <p className="text-sm text-muted-foreground">Energetic and modern</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className={`cursor-pointer transition-all ${selectedMusic === 'chill' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setSelectedMusic('chill')}
                  >
                    <CardContent className="p-4 text-center">
                      <Music className="h-8 w-8 mx-auto mb-2 text-boom-accent" />
                      <p className="font-medium">Chill Ambient</p>
                      <p className="text-sm text-muted-foreground">Relaxed and atmospheric</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button 
                  className="bg-gradient-to-r from-boom-primary to-boom-secondary text-white hover:shadow-lg hover:shadow-boom-primary/25"
                  disabled={uploadedFiles.length === 0 || !selectedMusic}
                  onClick={() => {
                    // Store data in localStorage for next step
                    localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
                    localStorage.setItem('selectedMusic', selectedMusic);
                    navigate('/style');
                  }}
                >
                  Continue to Style Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Phase 2 AI Features */}
        <div className="space-y-8 mt-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-boom-primary via-boom-secondary to-boom-accent bg-clip-text text-transparent">
              Phase 2: AI Processing Features
            </h2>
            <p className="text-muted-foreground">
              Experience the future of AI-powered video editing with these advanced features
            </p>
          </div>
          
          <ClipDetection />
          <AITwin />
          <BatchProcessing />
          <SocialShare />
          <TestAIFlow />
        </div>
      </div>
    </Layout>
  );
};

export default Upload;