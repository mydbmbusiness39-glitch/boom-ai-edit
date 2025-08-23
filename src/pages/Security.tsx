import React from 'react';
import { Shield, Lock, Key, Upload } from 'lucide-react';
import Layout from '@/components/Layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TwoFactorSetup from '@/components/Security/TwoFactorSetup';
import ApiTokenManager from '@/components/Security/ApiTokenManager';
import EncryptedUpload from '@/components/Security/EncryptedUpload';

const Security = () => {
  return (
    <Layout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-xl opacity-20 animate-pulse" />
            <Shield className="relative h-16 w-16 text-primary mx-auto" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">
              Security <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Center</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Protect your account and data with advanced security features including two-factor authentication, 
              API token management, and end-to-end encryption.
            </p>
          </div>
        </div>

        {/* Security Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-primary/20">
            <CardHeader className="text-center">
              <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security with TOTP authentication
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-accent/20">
            <CardHeader className="text-center">
              <Key className="h-8 w-8 text-accent mx-auto mb-2" />
              <CardTitle className="text-lg">API Token Management</CardTitle>
              <CardDescription>
                Secure API access with scoped tokens and expiration controls
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-secondary/20">
            <CardHeader className="text-center">
              <Lock className="h-8 w-8 text-secondary mx-auto mb-2" />
              <CardTitle className="text-lg">End-to-End Encryption</CardTitle>
              <CardDescription>
                Encrypt your media files before they leave your device
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Security Features */}
        <Tabs defaultValue="2fa" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="2fa" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Two-Factor Auth
            </TabsTrigger>
            <TabsTrigger value="tokens" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Tokens
            </TabsTrigger>
            <TabsTrigger value="encryption" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Encryption
            </TabsTrigger>
          </TabsList>

          <TabsContent value="2fa" className="mt-6">
            <TwoFactorSetup />
          </TabsContent>

          <TabsContent value="tokens" className="mt-6">
            <ApiTokenManager />
          </TabsContent>

          <TabsContent value="encryption" className="mt-6">
            <div className="space-y-6">
              <EncryptedUpload />
              
              <Card>
                <CardHeader>
                  <CardTitle>How End-to-End Encryption Works</CardTitle>
                  <CardDescription>
                    Understanding our encryption process
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                        Client-Side Encryption
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Files are encrypted on your device using AES-256-GCM encryption before being uploaded.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                        Secure Key Storage
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Encryption keys are stored securely and are only accessible to you.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
                        Integrity Verification
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Each file includes a checksum to verify integrity during decryption.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</div>
                        Zero-Knowledge Architecture
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        We cannot decrypt your files - only you have access to your encryption keys.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Security;