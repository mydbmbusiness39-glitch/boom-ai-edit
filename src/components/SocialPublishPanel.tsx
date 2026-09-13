import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { resolveEntitlements } from "@/lib/access";

type SafeAccount = {
  id: string;
  platform: string;
  platform_username?: string | null;
  display_name?: string | null;
  status: string;
};

type Props = {
  jobId: string;
  outputUrl: string;
  jobTitle?: string;
};

const PRIVACY = [
  { value: "SELF_ONLY", label: "Only me" },
  { value: "FOLLOWER_OF_CREATOR", label: "Followers" },
  { value: "MUTUAL_FOLLOW_FRIENDS", label: "Friends" },
  { value: "PUBLIC_TO_EVERYONE", label: "Public" },
];

const SocialPublishPanel = ({ jobId, outputUrl, jobTitle }: Props) => {
  const { toast } = useToast();
  const [configured, setConfigured] = useState(false);
  const [accounts, setAccounts] = useState<SafeAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [privacy, setPrivacy] = useState("SELF_ONLY");
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [entitled, setEntitled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) {
        if (mounted) setLoaded(true);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, plan, tier")
        .eq("id", uid)
        .maybeSingle();
      const ent = resolveEntitlements(profile);
      if (mounted) setEntitled(ent.socialPublish === true);

      const { data, error } = await supabase.functions.invoke("tiktok-oauth", {
        body: { action: "status" },
      });
      if (!mounted) return;
      if (error) {
        setConfigured(false);
        setLoaded(true);
        return;
      }
      setConfigured(Boolean(data?.configured));
      const list = Array.isArray(data?.accounts) ? data.accounts : [];
      setAccounts(list);
      if (list[0]?.id) setAccountId(list[0].id);
      setLoaded(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const connectTikTok = async () => {
    if (!configured) {
      toast({
        title: "TikTok setup required",
        description: "TikTok developer app is not configured. OAuth will not start.",
        variant: "destructive",
      });
      return;
    }
    const redirectUri = `${window.location.origin}/tiktok-oauth`;
    const { data, error } = await supabase.functions.invoke("tiktok-oauth", {
      body: { action: "start", redirectUri },
    });
    if (error || data?.code === "oauth_not_configured") {
      toast({
        title: "TikTok setup required",
        description: data?.error || "TikTok developer app is not configured",
        variant: "destructive",
      });
      return;
    }
    if (data?.authUrl) window.location.href = data.authUrl;
  };

  const approveAndPublish = async () => {
    if (!entitled) {
      toast({ title: "Not entitled", description: "Social publishing is not included in your plan.", variant: "destructive" });
      return;
    }
    if (!accountId) {
      toast({ title: "No TikTok account", description: "Connect a TikTok account first.", variant: "destructive" });
      return;
    }
    setBusy(true);
    setStatusText("pending");
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-publish", {
        body: {
          action: "publish",
          boomJobId: jobId,
          socialAccountId: accountId,
          title: jobTitle || "",
          caption,
          hashtags,
          privacyLevel: privacy,
          approvalStatus: "approved",
        },
      });
      if (error || data?.error) {
        const code = data?.code || "failed";
        setStatusText(code);
        toast({
          title: "Publish blocked",
          description: data?.error || error?.message || "Publish did not start",
          variant: "destructive",
        });
        return;
      }
      setStatusText(data?.publishJob?.publish_status || "processing");
      toast({ title: "Publish requested", description: "TikTok is processing this video." });
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return null;

  return (
    <Card className="mt-6" data-cy="social-publish-panel">
      <CardHeader>
        <CardTitle>Social Publish</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <video src={outputUrl} className="w-full rounded-lg bg-black max-h-80" controls playsInline />

        {!entitled && (
          <p className="text-sm text-muted-foreground">Social publishing is not included in your plan.</p>
        )}

        <div className="space-y-2">
          <Label>TikTok account</Label>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No TikTok account connected.</p>
          ) : (
            <select
              className="w-full border rounded-md h-10 px-3 bg-background"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  @{a.platform_username || a.display_name || a.id} ({a.status})
                </option>
              ))}
            </select>
          )}
          {configured ? (
            <Button variant="outline" size="sm" onClick={connectTikTok}>
              Connect TikTok
            </Button>
          ) : (
            <div className="space-y-1">
              <Badge variant="secondary" data-cy="tiktok-setup-required">setup-required</Badge>
              <p className="text-sm text-muted-foreground">
                TikTok developer app is not configured. Connect TikTok is disabled until the owner adds official app credentials.
              </p>
              <Button variant="outline" size="sm" disabled>
                Connect TikTok
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tiktok-caption">caption</Label>
          <Textarea id="tiktok-caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tiktok-hashtags">hashtags</Label>
          <Input id="tiktok-hashtags" value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#bcwa" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tiktok-privacy">privacy</Label>
          <select
            id="tiktok-privacy"
            className="w-full border rounded-md h-10 px-3 bg-background"
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
          >
            {PRIVACY.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {statusText && <p className="text-sm">Status: {statusText}</p>}

        <Button
          className="w-full"
          disabled={busy || !entitled}
          onClick={approveAndPublish}
          data-cy="approve-and-publish"
        >
          APPROVE & PUBLISH
        </Button>
        <p className="text-xs text-muted-foreground">
          Nothing is posted until you press APPROVE &amp; PUBLISH. No autonomous posting.
        </p>
      </CardContent>
    </Card>
  );
};

export default SocialPublishPanel;
