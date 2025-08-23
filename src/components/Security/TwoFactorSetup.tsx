import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, Smartphone, Key, Copy, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { TOTP } from '@/utils/totp';
import { toast } from 'sonner';

const TwoFactorSetup = () => {
  const { user } = useAuth();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'check' | 'setup' | 'verify' | 'complete'>('check');
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    checkTwoFactorStatus();
  }, [user]);

  const checkTwoFactorStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_security')
      .select('is_2fa_enabled')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setIs2FAEnabled(data.is_2fa_enabled);
    }
  };

  const startSetup = async () => {
    const newSecret = TOTP.generateSecret();
    const codes = TOTP.generateBackupCodes(8);
    const qrUrl = TOTP.generateQRCodeUrl(newSecret, user?.email || 'User');
    
    setSecret(newSecret);
    setBackupCodes(codes);
    setQrCodeUrl(qrUrl);
    setStep('setup');
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    
    try {
      const isValid = await TOTP.verifyTOTP(verificationCode, secret);
      
      if (!isValid) {
        toast.error('Invalid verification code. Please try again.');
        return;
      }

      // Save to database
      const { error } = await supabase
        .from('user_security')
        .upsert({
          user_id: user!.id,
          totp_secret: secret,
          backup_codes: backupCodes,
          is_2fa_enabled: true
        });

      if (error) throw error;

      setIs2FAEnabled(true);
      setStep('complete');
      toast.success('Two-factor authentication enabled successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('user_security')
        .update({
          totp_secret: null,
          backup_codes: null,
          is_2fa_enabled: false
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      setIs2FAEnabled(false);
      setStep('check');
      toast.success('Two-factor authentication disabled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedStates({ ...copiedStates, [key]: true });
    setTimeout(() => {
      setCopiedStates({ ...copiedStates, [key]: false });
    }, 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 'check' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span>Status:</span>
              <Badge variant={is2FAEnabled ? 'default' : 'secondary'}>
                {is2FAEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            
            {is2FAEnabled ? (
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Two-factor authentication is currently enabled for your account.
                  </AlertDescription>
                </Alert>
                <Button variant="destructive" onClick={disable2FA} disabled={loading}>
                  Disable 2FA
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Secure your account by requiring both your password and an authenticator code to sign in.
                  </AlertDescription>
                </Alert>
                <Button onClick={startSetup}>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Enable Two-Factor Authentication
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'setup' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>1. Scan QR Code</Label>
              <p className="text-sm text-muted-foreground">
                Use an authenticator app like Google Authenticator or Authy to scan this QR code:
              </p>
              <div className="flex justify-center p-4 bg-muted rounded-lg">
                <div className="w-48 h-48 bg-white p-2 rounded">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrCodeUrl)}`}
                    alt="2FA QR Code"
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>2. Manual Entry (Alternative)</Label>
              <div className="flex gap-2">
                <Input value={secret} readOnly className="font-mono text-xs" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(secret, 'secret')}
                >
                  {copiedStates.secret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button onClick={() => setStep('verify')} className="w-full">
              Continue
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification-code">Enter Verification Code</Label>
              <Input
                id="verification-code"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-lg font-mono"
                maxLength={6}
              />
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('setup')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={verifyAndEnable} 
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {loading ? 'Verifying...' : 'Enable 2FA'}
              </Button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is now enabled! Save these backup codes in a secure location.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Backup Recovery Codes
              </Label>
              <p className="text-sm text-muted-foreground">
                Use these codes if you lose access to your authenticator app. Each code can only be used once.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <code className="flex-1 font-mono text-sm">{code}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(code, `code-${index}`)}
                    >
                      {copiedStates[`code-${index}`] ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={() => setStep('check')} className="w-full">
              Done
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TwoFactorSetup;