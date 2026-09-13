import { Link } from "react-router-dom";
import Layout from "@/components/Layout/Layout";

const Privacy = () => {
  return (
    <Layout>
      <article className="container max-w-3xl mx-auto px-4 py-12 prose prose-invert">
        <p className="text-sm text-muted-foreground">
          <Link to="/" className="underline">BoomStudio</Link>
          {" · "}
          <Link to="/terms" className="underline">Terms of Service</Link>
        </p>
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Boom Studio · Last updated: September 13, 2026</p>

        <p>
          This Privacy Policy explains how Boom Studio (“BoomStudio,” “we,” “us”) collects,
          uses, and shares information when you use the Boom Studio video editing service
          at boom-ai-edit.vercel.app. It is written for users and for platform partners
          (including TikTok) that require a public privacy policy before account connection.
        </p>

        <h2>1. Account data</h2>
        <p>
          When you register we collect your email address, authentication identifiers, and
          profile fields you provide (such as display name, role, and plan). We use this
          data to operate your account, apply plan entitlements, and communicate about the
          Service. We do not sell your account data.
        </p>

        <h2>2. Uploaded videos and audio</h2>
        <p>
          You may upload video, audio, and related media to create and render projects.
          Uploaded files and rendered outputs are stored so we can process jobs you request
          (preview, edit, render, download, and optional social publish). We access this
          media only to provide those features and to maintain the Service.
        </p>

        <h2>3. Transcription processing</h2>
        <p>
          If you use captions or transcription, we send the audio you select to our
          transcription providers so they can return timed text. Transcription results are
          stored with your project so you can review, edit, and burn captions into a render.
          Do not upload media you are not allowed to transcribe.
        </p>

        <h2>4. Connected social accounts and TikTok</h2>
        <p>
          If you connect TikTok or another supported social platform, Boom Studio receives
          account identifiers (such as platform user id and username) and OAuth tokens
          needed to publish on your behalf. Tokens are stored encrypted on our servers and
          are not shown in the browser. We use them only to:
        </p>
        <ul>
          <li>Confirm the connected account</li>
          <li>Refresh or revoke access when you or the platform require it</li>
          <li>Submit a publish request after you explicitly approve it in Boom Studio</li>
          <li>Check publish status and record the resulting post id or URL</li>
        </ul>
        <p>
          We do not post to TikTok or other platforms automatically. Connecting an account
          does not grant us a right to publish until you press approve in the Service.
          If you disconnect or the platform revokes permission, we mark the connection
          revoked and stop using those tokens.
        </p>

        <h2>5. OAuth tokens</h2>
        <p>
          Access and refresh tokens from social platforms are encrypted at rest, restricted
          to server-side use, and are not returned to client applications in API responses.
          Token ciphertext is not exposed to other customers. We retain tokens only while
          the connection remains active or as needed to complete an in-flight publish you
          approved.
        </p>

        <h2>6. Service providers</h2>
        <p>
          We use infrastructure and processing providers to host the Service, store media,
          authenticate users, transcribe audio, and (when you approve a post) call official
          social APIs such as TikTok’s Content Posting API. Those providers process data
          only to perform the requested service. We do not permit them to use your content
          to advertise to you.
        </p>

        <h2>7. Retention and deletion</h2>
        <p>
          Account data is kept while your account is open. Project media, renders, captions,
          and publish records are kept so you can access job history unless you delete them
          or close your account. You may request deletion of your account and associated
          media by emailing the contact below. We may retain limited records as required by
          law, to resolve disputes, or to complete a publish already submitted to a
          platform. Social tokens are removed or invalidated when you disconnect.
        </p>

        <h2>8. Security</h2>
        <p>
          We use industry-standard safeguards including encrypted transport (HTTPS),
          access-controlled storage, encrypted social tokens, and user-level isolation so
          one customer cannot read another customer’s projects or connected accounts. No
          method of transmission or storage is 100% secure.
        </p>

        <h2>9. Your rights</h2>
        <p>
          Subject to applicable law, you may request access to, correction of, or deletion
          of personal data we hold about you, and you may disconnect social accounts at any
          time. To exercise these rights, contact us using the email below. You may also
          revoke TikTok (or other platform) access from that platform’s own settings.
        </p>

        <h2>10. Children</h2>
        <p>
          The Service is not directed to children under 13, and we do not knowingly collect
          personal information from children under 13.
        </p>

        <h2>11. Changes</h2>
        <p>
          We may update this Privacy Policy. The “Last updated” date will change when we do.
          Material changes will be reflected on this page.
        </p>

        <h2>12. Contact</h2>
        <p>
          Privacy questions and deletion requests:{" "}
          <a href="mailto:mydbmbusiness39@gmail.com">mydbmbusiness39@gmail.com</a>
        </p>
      </article>
    </Layout>
  );
};

export default Privacy;
