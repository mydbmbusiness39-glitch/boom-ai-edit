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
import { readEdgeFunctionError } from "@/utils/edgeFunctionError";

type SafeAccount = {
  id: string;
  platform: string;
  platform_username?: string | null;
  display_name?: string | null;
  status: string;
};

/** Safe columns only from publish_jobs (RLS limits rows to the owner). */
type PublishRow = {
  id: string;
  platform: string;
  social_account_id: string;
  publish_status: string;
  platform_post_url: string | null;
};

type Props = {
  jobId: string;
  outputUrl: string;
  jobTitle?: string;
};

type PlatformTab = "tiktok" | "youtube";

const TIKTOK_PRIVACY = [
  { value: "SELF_ONLY", label: "Only me" },
  { value: "FOLLOWER_OF_CREATOR", label: "Followers" },
  { value: "MUTUAL_FOLLOW_FRIENDS", label: "Friends" },
  { value: "PUBLIC_TO_EVERYONE", label: "Public" },
];

const YOUTUBE_PRIVACY = [
  { value: "private", label: "private" },
  { value: "unlisted", label: "unlisted" },
  { value: "public", label: "public" },
];

const SocialPublishPanel = ({ jobId, outputUrl, jobTitle }: Props) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<PlatformTab>("tiktok");
  const [tiktokConfigured, setTiktokConfigured] = useState(false);
  const [youtubeConfigured, setYoutubeConfigured] = useState(false);
  const [tiktokAccounts, setTiktokAccounts] = useState<SafeAccount[]>([]);
  const [youtubeAccounts, setYoutubeAccounts] = useState<SafeAccount[]>([]);
  const [tiktokAccountId, setTiktokAccountId] = useState("");
  const [youtubeAccountId, setYoutubeAccountId] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [tiktokPrivacy, setTiktokPrivacy] = useState("SELF_ONLY");
  const [ytTitle, setYtTitle] = useState(jobTitle || "");
  const [ytDescription, setYtDescription] = useState("");
  const [ytPrivacy, setYtPrivacy] = useState("private");
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [entitled, setEntitled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [publishRows, setPublishRows] = useState<PublishRow[]>([]);

  // Existing publish jobs for this render (owner-visible rows only).
  const loadPublishRows = async () => {
    const { data, error } = await supabase
      .from("publish_jobs")
      .select("id,platform,social_account_id,publish_status,platform_post_url")
      .eq("boom_job_id", jobId);
    if (error || !Array.isArray(data)) return;
    setPublishRows(data as PublishRow[]);
  };

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

      const [tt, yt] = await Promise.all([
        supabase.functions.invoke("tiktok-oauth", { body: { action: "status" } }),
        supabase.functions.invoke("youtube-oauth", { body: { action: "status" } }),
      ]);
      if (!mounted) return;
      if (!tt.error) {
        setTiktokConfigured(Boolean(tt.data?.configured));
        const list = Array.isArray(tt.data?.accounts) ? tt.data.accounts : [];
        setTiktokAccounts(list);
        if (list[0]?.id) setTiktokAccountId(list[0].id);
      }
      if (!yt.error) {
        setYoutubeConfigured(Boolean(yt.data?.configured));
        const list = Array.isArray(yt.data?.accounts) ? yt.data.accounts : [];
        setYoutubeAccounts(list);
        if (list[0]?.id) setYoutubeAccountId(list[0].id);
      }
      await loadPublishRows();
      if (!mounted) return;
      setLoaded(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const connectTikTok = async () => {
    if (!tiktokConfigured) {
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

  const connectYouTube = async () => {
    if (!youtubeConfigured) {
      toast({
        title: "YouTube setup required",
        description: "Google Cloud OAuth is not configured. OAuth will not start.",
        variant: "destructive",
      });
      return;
    }
    const redirectUri = `${window.location.origin}/youtube-oauth`;
    const { data, error } = await supabase.functions.invoke("youtube-oauth", {
      body: { action: "start", redirectUri },
    });
    if (error || data?.code === "oauth_not_configured") {
      toast({
        title: "YouTube setup required",
        description: data?.error || "Google Cloud OAuth is not configured",
        variant: "destructive",
      });
      return;
    }
    if (data?.authUrl) window.location.href = data.authUrl;
  };

  const approveAndPublishTikTok = async () => {
    if (!entitled) {
      toast({ title: "Not entitled", description: "Social publishing is not included in your plan.", variant: "destructive" });
      return;
    }
    if (!tiktokAccountId) {
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
          socialAccountId: tiktokAccountId,
          title: jobTitle || "",
          caption,
          hashtags,
          privacyLevel: tiktokPrivacy,
          approvalStatus: "approved",
        },
      });
      if (error || data?.error) {
        const code = data?.code || "failed";
        setStatusText(code);
        toast({
          title: "Publish blocked",
          description: data?.error || (await readEdgeFunctionError(error)) || "Publish did not start",
          variant: "destructive",
        });
        await loadPublishRows();
        return;
      }
      setStatusText(data?.publishJob?.publish_status || "processing");
      toast({ title: "Publish requested", description: "TikTok is processing this video." });
      await loadPublishRows();
    } finally {
      setBusy(false);
    }
  };

  const approveAndPublishYouTube = async () => {
    if (!entitled) {
      toast({ title: "Not entitled", description: "Social publishing is not included in your plan.", variant: "destructive" });
      return;
    }
    if (!youtubeAccountId) {
      toast({ title: "No YouTube account", description: "Connect a YouTube channel first.", variant: "destructive" });
      return;
    }
    setBusy(true);
    setStatusText("pending");
    try {
      const { data, error } = await supabase.functions.invoke("youtube-publish", {
        body: {
          action: "publish",
          boomJobId: jobId,
          socialAccountId: youtubeAccountId,
          title: ytTitle,
          description: ytDescription,
          privacyLevel: ytPrivacy,
          approvalStatus: "approved",
        },
      });
      if (error || data?.error) {
        const code = data?.code || "failed";
        setStatusText(code);
        toast({
          title: "Publish blocked",
          description: data?.error || (await readEdgeFunctionError(error)) || "Publish did not start",
          variant: "destructive",
        });
        await loadPublishRows();
        return;
      }
      setStatusText(data?.publishJob?.publish_status || "uploading");
      toast({ title: "Publish requested", description: "YouTube upload was queued after owner approval." });
      await loadPublishRows();
    } finally {
      setBusy(false);
    }
  };

  // A non-failed publish job for this render+account means republishing is
  // blocked server-side (idempotency). Surface it instead of inviting a 409.
  const existingFor = (platform: PlatformTab, accountId: string): PublishRow | null =>
    publishRows.find(
      (r) =>
        r.platform === platform &&
        r.social_account_id === accountId &&
        r.publish_status !== "failed",
    ) || null;

  const existingTikTok = existingFor("tiktok", tiktokAccountId);
  const existingYouTube = existingFor("youtube", youtubeAccountId);

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

        <div className="flex gap-2">
          <Button variant={tab === "tiktok" ? "default" : "outline"} size="sm" onClick={() => setTab("tiktok")}>
            TikTok
          </Button>
          <Button variant={tab === "youtube" ? "default" : "outline"} size="sm" onClick={() => setTab("youtube")}>
            YouTube
          </Button>
        </div>

        {tab === "tiktok" && (
          <>
            <div className="space-y-2">
              <Label>TikTok account</Label>
              {tiktokAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No TikTok account connected.</p>
              ) : (
                <select
                  className="w-full border rounded-md h-10 px-3 bg-background"
                  value={tiktokAccountId}
                  onChange={(e) => setTiktokAccountId(e.target.value)}
                >
                  {tiktokAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      @{a.platform_username || a.display_name || a.id} ({a.status})
                    </option>
                  ))}
                </select>
              )}
              {tiktokConfigured ? (
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
                value={tiktokPrivacy}
                onChange={(e) => setTiktokPrivacy(e.target.value)}
              >
                {TIKTOK_PRIVACY.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {statusText && <p className="text-sm">Status: {statusText}</p>}

            {existingTikTok ? (
              <div className="rounded-md border border-border p-3 space-y-1" data-cy="tiktok-already-published">
                <p className="text-sm font-medium">
                  Already published to TikTok — {existingTikTok.publish_status}
                </p>
                {existingTikTok.platform_post_url && (
                  <a
                    className="text-sm underline break-all"
                    href={existingTikTok.platform_post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {existingTikTok.platform_post_url}
                  </a>
                )}
                <p className="text-xs text-muted-foreground">
                  This render already has a publish job for this account, so republishing is blocked to
                  prevent duplicate uploads.
                </p>
              </div>
            ) : (
              <Button
                className="w-full"
                disabled={busy || !entitled}
                onClick={approveAndPublishTikTok}
                data-cy="approve-and-publish"
              >
                APPROVE & PUBLISH
              </Button>
            )}
          </>
        )}

        {tab === "youtube" && (
          <>
            <div className="space-y-2">
              <Label>YouTube channel</Label>
              {youtubeAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No YouTube account connected.</p>
              ) : (
                <select
                  className="w-full border rounded-md h-10 px-3 bg-background"
                  value={youtubeAccountId}
                  onChange={(e) => setYoutubeAccountId(e.target.value)}
                >
                  {youtubeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.display_name || a.platform_username || a.id} ({a.status})
                    </option>
                  ))}
                </select>
              )}
              {youtubeConfigured ? (
                <Button variant="outline" size="sm" onClick={connectYouTube}>
                  Connect YouTube
                </Button>
              ) : (
                <div className="space-y-1">
                  <Badge variant="secondary" data-cy="youtube-setup-required">setup-required</Badge>
                  <p className="text-sm text-muted-foreground">
                    Google Cloud OAuth is not configured. Connect YouTube is disabled until the owner adds official OAuth credentials.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Connect YouTube
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube-title">title</Label>
              <Input id="youtube-title" value={ytTitle} onChange={(e) => setYtTitle(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube-description">description</Label>
              <Textarea id="youtube-description" value={ytDescription} onChange={(e) => setYtDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube-privacy">privacy</Label>
              <select
                id="youtube-privacy"
                className="w-full border rounded-md h-10 px-3 bg-background"
                value={ytPrivacy}
                onChange={(e) => setYtPrivacy(e.target.value)}
              >
                {YOUTUBE_PRIVACY.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {statusText && <p className="text-sm">Status: {statusText}</p>}

            {existingYouTube ? (
              <div className="rounded-md border border-border p-3 space-y-1" data-cy="youtube-already-published">
                <p className="text-sm font-medium">
                  Already published to YouTube — {existingYouTube.publish_status}
                </p>
                {existingYouTube.platform_post_url && (
                  <a
                    className="text-sm underline break-all"
                    href={existingYouTube.platform_post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {existingYouTube.platform_post_url}
                  </a>
                )}
                <p className="text-xs text-muted-foreground">
                  This render already has a publish job for this account, so republishing is blocked to
                  prevent duplicate uploads. Choose a different completed render to publish again.
                </p>
              </div>
            ) : (
              <Button
                className="w-full"
                disabled={busy || !entitled}
                onClick={approveAndPublishYouTube}
                data-cy="youtube-approve-and-publish"
              >
                APPROVE & PUBLISH
              </Button>
            )}
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Nothing is posted until you press APPROVE &amp; PUBLISH. No autonomous posting.
        </p>
      </CardContent>
    </Card>
  );
};

export default SocialPublishPanel;
