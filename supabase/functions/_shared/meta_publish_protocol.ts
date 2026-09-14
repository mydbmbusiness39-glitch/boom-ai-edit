/**
 * Gate #78 Meta publish protocol — URL builders, request shaping, and status
 * mapping for Facebook Reels and Instagram Reels.
 *
 * Pure module: no Deno APIs, no ambient network. The network client takes an
 * injectable `fetchImpl` so the protocol can be exercised without touching Meta.
 *
 * Verified against the official docs (Gate #78 Phase A):
 *   Facebook Reels   POST graph.facebook.com/{ver}/{page_id}/video_reels  (upload_phase=start)
 *                    POST rupload.facebook.com/video-upload/{ver}/{video_id}  (bytes or file_url)
 *                    POST graph.facebook.com/{ver}/{page_id}/video_reels  (upload_phase=finish, video_state=PUBLISHED)
 *   Instagram Reels  POST graph.facebook.com/{ver}/{ig_id}/media  (media_type=REELS, video_url)
 *                    GET  graph.facebook.com/{ver}/{container_id}?fields=status_code
 *                    POST graph.facebook.com/{ver}/{ig_id}/media_publish  (creation_id)
 */

export const GRAPH_VERSION = "v26.0";
const GRAPH = "https://graph.facebook.com";
const RUPLOAD = "https://rupload.facebook.com";

/** Meta enforces a 30/24h Facebook Reels and 100/24h Instagram publish cap. */
export const FACEBOOK_DAILY_PUBLISH_LIMIT = 30;
export const INSTAGRAM_DAILY_PUBLISH_LIMIT = 100;
/** Instagram media containers expire if not published within 24h. */
export const INSTAGRAM_CONTAINER_TTL_HOURS = 24;

// ---------------------------------------------------------------- Facebook -- //

export function facebookReelStartUrl(pageId: string, version: string = GRAPH_VERSION): string {
  return `${GRAPH}/${version}/${encodeURIComponent(pageId)}/video_reels`;
}

/** Host for the byte/file transfer is rupload, NOT graph. The API hands back a
 *  fully-formed `upload_url`; this is the documented fallback shape. */
export function facebookReelUploadUrl(videoId: string, version: string = GRAPH_VERSION): string {
  return `${RUPLOAD}/video-upload/${version}/${encodeURIComponent(videoId)}`;
}

export function facebookReelFinishUrl(pageId: string, version: string = GRAPH_VERSION): string {
  return `${GRAPH}/${version}/${encodeURIComponent(pageId)}/video_reels`;
}

/** Step 1 body: initialise an upload session. */
export function buildFacebookReelStartBody(pageAccessToken: string) {
  return { upload_phase: "start", access_token: pageAccessToken };
}

/**
 * Step 2 headers. Boom already hosts a public MP4, so we hand Meta the URL and
 * let it ingest the file directly (the documented "hosted file" path) instead of
 * streaming bytes through our runtime.
 */
export function buildFacebookReelUploadHeaders(pageAccessToken: string, videoUrl: string) {
  return {
    Authorization: `OAuth ${pageAccessToken}`,
    file_url: videoUrl,
  };
}

/** Step 3 body: finish and publish. Page publishing is public — no privacy field. */
export function buildFacebookReelFinishBody(
  pageAccessToken: string,
  videoId: string,
  description?: string,
) {
  const body: Record<string, string> = {
    upload_phase: "finish",
    video_state: "PUBLISHED",
    video_id: videoId,
    access_token: pageAccessToken,
  };
  if (description) body.description = description;
  return body;
}

export type FacebookReelPlan = {
  platform: "facebook";
  version: string;
  startUrl: string;
  finishUrl: string;
  startBody: Record<string, string>;
  uploadHeaders: Record<string, string>;
  finishBody: Record<string, string>;
  /** Documented upload host; the live `upload_url` from step 1 wins if present. */
  uploadUrlTemplate: string;
};

export function buildFacebookReelPlan(input: {
  pageId: string;
  pageAccessToken: string;
  videoUrl: string;
  description?: string;
  videoId?: string;
  version?: string;
}): FacebookReelPlan {
  const version = input.version || GRAPH_VERSION;
  return {
    platform: "facebook",
    version,
    startUrl: facebookReelStartUrl(input.pageId, version),
    finishUrl: facebookReelFinishUrl(input.pageId, version),
    startBody: buildFacebookReelStartBody(input.pageAccessToken),
    uploadHeaders: buildFacebookReelUploadHeaders(input.pageAccessToken, input.videoUrl),
    finishBody: buildFacebookReelFinishBody(
      input.pageAccessToken,
      input.videoId || "",
      input.description,
    ),
    uploadUrlTemplate: facebookReelUploadUrl(input.videoId || "", version),
  };
}

// --------------------------------------------------------------- Instagram -- //

