import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout/Layout";
import { supabase } from "@/integrations/supabase/client";

const YouTubeOAuthCallback = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing YouTube connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const err = params.get("error");
    if (err) {
      setMessage("YouTube denied the request.");
      return;
    }
    if (!code || !state) {
      setMessage("Missing OAuth code. Google Cloud OAuth may not be configured.");
      return;
    }
    (async () => {
      const redirectUri = `${window.location.origin}/youtube-oauth`;
      const { data, error } = await supabase.functions.invoke("youtube-oauth", {
        body: { action: "callback", code, state, redirectUri },
      });
      if (error || data?.error) {
        setMessage(data?.error || "YouTube connection failed.");
        return;
      }
      setMessage("YouTube account connected. Returning…");
      setTimeout(() => navigate("/auto-upload"), 800);
    })();
  }, [navigate]);

  return (
    <Layout>
      <div className="container max-w-lg mx-auto p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">YouTube OAuth</h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </Layout>
  );
};

export default YouTubeOAuthCallback;
