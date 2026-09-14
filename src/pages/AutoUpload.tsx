import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Link2, Settings, Upload, CheckCircle, AlertTriangle, Zap, ExternalLink, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { readEdgeFunctionError } from "@/utils/edgeFunctionError";
import Layout from "@/components/Layout/Layout";

interface SocialAccount {
  platform: string;
  /** DB `social_accounts.platform` key — never derive this from the display name. */
  platformKey: "tiktok" | "youtube" | "facebook" | "instagram";
  /** Which Edge function owns the connect flow for this platform. */
  oauthFunction: "tiktok-oauth" | "youtube-oauth" | "meta-oauth";
  oauthRoute: string;
  /** Short, honest note shown when the platform is not yet connected. */
  connectNote?: string;
  username: string;
  connected: boolean;
  /** Non-token account metadata from the DB (Page name / IG handle / channel). */
  accountId?: string | null;
  lastPost?: string;
  followers?: string;
  color: string;
  icon: string;
}

interface ScheduledPost {
  id: string;
  platform: string;
  title: string;
  scheduledFor: string;
  status: "scheduled" | "posting" | "posted" | "failed";
  videoUrl?: string;
  error?: string;
}

const AutoUpload = () => {
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([
    { platform: "TikTok", platformKey: "tiktok", oauthFunction: "tiktok-oauth", oauthRoute: "/tiktok-oauth", username: "", connected: false, color: "bg-black", icon: "🎵" },
    { platform: "YouTube Shorts", platformKey: "youtube", oauthFunction: "youtube-oauth", oauthRoute: "/youtube-oauth", username: "", connected: false, followers: "", color: "bg-red-500", icon: "📹" },
    { platform: "Facebook Reels", platformKey: "facebook", oauthFunction: "meta-oauth", oauthRoute: "/meta-oauth", connectNote: "Requires a Facebook Page you can publish to.", username: "", connected: false, followers: "", color: "bg-blue-600", icon: "📘" },
    { platform: "Instagram Reels", platformKey: "instagram", oauthFunction: "meta-oauth", oauthRoute: "/meta-oauth", connectNote: "Requires an Instagram professional account linked to that Page.", username: "", connected: false, followers: "", color: "bg-gradient-to-r from-purple-500 to-pink-500", icon: "📷" }
  ]);

  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [autoPostSettings, setAutoPostSettings] = useState({
    enabled: false,
    defaultCaption: "Check out this amazing video! 🔥 #viral #trending",
    optimalTiming: true,
    crossPost: false,
    addWatermark: true
  });

  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadScheduledPosts();
    loadSocialAccounts();
  }, []);

  const loadScheduledPosts = async () => {
    setScheduledPosts([]);
  };

  // Platform connection state comes from social_accounts (source of truth),
  // never from hardcoded local flags. Safe columns only — token columns are
  // never requested by the browser.
  const loadSocialAccounts = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) return;
      const { data, error } = await supabase
        .from("social_accounts")
        .select("id,platform,platform_account_id,platform_username,display_name,status,created_at")
        .eq("user_id", uid);
      if (error) return;
      const rows = (data || []) as Array<{
        platform: string;
        platform_account_id: string | null;
        platform_username: string | null;
        display_name: string | null;
        status: string;
      }>;
      setSocialAccounts((prev) =>
        prev.map((account) => {
          // Only a real DB row with status=active counts as connected — the UI
          // never infers a connection it cannot verify.
          const match = rows.find(
            (r) => r.platform === account.platformKey && r.status === "active",
          );
          return match
            ? {
                ...account,
                connected: true,
                accountId: match.platform_account_id,
                username: match.display_name || match.platform_username || "Connected",
              }
            : { ...account, connected: false, accountId: null, username: "", followers: "" };
        })
      );
    } catch {
      /* leave state untouched; UI stays accurate to last known DB read */
    }
  };

  const connectPlatform = async (platform: string) => {
    if (
      platform !== "TikTok" &&
      platform !== "YouTube Shorts" &&
      platform !== "Facebook Reels" &&
      platform !== "Instagram Reels"
    ) {
      toast({
        title: "Not available in Gate #78",
        description: `${platform} is not part of the current social MVP.`,
        variant: "destructive",
      });
      return;
    }
    if (platform === "YouTube Shorts") {
      setIsConnecting(platform);
      try {
        const { data, error } = await supabase.functions.invoke("youtube-oauth", {
          body: { action: "status" },
        });
        if (error) throw error;
        if (!data?.configured) {
          toast({
            title: "YouTube setup required",
            description: "Google Cloud OAuth is not configured. OAuth will not start.",
            variant: "destructive",
          });
          return;
        }
        const redirectUri = `${window.location.origin}/youtube-oauth`;
        const started = await supabase.functions.invoke("youtube-oauth", {
          body: { action: "start", redirectUri },
        });
        if (started.error) {
          toast({
            title: "YouTube connection blocked",
            description: await readEdgeFunctionError(started.error),
            variant: "destructive",
          });
          return;
        }
        if (started.data?.code === "oauth_not_configured") {
          toast({
            title: "YouTube setup required",
            description: started.data?.error || "Google Cloud OAuth is not configured",
            variant: "destructive",
          });
          return;
        }
        if (started.data?.authUrl) window.location.href = started.data.authUrl;
      } catch (error: unknown) {
        toast({
          title: "Connection Failed",
          description: await readEdgeFunctionError(error),
          variant: "destructive",
        });
      } finally {
        setIsConnecting(null);
      }
      return;
    }
    setIsConnecting(platform);
    // Meta (Facebook Reels + Instagram Reels): ONE Facebook Login consent for
    // both, through the meta-oauth function. No credentials -> no redirect.
    if (platform === "Facebook Reels" || platform === "Instagram Reels") {
      setIsConnecting(platform);
      try {
        const { data, error } = await supabase.functions.invoke("meta-oauth", {
          body: { action: "status" },
        });
        if (error) throw error;
        if (!data?.configured) {
          toast({
            title: "Meta setup required",
            description:
              "A Meta app is not configured yet, so Facebook and Instagram cannot be connected.",
            variant: "destructive",
          });
          return;
        }
        const redirectUri = `${window.location.origin}/meta-oauth`;
        const started = await supabase.functions.invoke("meta-oauth", {
          body: { action: "start", redirectUri },
        });
        if (started.error) {
          toast({
            title: "Meta connection blocked",
            description: await readEdgeFunctionError(started.error),
            variant: "destructive",
          });
          return;
        }
        if (started.data?.authUrl) window.location.href = started.data.authUrl;
      } catch (error: unknown) {
        toast({
          title: "Connection Failed",
          description: await readEdgeFunctionError(error),
          variant: "destructive",
        });
      } finally {
        setIsConnecting(null);
      }
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-oauth", {
        body: { action: "status" },
      });
      if (error) throw error;
      if (!data?.configured) {
        toast({
          title: "TikTok setup required",
          description: "TikTok developer app is not configured. OAuth will not start.",
          variant: "destructive",
        });
        return;
      }
      const redirectUri = `${window.location.origin}/tiktok-oauth`;
      const started = await supabase.functions.invoke("tiktok-oauth", {
        body: { action: "start", redirectUri },
      });
      if (started.error || started.data?.code === "oauth_not_configured") {
        toast({
          title: "TikTok setup required",
          description: started.data?.error || "TikTok developer app is not configured",
          variant: "destructive",
        });
        return;
      }
      if (started.data?.authUrl) window.location.href = started.data.authUrl;
    } catch (error: unknown) {
      toast({
        title: "Connection Failed",
        description: await readEdgeFunctionError(error),
        variant: "destructive",
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const disconnectPlatform = (platform: string) => {
    setSocialAccounts(prev => prev.map(account => 
      account.platform === platform 
        ? { ...account, connected: false, username: "", followers: "" }
        : account
    ));

    toast({
      title: "Platform Disconnected",
      description: `Disconnected from ${platform}`,
    });
  };

  const getStatusColor = (status: ScheduledPost['status']) => {
    switch (status) {
      case "scheduled": return "bg-blue-500";
      case "posting": return "bg-yellow-500";
      case "posted": return "bg-green-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const connectedPlatforms = socialAccounts.filter(account => account.connected).length;
  const totalPosts = scheduledPosts.length;
  const successfulPosts = scheduledPosts.filter(post => post.status === "posted").length;

  const saveSettings = async () => {
    try {
      const { error } = await supabase.functions.invoke('save-auto-upload-settings', {
        body: autoPostSettings
      });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Auto-upload settings have been updated",
      });
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save settings",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Zap className="h-8 w-8 text-neon-purple" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
              Auto-Upload & Social Integration
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Connect your social accounts and automatically post to TikTok, YouTube Shorts & Instagram Reels
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-primary">{connectedPlatforms}</div>
              <div className="text-sm text-muted-foreground">Connected Platforms</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-primary">{totalPosts}</div>
              <div className="text-sm text-muted-foreground">Scheduled Posts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-500">{successfulPosts}</div>
              <div className="text-sm text-muted-foreground">Successful Posts</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Platform Connections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Link2 className="h-5 w-5" />
                <span>Platform Connections</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {socialAccounts.map((account) => (
                <div key={account.platform} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${account.color} rounded-lg flex items-center justify-center text-white text-lg`}>
                      {account.icon}
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{account.platform}</p>
                      {account.connected ? (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">{account.username}</p>
                          {account.followers && (
                            <p className="text-xs text-muted-foreground">{account.followers} followers</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not connected</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {account.connected ? (
                      <>
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                        {account.platform === "YouTube Shorts" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => connectPlatform(account.platform)}
                            disabled={isConnecting === account.platform}
                            data-cy="youtube-reauthorize"
                            title="Re-run Google consent to grant additional YouTube permissions. Does not disconnect the account."
                          >
                            {isConnecting === account.platform ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Re-authorizing...
                              </>
                            ) : (
                              <>
                                <Link2 className="h-4 w-4 mr-2" />
                                Re-authorize YouTube
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectPlatform(account.platform)}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => connectPlatform(account.platform)}
                        disabled={isConnecting === account.platform}
                        size="sm"
                        className="bg-gradient-to-r from-neon-purple to-neon-green text-background"
                      >
                        {isConnecting === account.platform ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Link2 className="h-4 w-4 mr-2" />
                            Connect
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t space-y-4">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>API Requirements:</strong> You'll need to set up developer accounts and API keys for each platform.
                </p>
                <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
                  <div>• <strong>TikTok:</strong> TikTok for Developers API</div>
                  <div>• <strong>YouTube:</strong> YouTube Data API v3</div>
                  <div>• <strong>Instagram:</strong> Instagram Basic Display API</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Upload Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Auto-Upload Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Auto-Upload</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically post completed videos
                  </p>
                </div>
                <Switch
                  checked={autoPostSettings.enabled}
                  onCheckedChange={(checked) => setAutoPostSettings(prev => ({ ...prev, enabled: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Optimal Timing</Label>
                  <p className="text-sm text-muted-foreground">
                    Post at peak engagement times
                  </p>
                </div>
                <Switch
                  checked={autoPostSettings.optimalTiming}
                  onCheckedChange={(checked) => setAutoPostSettings(prev => ({ ...prev, optimalTiming: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Cross-Post</Label>
                  <p className="text-sm text-muted-foreground">
                    Post to all connected platforms
                  </p>
                </div>
                <Switch
                  checked={autoPostSettings.crossPost}
                  onCheckedChange={(checked) => setAutoPostSettings(prev => ({ ...prev, crossPost: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Add Watermark</Label>
                  <p className="text-sm text-muted-foreground">
                    Include BOOM! watermark on posts
                  </p>
                </div>
                <Switch
                  checked={autoPostSettings.addWatermark}
                  onCheckedChange={(checked) => setAutoPostSettings(prev => ({ ...prev, addWatermark: checked }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caption">Default Caption Template</Label>
                <Textarea
                  id="caption"
                  value={autoPostSettings.defaultCaption}
                  onChange={(e) => setAutoPostSettings(prev => ({ ...prev, defaultCaption: e.target.value }))}
                  placeholder="Enter your default caption template..."
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{title}'} {'{hashtags}'} as placeholders
                </p>
              </div>

              <Button
                onClick={saveSettings}
                className="w-full bg-gradient-to-r from-neon-purple to-neon-green text-background"
              >
                <Settings className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Scheduled Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Scheduled & Recent Posts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scheduledPosts.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  No scheduled posts yet. Create videos to see them here.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Video</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Scheduled For</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{post.title}</p>
                          {post.videoUrl && (
                            <a 
                              href={post.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center"
                            >
                              View Video <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{post.platform}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(post.scheduledFor)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(post.status)} text-white`}>
                          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                        </Badge>
                        {post.error && (
                          <p className="text-xs text-red-500 mt-1">{post.error}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {post.status === "scheduled" && (
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          )}
                          {post.status === "posted" && (
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AutoUpload;