export function instagramContainerUrl(igUserId: string, version: string = GRAPH_VERSION): string {
  return `${GRAPH}/${version}/${encodeURIComponent(igUserId)}/media`;
}

export function instagramStatusUrl(containerId: string, version: string = GRAPH_VERSION): string {
  return `${GRAPH}/${version}/${encodeURIComponent(containerId)}?fields=status_code`;
}

export function instagramPublishUrl(igUserId: string, version: string = GRAPH_VERSION): string {
  return `${GRAPH}/${version}/${encodeURIComponent(igUserId)}/media_publish`;
}

/** The container is created from a PUBLIC url — Meta cURLs it itself. */
export function buildInstagramContainerBody(
  igAccessToken: string,
  videoUrl: string,
  caption?: string,
) {
  const body: Record<string, string> = {
    media_type: "REELS",
    video_url: videoUrl,
    access_token: igAccessToken,
  };
  if (caption) body.caption = caption;
  return body;
}

export function buildInstagramPublishBody(igAccessToken: string, creationId: string) {
  return { creation_id: creationId, access_token: igAccessToken };
}

export type InstagramReelPlan = {
  platform: "instagram";
  version: string;
  containerUrl: string;
  statusUrlTemplate: string;
  publishUrl: string;
  containerBody: Record<string, string>;
  publishBodyTemplate: { creation_id: string; access_token: string };
};

export function buildInstagramReelPlan(input: {
  igUserId: string;
  igAccessToken: string;
  videoUrl: string;
  caption?: string;
  version?: string;
}): InstagramReelPlan {
  const version = input.version || GRAPH_VERSION;
  return {
    platform: "instagram",
    version,
    containerUrl: instagramContainerUrl(input.igUserId, version),
    statusUrlTemplate: instagramStatusUrl("<container_id>", version),
    publishUrl: instagramPublishUrl(input.igUserId, version),
    containerBody: buildInstagramContainerBody(input.igAccessToken, input.videoUrl, input.caption),
    publishBodyTemplate: { creation_id: "<container_id>", access_token: input.igAccessToken },
  };
}

export type InstagramPhase = "poll" | "publish" | "failed" | "published";

/**
 * Container status_code -> next action.
 *   IN_PROGRESS -> keep polling
 *   FINISHED    -> eligible, call media_publish
 *   PUBLISHED   -> already published (idempotent re-poll)
 *   EXPIRED / ERROR -> terminal failure
 * Anything unknown is treated as still-in-progress rather than assumed healthy.
 */
export function instagramStatusToPhase(status: string | null | undefined): InstagramPhase {
  const v = String(status || "").trim().toUpperCase();
  switch (v) {
    case "FINISHED":
      return "publish";
    case "PUBLISHED":
      return "published";
    case "EXPIRED":
      return "failed";
    case "ERROR":
      return "failed";
    case "IN_PROGRESS":
      return "poll";
    default:
      return "poll";
  }
}

/** Published media id/permalink extraction for persistence. */
export function extractMetaPostIds(platform: string, payload: Record<string, unknown>) {
  if (platform === "facebook") {
    const id = payload.video_id || payload.id || null;
    return {
      platform_publish_id: id ? String(id) : null,
      platform_post_id: id ? String(id) : null,
      platform_post_url: payload.permalink_url ? String(payload.permalink_url) : null,
    };
  }
  const id = payload.id || null;
  return {
    platform_publish_id: id ? String(id) : null,
    platform_post_id: id ? String(id) : null,
    platform_post_url: payload.permalink ? String(payload.permalink) : null,
  };
}

// ------------------------------------------------------------------ client -- //

/**
 * Safe Graph request client.
 *
 * - pinned version is the caller's URL (built above), never re-derived here
 * - the token is passed as a parameter and NEVER logged: this function performs
 *   no logging at all, and errors are reduced to status + Graph error code
 * - a non-JSON or empty body yields {} rather than throwing on parse
 */
export type MetaFetch = (
  input: string,
  init?: Record<string, unknown>,
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;

export async function metaGraphRequest(
  fetchImpl: MetaFetch,
  url: string,
  init: Record<string, unknown>,
): Promise<{
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
  graphErrorCode: number | null;
  graphErrorMessage: string | null;
}> {
  try {
    const res = await fetchImpl(url, init);
    let body: Record<string, unknown> = {};
    try {
      const parsed = await res.json();
      if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
    } catch {
      body = {};
    }
    const err = (body.error || null) as Record<string, unknown> | null;
    return {
      ok: Boolean(res.ok) && !err,
      status: res.status,
      body,
      graphErrorCode: err && typeof err.code === "number" ? (err.code as number) : null,
      graphErrorMessage: err ? String(err.message || "graph_error") : null,
    };
  } catch (_e) {
    return {
      ok: false,
      status: 0,
      body: {},
      graphErrorCode: null,
      graphErrorMessage: "network_error",
    };
  }
}
