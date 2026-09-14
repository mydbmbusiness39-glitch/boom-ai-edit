import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout/Layout";
import { supabase } from "@/integrations/supabase/client";

/**
 * Meta (Facebook + Instagram) OAuth callback.
 *
 * One Facebook Login consent yields both connections. On success we surface what
 * was actually linked — and when the Page has no linked Instagram professional
 * account we say so plainly instead of showing a connected Instagram the API
 * cannot publish to.
 */
const MetaOAuthCallback = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing Meta connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const err = params.get("error");
    const errDescription = params.get("error_description");
    if (err) {
      setMessage(
        errDescription
          ? `Meta denied the request: ${errDescription}`
          : "Meta denied the request.",
      );
      return;
    }
    if (!code || !state) {
      setMessage("Missing OAuth code. A Meta app may not be configured yet.");
      return;
    }
    (async () => {
      const redirectUri = `${window.location.origin}/meta-oauth`;
      const { data, error } = await supabase.functions.invoke("meta-oauth", {
        body: { action: "callback", code, state, redirectUri },
      });
      if (error || data?.error) {
        setMessage(data?.error || error?.message || "Meta connection failed.");
        return;
      }
      const page = data?.page?.name || "Facebook Page";
      if (data?.instagram) {
        setMessage(`Connected ${page} and Instagram. Returning…`);
      } else if (data?.code === "no_ig_professional_account") {
        setMessage(
          `Connected ${page}. No Instagram professional account is linked to that Page yet, so Instagram was not connected.`,
        );
      } else {
        setMessage(`Connected ${page}. Returning…`);
      }
      setTimeout(() => navigate("/auto-upload"), 1200);
    })();
  }, [navigate]);

  return (
    <Layout>
      <div className="container max-w-lg mx-auto p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Meta OAuth</h1>
        <p className="text-muted-foreground" data-cy="meta-oauth-message">
          {message}
        </p>
      </div>
    </Layout>
  );
};

export default MetaOAuthCallback;
