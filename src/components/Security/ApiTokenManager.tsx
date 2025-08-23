import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Key, Plus, Copy, Trash2, Calendar, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { TokenGenerator } from '@/utils/encryption';
import { toast } from 'sonner';

interface ApiToken {
  id: string;
  name: string;
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

const ApiTokenManager = () => {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTokenData, setNewTokenData] = useState<{
    token: string;
    name: string;
  } | null>(null);

  // Form state
  const [tokenName, setTokenName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['read']);
  const [expiresIn, setExpiresIn] = useState<string>('never');
  const [showToken, setShowToken] = useState(false);

  const availableScopes = [
    { id: 'read', label: 'Read access to your data' },
    { id: 'write', label: 'Create and update data' },
    { id: 'delete', label: 'Delete data' },
    { id: 'upload', label: 'Upload files' },
    { id: 'analytics', label: 'View analytics data' }
  ];

  const expiryOptions = [
    { value: 'never', label: 'Never expires' },
    { value: '7', label: '7 days' },
    { value: '30', label: '30 days' },
    { value: '90', label: '90 days' },
    { value: '365', label: '1 year' }
  ];

  useEffect(() => {
    loadTokens();
  }, [user]);

  const loadTokens = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('api_tokens')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load API tokens');
      return;
    }

    setTokens(data || []);
  };

  const createToken = async () => {
    if (!tokenName.trim()) {
      toast.error('Please enter a token name');
      return;
    }

    setLoading(true);

    try {
      const { token, hash } = await TokenGenerator.generateApiToken();
      
      let expiresAt = null;
      if (expiresIn !== 'never') {
        const days = parseInt(expiresIn);
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      const { error } = await supabase
        .from('api_tokens')
        .insert({
          user_id: user!.id,
          name: tokenName,
          token_hash: hash,
          scopes: selectedScopes,
          expires_at: expiresAt
        });

      if (error) throw error;

      setNewTokenData({ token, name: tokenName });
      setShowCreateDialog(false);
      setTokenName('');
      setSelectedScopes(['read']);
      setExpiresIn('never');
      loadTokens();
      toast.success('API token created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create token');
    } finally {
      setLoading(false);
    }
  };

  const revokeToken = async (tokenId: string, tokenName: string) => {
    if (!confirm(`Are you sure you want to revoke the token "${tokenName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('api_tokens')
        .update({ is_active: false })
        .eq('id', tokenId);

      if (error) throw error;

      loadTokens();
      toast.success('Token revoked successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke token');
    }
  };

  const copyToken = async (token: string) => {
    await navigator.clipboard.writeText(token);
    toast.success('Token copied to clipboard');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isTokenExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* New Token Created Dialog */}
      {newTokenData && (
        <Dialog open={!!newTokenData} onOpenChange={() => setNewTokenData(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API Token Created</DialogTitle>
              <DialogDescription>
                Your new API token has been created. Copy it now as it won't be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Make sure to copy your token now. You won't be able to see it again!
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label>Token Name</Label>
                <Input value={newTokenData.name} readOnly />
              </div>
              
              <div className="space-y-2">
                <Label>API Token</Label>
                <div className="flex gap-2">
                  <Input
                    value={showToken ? newTokenData.token : '•'.repeat(40)}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => copyToken(newTokenData.token)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                API Tokens
              </CardTitle>
              <CardDescription>
                Manage API tokens for secure integrations
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Token
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Token</DialogTitle>
                  <DialogDescription>
                    Create a new API token for secure access to your account
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="token-name">Token Name</Label>
                    <Input
                      id="token-name"
                      placeholder="e.g., Mobile App, Analytics Dashboard"
                      value={tokenName}
                      onChange={(e) => setTokenName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    <div className="space-y-2">
                      {availableScopes.map((scope) => (
                        <div key={scope.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={scope.id}
                            checked={selectedScopes.includes(scope.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedScopes([...selectedScopes, scope.id]);
                              } else {
                                setSelectedScopes(selectedScopes.filter(s => s !== scope.id));
                              }
                            }}
                          />
                          <Label htmlFor={scope.id} className="text-sm font-normal">
                            {scope.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Expiration</Label>
                    <Select value={expiresIn} onValueChange={setExpiresIn}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {expiryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={createToken} 
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Creating...' : 'Create Token'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No API tokens created yet</p>
              <p className="text-sm">Create your first token to get started with API integrations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tokens.map((token) => (
                <Card key={token.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{token.name}</h4>
                          <Badge 
                            variant={
                              !token.is_active ? 'destructive' :
                              isTokenExpired(token.expires_at) ? 'destructive' : 
                              'default'
                            }
                          >
                            {!token.is_active ? 'Revoked' : 
                             isTokenExpired(token.expires_at) ? 'Expired' : 'Active'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Scopes: {token.scopes.join(', ')}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created {formatDate(token.created_at)}
                          </span>
                          {token.expires_at && (
                            <>
                              <span>•</span>
                              <span>
                                Expires {formatDate(token.expires_at)}
                              </span>
                            </>
                          )}
                        </div>
                        {token.last_used_at && (
                          <div className="text-sm text-muted-foreground">
                            Last used {formatDate(token.last_used_at)}
                          </div>
                        )}
                      </div>
                      {token.is_active && !isTokenExpired(token.expires_at) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeToken(token.id, token.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiTokenManager;