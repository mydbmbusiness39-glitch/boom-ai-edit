import { Link } from "react-router-dom";
import Layout from "@/components/Layout/Layout";

const Terms = () => {
  return (
    <Layout>
      <article className="container max-w-3xl mx-auto px-4 py-12 prose prose-invert">
        <p className="text-sm text-muted-foreground">
          <Link to="/" className="underline">BoomStudio</Link>
          {" · "}
          <Link to="/privacy" className="underline">Privacy Policy</Link>
        </p>
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Boom Studio · Last updated: September 13, 2026</p>

        <p>
          These Terms of Service (“Terms”) govern your access to and use of Boom Studio
          (also branded BoomStudio), the AI-powered video editing service available at
          boom-ai-edit.vercel.app (the “Service”). By creating an account or using the
          Service, you agree to these Terms. If you do not agree, do not use the Service.
        </p>

        <h2>1. The Service</h2>
        <p>
          Boom Studio lets you upload video and audio, edit projects, generate captions and
          related media, render finished videos, download results, and — if you choose and
          your plan allows — publish finished videos to connected social platforms such as
          TikTok. Features available to you depend on your plan and entitlements. We may
          change, suspend, or discontinue features with notice when practical.
        </p>

        <h2>2. Accounts</h2>
        <p>
          You must provide accurate account information and keep your login credentials
          confidential. You are responsible for activity under your account. Notify us
          promptly if you believe your account has been compromised. You must be old enough
          to form a binding contract in your jurisdiction to use the Service.
        </p>

        <h2>3. User content</h2>
        <p>
          You retain ownership of videos, audio, images, captions, titles, hashtags, and
          other material you upload or create in the Service (“User Content”). You grant
          Boom Studio a limited license to host, process, transcode, render, store, and
          display User Content solely to operate the Service for you — including
          transcription, caption burn-in, and social publishing that you expressly approve.
        </p>
        <p>
          You represent that you have all rights needed in User Content and that it does not
          infringe others’ rights or violate law. We do not claim ownership of your finished
          renders.
        </p>

        <h2>4. Acceptable use</h2>
        <p>You may not:</p>
        <ul>
          <li>Upload or publish content that is illegal, infringing, or that you do not have the right to use</li>
          <li>Attempt to access another user’s projects, renders, or connected social accounts</li>
          <li>Interfere with the Service, reverse engineer it except as allowed by law, or overload our systems</li>
          <li>Use the Service to spam, scrape, or send unsolicited commercial messages</li>
          <li>Bypass plan limits, entitlements, or security controls</li>
          <li>Publish to social platforms without the account owner’s explicit approval where the Service requires it</li>
        </ul>

        <h2>5. Social publishing</h2>
        <p>
          If you connect a social account (including TikTok) and approve a publish request,
          Boom Studio will submit the selected finished render and the metadata you provide
          (such as caption, hashtags, title, and privacy setting) through that platform’s
          official APIs. You remain responsible for complying with TikTok’s and any other
          platform’s terms, community guidelines, and music/licensing rules. Connecting an
          account or rendering a video does not publish anything; publishing occurs only
          after you (or an authorized account owner) explicitly approve the post in the
          Service. We may refuse or fail a publish request if tokens expire, permissions
          are revoked, media is unsupported, or the destination platform rejects it.
        </p>

        <h2>6. Paid plans and entitlements</h2>
        <p>
          Some features, including social publishing and paid transcription, require a
          qualifying plan. Fees, if any, are described on the pricing page at the time of
          purchase. We do not guarantee that every third-party platform will accept every
          render.
        </p>

        <h2>7. Termination</h2>
        <p>
          You may stop using the Service and request account deletion as described in the
          Privacy Policy. We may suspend or terminate access if you violate these Terms,
          if required by law, or to protect the Service or other users. Upon termination,
          your right to use the Service ends. Provisions that by nature should survive
          (including ownership of User Content, disclaimers, and limitation of liability)
          survive termination.
        </p>

        <h2>8. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” BOOM STUDIO DISCLAIMS ALL
          WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE, AND NON-INFRINGEMENT. We do not warrant that renders,
          transcriptions, captions, or social posts will be error-free, uninterrupted, or
          accepted by third-party platforms.
        </p>

        <h2>9. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Boom Studio and its operators will not be
          liable for indirect, incidental, special, consequential, or punitive damages, or
          for lost profits, lost data, or failed social posts, arising from your use of the
          Service. Our total liability for any claim relating to the Service is limited to
          the amounts you paid us for the Service in the three months before the claim, or
          fifty U.S. dollars if you paid nothing.
        </p>

        <h2>10. Changes</h2>
        <p>
          We may update these Terms. The “Last updated” date will change when we do. Continued
          use after an update constitutes acceptance of the revised Terms.
        </p>

        <h2>11. Contact</h2>
        <p>
          Questions about these Terms:{" "}
          <a href="mailto:mydbmbusiness39@gmail.com">mydbmbusiness39@gmail.com</a>
        </p>
      </article>
    </Layout>
  );
};

export default Terms;
