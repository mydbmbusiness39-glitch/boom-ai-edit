import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function VideoUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast.success(`Selected: ${file.name}`);
    }
  };

  const handleStartProcessing = async () => {
    if (!selectedFile) {
      toast.error("Please select a video file first");
      return;
    }
    
    setIsProcessing(true);
    toast.loading("Starting AI processing...");
    
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      toast.success("AI processing started!");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-6">
      <h2 className="text-foreground text-2xl font-bold">Upload Your Video</h2>
      
      <div className="w-full max-w-md">
        <input
          type="file"
          accept="video/mp4,video/mov,video/avi,video/webm"
          onChange={handleFileSelect}
          className="w-full p-3 rounded-lg bg-card text-card-foreground border border-boom-primary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-boom-primary file:text-primary-foreground hover:file:opacity-90"
        />
        
        {selectedFile && (
          <p className="mt-2 text-sm text-muted-foreground">
            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      <Button 
        onClick={handleStartProcessing}
        disabled={!selectedFile || isProcessing}
        className="bg-boom-primary hover:bg-boom-primary/90 text-primary-foreground font-semibold px-8 py-3"
      >
        {isProcessing ? "Processing..." : "Start AI Processing"}
      </Button>
    </div>
  );
}