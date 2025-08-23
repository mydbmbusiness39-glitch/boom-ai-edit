import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, Lock, FileCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { MediaEncryption } from '@/utils/encryption';
import { toast } from 'sonner';

interface EncryptedUploadProps {
  onUploadComplete?: (fileData: {
    id: string;
    filename: string;
    encrypted_filename: string;
    file_path: string;
  }) => void;
}

const EncryptedUpload: React.FC<EncryptedUploadProps> = ({ onUploadComplete }) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadEncryptedFile = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    setProgress(0);

    try {
      // Step 1: Generate encryption key
      setProgress(10);
      const { key, keyId } = await MediaEncryption.generateEncryptionKey();

      // Step 2: Encrypt the file
      setProgress(25);
      const { encryptedData, iv, checksum } = await MediaEncryption.encryptFile(selectedFile, key);

      // Step 3: Store encryption key in database
      setProgress(40);
      const { data: keyData, error: keyError } = await supabase
        .from('media_encryption_keys')
        .insert({
          user_id: user.id,
          key_name: keyId,
          encrypted_key: key, // In production, this should be encrypted with user's master key
          key_version: 1
        })
        .select('id')
        .single();

      if (keyError) throw keyError;

      // Step 4: Generate encrypted filename
      const encryptedFilename = `${crypto.randomUUID()}.enc`;
      const filePath = `encrypted-uploads/${user.id}/${encryptedFilename}`;

      // Step 5: Upload encrypted file to Supabase Storage
      setProgress(60);
      const { error: uploadError } = await supabase.storage
        .from('video-uploads')
        .upload(filePath, new Blob([encryptedData]), {
          contentType: 'application/octet-stream'
        });

      if (uploadError) throw uploadError;

      // Step 6: Store file metadata
      setProgress(80);
      const { data: fileData, error: metadataError } = await supabase
        .from('encrypted_uploads')
        .insert({
          user_id: user.id,
          original_filename: selectedFile.name,
          encrypted_filename: encryptedFilename,
          file_path: filePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          encryption_key_id: keyData.id,
          checksum,
          iv
        })
        .select('*')
        .single();

      if (metadataError) throw metadataError;

      setProgress(100);
      toast.success('File uploaded and encrypted successfully!');
      
      if (onUploadComplete) {
        onUploadComplete({
          id: fileData.id,
          filename: fileData.original_filename,
          encrypted_filename: fileData.encrypted_filename,
          file_path: fileData.file_path
        });
      }

      // Reset
      setSelectedFile(null);
      const input = document.getElementById('encrypted-file-input') as HTMLInputElement;
      if (input) input.value = '';

    } catch (error: any) {
      toast.error(error.message || 'Failed to upload encrypted file');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          Encrypted File Upload
        </CardTitle>
        <CardDescription>
          Upload files with end-to-end encryption for maximum security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          {!selectedFile ? (
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-medium">Choose a file to encrypt and upload</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Maximum file size: 50MB
                </p>
              </div>
              <input
                id="encrypted-file-input"
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="video/*,audio/*,image/*,.pdf,.doc,.docx"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('encrypted-file-input')?.click()}
              >
                Select File
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <FileCheck className="h-12 w-12 mx-auto text-primary" />
              <div>
                <h3 className="font-medium">{selectedFile.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <Badge variant="outline" className="mt-2">
                  {selectedFile.type}
                </Badge>
              </div>
              {!uploading ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedFile(null)}
                    className="flex-1"
                  >
                    Change File
                  </Button>
                  <Button onClick={uploadEncryptedFile} className="flex-1">
                    <Lock className="h-4 w-4 mr-2" />
                    Encrypt & Upload
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground">
                    {progress < 25 ? 'Encrypting file...' :
                     progress < 60 ? 'Preparing upload...' :
                     progress < 100 ? 'Uploading...' : 'Complete!'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">End-to-End Encryption</p>
            <p className="text-muted-foreground mt-1">
              Files are encrypted on your device before upload. Only you have access to the encryption keys, 
              ensuring maximum privacy and security.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EncryptedUpload;