// Create Video Job — Vercel serverless function (Edge runtime)
// Creates a render job and stores it so the Status page can track it.
// Real MP4 rendering happens in the ai-worker (Python/ffmpeg) — this
// function is the bridge that makes the UI flow work end-to-end.

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const name = body?.name || "Untitled Video";
    const styleId = body?.style_id || "luxury";
    const duration = parseInt(body?.duration || "15", 10);
    const music = body?.music || "auto";
    const files = Array.isArray(body?.files) ? body.files : [];

    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const job = {
      id: jobId,
      name,
      status: "queued",
      progress: 0,
      style_id: styleId,
      duration,
      music,
      file_count: files.length,
      resolution: "1080x1920",
      fps: 30,
      created_at: new Date().toISOString(),
    };

    // Store job for the status page (localStorage on client is primary;
    // this response carries the job so the client can persist it).
    return new Response(JSON.stringify({ job }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
