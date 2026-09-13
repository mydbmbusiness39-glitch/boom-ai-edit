import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Resilient env reads (accept both all-caps and the dashboard's mixed-case names)
// so a minor secret-naming difference does not block the handoff.
function envFirst(...names) {
  for (const n of names){
    const v = Deno.env.get(n);
    if (v) return v;
  }
  return undefined;
}
// Gate #77 real-source ingest: consume the stored compile shape
//   files.timeline.timeline.{tracks,metadata}
// (worker /timeline/compile wraps the doc). Never fall back to synth_frame.png.
function unwrapCompiledTimeline(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.tracks && (raw.metadata || raw.version)) return raw;
  const nested = raw.timeline;
  if (nested && typeof nested === 'object' && nested.tracks) return nested;
  return null;
}
function collectMediaSrcs(doc) {
  const srcs = [];
  const tracks = doc && doc.tracks && typeof doc.tracks === 'object' ? doc.tracks : {};
  for (const track of Object.values(tracks)){
    const items = track && Array.isArray(track.items) ? track.items : [];
    for (const item of items){
      const src = item && item.content && item.content.src;
      if (typeof src === 'string' && src) srcs.push({
        type: item.type,
        src
      });
    }
  }
  return srcs;
}
function isPlaceholderSrc(src) {
  return typeof src === 'string' && src.indexOf('test_assets/synth_frame') !== -1;
}
function buildTimelineFromMedia(job) {
  const duration = Number(job?.duration) || 15;
  const media = Array.isArray(job?.files?.media) ? job.files.media : [];
  const video = media.find((f)=>f && (f.type === 'video' || typeof f.url === 'string') && f.url);
  if (!video || !video.url) return null;
  return {
    version: "1.0",
    metadata: {
      duration,
      fps: 30,
      resolution: {
        width: 1080,
        height: 1920
      }
    },
    tracks: {
      track_0: {
        id: "track_0",
        type: "mixed",
        items: [
          {
            id: "file-0",
            type: "video",
            start: 0.0,
            end: duration,
            duration,
            content: {
              src: video.url,
              name: video.name || "upload.mp4",
              type: "video"
            },
            effects: [],
            z_index: 0
          }
        ]
      }
    }
  };
}
function buildTimeline(job) {
  const compiled = unwrapCompiledTimeline(job?.files?.timeline);
  if (compiled) {
    const srcs = collectMediaSrcs(compiled);
    const real = srcs.filter((s)=>s.src && !isPlaceholderSrc(s.src));
    if (real.length > 0) return injectCaptionItems(compiled, job);
    const fromMedia = buildTimelineFromMedia(job);
    if (fromMedia) return injectCaptionItems(fromMedia, job);
    throw new Error('NO_PRODUCTION_MEDIA: compiled timeline has no usable source URL');
  }
  const fromMedia = buildTimelineFromMedia(job);
  if (fromMedia) return injectCaptionItems(fromMedia, job);
  throw new Error('NO_PRODUCTION_MEDIA: no compiled timeline tracks and no uploaded media URL');
}
function injectCaptionItems(timeline, job) {
  if (!timeline || typeof timeline !== 'object') return timeline;
  const raw = job?.files?.captions;
  if (!Array.isArray(raw) || raw.length === 0) return timeline;
  const duration = Number(job?.duration) || Number(timeline?.metadata?.duration) || 15;
  const preset = job?.files?.caption_style || 'classic';
  const items = [];
  for (const cap of raw){
    if (!cap || typeof cap !== 'object') continue;
    const text = String(cap.text || '').trim();
    if (!text) continue;
    const start = Math.max(0, Number(cap.start || 0));
    const end = Math.min(duration, Number(cap.end || duration));
    if (!(end > start)) continue;
    items.push({
      id: `caption-${start.toFixed(2)}-${Math.round(start * 1000)}`,
      type: 'text',
      start,
      end,
      duration: end - start,
      content: {
        text,
        style: {
          preset
        }
      },
      effects: [],
      z_index: 999
    });
  }
  if (!items.length) return timeline;
  return {
    ...timeline,
    tracks: {
      ...timeline.tracks || {},
      track_captions: {
        id: 'track_captions',
        type: 'text',
        items
      }
    }
  };
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const aiWorkerUrl = envFirst('AI_WORKER_URL', 'AI_Worker_URL');
    const aiWorkerToken = envFirst('AI_WORKER_API_KEY', 'AI_WORKER_TOKEN', 'AI_Worker_API_key');
    const redisUrl = Deno.env.get('REDIS_URL');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { jobId, stage } = body;
    console.log(`Processing job ${jobId} at stage: ${stage}`);
    const { data: job, error: jobError } = await supabase.from('jobs_new').select('*').eq('id', jobId).single();
    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message || 'Unknown error'}`);
    }
    await supabase.from('jobs_new').update({
      status: 'processing',
      updated_at: new Date().toISOString()
    }).eq('id', jobId);
    let nextStage = '';
    let progress = 0;
    switch(stage){
      case 'beats':
        console.log('Analyzing beats...');
        progress = 20;
        nextStage = 'scenes';
        const audioFiles = job.files?.media?.filter((f)=>f.type === 'audio') || [];
        if (audioFiles.length > 0) {
          try {
            const response = await fetch(`${aiWorkerUrl}/analyze/beats`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${aiWorkerToken}`
              },
              body: new FormData()
            });
            if (response.ok) {
              const beatData = await response.json();
              console.log('Beat analysis complete:', beatData);
            }
          } catch (error) {
            console.error('Beat analysis error:', error);
          }
        }
        break;
      case 'scenes':
        console.log('Analyzing scenes...');
        progress = 40;
        nextStage = 'captions';
        const videoFiles = job.files?.media?.filter((f)=>f.type === 'video') || [];
        if (videoFiles.length > 0) {
          try {
            const response = await fetch(`${aiWorkerUrl}/analyze/scenes`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${aiWorkerToken}`
              },
              body: new FormData()
            });
            if (response.ok) {
              const sceneData = await response.json();
              console.log('Scene analysis complete:', sceneData);
            }
          } catch (error) {
            console.error('Scene analysis error:', error);
          }
        }
        break;
      case 'captions':
        console.log('Captions stage: skip unpaid LLM hype-caption call');
        progress = 60;
        nextStage = 'timeline';
        try {
          const existingCaptions = job.files?.captions;
          const hasTimedCaptions = Array.isArray(existingCaptions) && existingCaptions.length > 0 && typeof existingCaptions[0] === 'object' && existingCaptions[0] !== null && 'start' in existingCaptions[0] && 'end' in existingCaptions[0];
          if (hasTimedCaptions) {
            console.log('Preserving existing timed captions; skipping LLM generation.');
          } else {
            console.log('No timed captions on job; not calling paid LLM caption generator.');
          }
        } catch (error) {
          console.error('Caption stage error:', error);
        }
        break;
      case 'timeline':
        console.log('Compiling timeline...');
        progress = 80;
        nextStage = 'render';
        try {
          const timelineRequest = {
            items: [],
            duration: job.duration || 15,
            fps: 30,
            resolution: {
              width: 1080,
              height: 1920
            }
          };
          const response = await fetch(`${aiWorkerUrl}/timeline/compile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${aiWorkerToken}`
            },
            body: JSON.stringify(timelineRequest)
          });
          if (response.ok) {
            const timelineData = await response.json();
            console.log('Timeline compilation complete');
            const previewUrl = `${Deno.env.get('PUBLIC_BASE_URL')}/previews/${jobId}_preview.mp4`;
            await supabase.from('jobs_new').update({
              preview_url: previewUrl,
              progress: 90
            }).eq('id', jobId);
          }
        } catch (error) {
          console.error('Timeline compilation error:', error);
        }
        break;
      case 'render':
        // Gate #76: real storage-handoff render (proven pattern from Gate #75).
        // Mint a signed upload URL -> enqueue a Cloud Task -> worker renders ->
        // uploads to Supabase Storage. No fake setTimeout, no fabricated output_url.
        console.log('Rendering via storage-handoff (Gate #75 pattern)...');
        progress = 95;
        // Idempotency: do not enqueue a second render if already rendering/done.
        if (job.status === 'rendering' || job.status === 'completed') {
          console.log(`Job ${jobId} already ${job.status}; skipping duplicate enqueue.`);
          break;
        }
        const objectPath = `outputs/${jobId}_final.mp4`;
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/videoupload/${objectPath}`;
        const { data: signed, error: signErr } = await supabase.storage.from('videoupload').createSignedUploadUrl(objectPath, {
          upsert: true
        });
        if (signErr || !signed) {
          throw new Error(`signed upload mint failed: ${JSON.stringify(signErr)}`);
        }
        const timeline = buildTimeline(job);
        const enqueueRes = await fetch(`${aiWorkerUrl}/enqueue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${aiWorkerToken}`
          },
          body: JSON.stringify({
            job_id: jobId,
            timeline,
            upload_url: signed.signedUrl
          })
        });
        const enqueueBody = await enqueueRes.json();
        if (!enqueueRes.ok) {
          throw new Error(`enqueue failed: ${JSON.stringify(enqueueBody)}`);
        }
        // Mark rendering + record the final Storage destination. The worker
        // uploads to the signed URL asynchronously; completion is confirmed by
        // the controlled production-render gate (does not mutate a real job here).
        await supabase.from('jobs_new').update({
          status: 'rendering',
          output_url: publicUrl,
          progress: 95,
          updated_at: new Date().toISOString()
        }).eq('id', jobId);
        console.log(`Job ${jobId} render enqueued; output will land at ${objectPath}`);
        // Durable bounded completion recheck (Gate #77): persist next_stage so the
        // AFTER UPDATE trigger fires job-processor for render-complete independently
        // of this request's lifecycle. The worker uploads asynchronously; render-complete
        // verifies Storage + flips to completed.
        await supabase.from('jobs_new').update({
          next_stage: 'render-complete',
          render_check: 0
        }).eq('id', jobId);
        break;
      case 'render-complete':
        // Gate #77: confirm async worker render landed in Storage, flip to completed.
        // The worker uploads to the signed URL (no Supabase key on worker); the
        // Edge Function (which holds the service role) verifies + finalizes here.
        console.log('Checking render completion in Storage...');
        const checkPath = `outputs/${jobId}_final.mp4`;
        // Gate #77 Defect E fix (v8): replace download() with createSignedUrl().
        // download() calls res.blob(), which throws inside the Deno Edge xhr
        // polyfill, so the detector false-negated on a present artifact.
        // createSignedUrl() returns an error ONLY if the exact-path object is
        // absent (server-validated) — no blob/byte-shape dependency, no throw.
        const { data: sig, error: sigErr } = await supabase.storage.from('videoupload').createSignedUrl(checkPath, 60);
        let found = !sigErr && !!sig?.signedUrl;
        // Optional strict non-empty check: verify a non-zero content length via
        // the signed URL HEAD (no body read, avoids the blob() breakage).
        // [G77_DETECTOR] capture sanitized fields from the SAME single HEAD (no extra fetch).
        let headStatus = null;
        let contentLength = null;
        let caughtClass = 'none';
        if (found && sig?.signedUrl) {
          try {
            const head = await fetch(sig.signedUrl, {
              method: 'HEAD'
            });
            headStatus = head.status;
            contentLength = Number(head.headers.get('content-length') || '0');
            // Defect E-a: never let a non-OK / missing-length HEAD reset a
            // createSignedUrl-proven object. Only flip found=false when HEAD
            // confirms an empty object.
            if (head.ok && contentLength === 0) {
              found = false;
            }
          } catch (headErr) {
            // HEAD failing is non-fatal; existence already proven by signedUrl.
            caughtClass = headErr?.constructor?.name ?? 'unknown';
          }
        }
        // [G77_DETECTOR] sanitized observability (no secrets/url/raw-msg). Behavior unchanged.
        console.log(`[G77_DETECTOR] v9 diag job=${jobId} renderCheck=${body.renderCheck ?? 0} sigErrPresent=${!!sigErr} sigCode=${sigErr?.code ?? 'none'} signedUrlPresent=${!!sig?.signedUrl} headStatus=${headStatus} contentLength=${contentLength} caughtClass=${caughtClass}`);
        if (!found) {
          // Gate #77 Defect E timing: /task-render for a 15s 1080x1920 job took
          // ~30.75s (bdfa585f). The old policy was 12 immediate rechecks (~17s)
          // and exhausted before the upload landed. Bounded wait must exceed
          // expected /task-render duration with margin, then fail closed.
          // Evidence 29230672: /task-render 149.8s; 48 attempts ~123s wall, artifact 26s later.
          const MAX_RENDER_COMPLETE_ATTEMPTS = 90; // ~90 * (1s backoff + invoke) ≥ 180s / ~3.5 min wall
          const RENDER_COMPLETE_BACKOFF_MS = 1000; // must stay well under pg_net timeout_milliseconds=5000
          let attempts = Number(body.renderCheck) || 0;
          if (attempts < MAX_RENDER_COMPLETE_ATTEMPTS) {
            console.log(`Render not ready yet (attempt ${attempts}/${MAX_RENDER_COMPLETE_ATTEMPTS}); backoff ${RENDER_COMPLETE_BACKOFF_MS}ms then recheck.`);
            await new Promise((r)=>setTimeout(r, RENDER_COMPLETE_BACKOFF_MS));
            // Durable reschedule: bump render_check so the trigger re-fires render-complete.
            await supabase.from('jobs_new').update({
              next_stage: 'render-complete',
              render_check: attempts + 1
            }).eq('id', jobId);
            break;
          }
          const timeoutMsg = `render object not found in Storage after ${MAX_RENDER_COMPLETE_ATTEMPTS} retries (~${Math.round(MAX_RENDER_COMPLETE_ATTEMPTS * RENDER_COMPLETE_BACKOFF_MS / 1000)}s): ${JSON.stringify(sigErr)}`;
          await supabase.from('jobs_new').update({
            status: 'failed',
            updated_at: new Date().toISOString()
          }).eq('id', jobId);
          throw new Error(timeoutMsg);
        }
        const pubUrl = `${supabaseUrl}/storage/v1/object/public/videoupload/${checkPath}`;
        await supabase.from('jobs_new').update({
          status: 'completed',
          output_url: pubUrl,
          progress: 100,
          updated_at: new Date().toISOString()
        }).eq('id', jobId);
        console.log(`Job ${jobId} completed; output at ${pubUrl}`);
        progress = 100;
        break;
    }
    if (nextStage) {
      await supabase.from('jobs_new').update({
        progress,
        next_stage: nextStage,
        render_check: 0
      }).eq('id', jobId);
      console.log(`Queued next stage (durable): ${nextStage} for job ${jobId}`);
    }
    return new Response(JSON.stringify({
      success: true,
      jobId,
      stage,
      progress,
      nextStage
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Job processing error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
