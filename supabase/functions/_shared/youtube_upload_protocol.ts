/** Official YouTube Data API v3 resumable upload helpers. No network. */

const UPLOAD_INIT = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function buildResumableInit(input: {
  title: string;
  description: string;
  privacy: "private" | "unlisted" | "public";
  contentType?: string;
  contentLength?: number;
}): {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: {
    snippet: { title: string; description: string; categoryId: string };
    status: { privacyStatus: string; selfDeclaredMadeForKids: boolean };
  };
} {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Type": input.contentType || "video/mp4",
  };
  if (typeof input.contentLength === "number") {
    headers["X-Upload-Content-Length"] = String(input.contentLength);
  }
  return {
    url: UPLOAD_INIT,
    method: "POST",
    headers,
    body: {
      snippet: {
        title: (input.title || "Boom Studio Short").slice(0, 100),
        description: (input.description || "").slice(0, 5000),
        categoryId: "22",
      },
      status: {
        privacyStatus: input.privacy,
        selfDeclaredMadeForKids: false,
      },
    },
  };
}

export function buildChunkPut(input: {
  sessionUrl: string;
  start: number;
  end: number;
  total: number;
}): { url: string; method: string; headers: Record<string, string> } {
  return {
    url: input.sessionUrl,
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes ${input.start}-${input.end}/${input.total}`,
    },
  };
}

export function readVideoId(payload: Record<string, unknown> | null | undefined): string | null {
  if (!payload) return null;
  const id = payload.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function buildRefreshTokenRequest(input: {
  clientId: string;
  clientSecret: string;
  refresh_token: string;
}): { url: string; method: string; headers: Record<string, string>; body: string } {
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    refresh_token: input.refresh_token,
    grant_type: "refresh_token",
  }).toString();
  return {
    url: TOKEN_URL,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  };
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

export function youtubeShortsUrl(videoId: string): string {
  return `https://www.youtube.com/shorts/${encodeURIComponent(videoId)}`;
}
