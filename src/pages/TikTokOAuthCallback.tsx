import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout/Layout";
import { supabase } from "@/integrations/supabase/client";

const TikTokOAuthCallback = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing TikTok connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const err = params.get("error");
    if (err) {
      setMessage("TikTok denied the request.");
      return;
    }
    if (!code || !state) {
      setMessage("Missing OAuth code. TikTok developer app may not be configured.");
      return;
    }
    (async () => {
      const redirectUri = `${window.location.origin}/tiktok-oauth`;
      const { data, error } = await supabase.functions.invoke("tiktok-oauth", {
        body: { action: "callback", code, state, redirectUri },
      });
      if (error || data?.error) {
        setMessage(data?.error || "TikTok connection failed.");
        return;
      }
      setMessage("TikTok account connected. Returning…");
      setTimeout(() => navigate("/auto-upload"), 800);
    })();
  }, [navigate]);

  return (
    <Layout>
      <div className="container max-w-lg mx-auto p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">TikTok OAuth</h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </Layout>
  );
};

export default TikTokOAuthCallback;
