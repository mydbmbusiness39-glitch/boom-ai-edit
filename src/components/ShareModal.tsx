import { useState } from "react";
import { Share2, Copy, Facebook, Twitter, X, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  jobTitle: string;
  jobId: string;
}

const ShareModal = ({ isOpen, onClose, videoUrl, jobTitle, jobId }: ShareModalProps) => {
  const [copied, setCopied] = useState(false);
  
  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/share/${jobId}`;
  const shareText = `Check out my AI-generated video: ${jobTitle}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      data-cy="share-modal"
    >
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Share2 className="h-5 w-5 text-neon-purple" />
              <span>Share Your Video</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-cy="close-share-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Video Preview */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video 
              src={videoUrl} 
              className="w-full h-full object-cover"
              muted
              autoPlay
              loop
            />
            <div className="absolute bottom-2 right-2">
              <Badge variant="secondary" className="text-xs">
                BOOM! AI
              </Badge>
            </div>
          </div>

          {/* Share URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Link</label>
            <div className="flex space-x-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={copyToClipboard}
                data-cy="copy-link-button"
                className={cn(
                  "transition-colors",
                  copied && "bg-neon-green/10 text-neon-green border-neon-green"
                )}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Social Media Buttons */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Share on Social Media</label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={shareToTwitter}
                data-cy="share-twitter"
                className="flex items-center justify-center space-x-2"
              >
                <Twitter className="h-4 w-4" />
                <span>Twitter</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={shareToFacebook}
                data-cy="share-facebook"
                className="flex items-center justify-center space-x-2"
              >
                <Facebook className="h-4 w-4" />
                <span>Facebook</span>
              </Button>
            </div>
          </div>

          {/* Direct Video Link */}
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => window.open(videoUrl, '_blank')}
              className="w-full flex items-center justify-center space-x-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Open Video in New Tab</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareModal;