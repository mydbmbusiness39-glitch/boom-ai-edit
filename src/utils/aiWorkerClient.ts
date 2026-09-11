import { supabase } from "@/integrations/supabase/client";

export interface BeatsAnalysis {
  bpm: number;
  beats: number[];
  tempo_confidence: number;
}

export interface Scene {
  start: number;
  end: number;
  score: number;
}

export interface ScenesAnalysis {
  scenes: Scene[];
  total_duration: number;
}

export interface CaptionsRequest {
  style: 'rgb' | 'lux';
  duration: number;
  context?: string;
}

export interface CaptionsResponse {
  captions: string[];
  style: string;
}

export interface TimelineItem {
  id: string;
  type: 'video' | 'audio' | 'image' | 'text';
  start_time: number;
  end_time: number;
  track: number;
  content: Record<string, any>;
  effects?: Array<Record<string, any>>;
}

export interface TimelineRequest {
  items: TimelineItem[];
  duration: number;
  fps?: number;
  resolution?: { width: number; height: number };
}

export interface TimelineResponse {
  timeline: Record<string, any>;
  render_config: Record<string, any>;
  estimated_render_time: number;
}

function generateTraceId(): string {
  try {
    const crypto = globalThis.crypto || (globalThis as any).window?.crypto;
    const bytes = crypto ? crypto.getRandomValues(new Uint8Array(16)) : new Uint8Array(16);
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `trace-${hex}`;
  } catch (e) {
    return `trace-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }
}

/** JSON object sent to supabase.functions.invoke. path wins if payload also has path. */
export function buildAiWorkerInvokeBody(
  endpoint: string,
  payload: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...payload,
    path: endpoint,
  };
}

/**
 * supabase-js FunctionsClient.invoke serializes `body` to JSON only when
 * headers do not already contain Content-Type. Do not set Content-Type here.
 */
export function buildAiWorkerInvokeOptions(
  endpoint: string,
  payload: Record<string, unknown> = {},
  traceId: string = generateTraceId()
): { body: Record<string, unknown>; headers: Record<string, string> } {
  return {
    body: buildAiWorkerInvokeBody(endpoint, payload),
    headers: {
      'X-Trace-Id': traceId,
    },
  };
}

class AIWorkerClient {
  private async callWorker(endpoint: string, payload: Record<string, unknown> = {}) {
    const traceId = generateTraceId();
    const invoke = buildAiWorkerInvokeOptions(endpoint, payload, traceId);

    console.log('[DIAGNOSTIC] ai-worker-proxy invoke start', {
      endpoint,
      traceId,
      method: 'POST'
    });

    const { data, error } = await supabase.functions.invoke('ai-worker-proxy', invoke);

    if (error) {
      const errorShape: any = {
        name: error?.constructor?.name || error?.name || 'unknown',
        message: error?.message || 'unknown',
        status: error?.status || null,
        code: error?.code || null,
        details: error?.details || null,
        hint: error?.hint || null
      };
      console.log('[DIAGNOSTIC] ai-worker-proxy invoke error', {
        endpoint,
        traceId,
        errorShape,
        raw: typeof error === 'object' ? JSON.stringify(error).slice(0, 500) : String(error).slice(0, 500)
      });
      throw new Error(`AI Worker error: ${error.message || 'Unknown error'}`);
    }

    console.log('[DIAGNOSTIC] ai-worker-proxy invoke success', {
      endpoint,
      traceId,
      dataKeys: data ? Object.keys(data) : []
    });
    return data;
  }

  async analyzeBeats(audioFile: File): Promise<BeatsAnalysis> {
    const formData = new FormData();
    formData.append('file', audioFile);

    return this.callWorker('/analyze/beats');
  }

  async analyzeScenes(videoFile: File): Promise<ScenesAnalysis> {
    const formData = new FormData();
    formData.append('file', videoFile);
    const base = (import.meta as any).env?.VITE_SUPABASE_URL || window.location.origin;
    const target = `${base}/functions/v1/ai-worker-proxy/analyze/scenes`;
    const resp = await fetch(target, { method: 'POST', body: formData });
    if (!resp.ok) {
      throw new Error(`AI Worker error: ${resp.status} ${await resp.text()}`);
    }
    return resp.json();
  }

  async generateCaptions(request: CaptionsRequest): Promise<CaptionsResponse> {
    return this.callWorker('/generate/captions', {
      style: request.style,
      duration: request.duration,
      ...(request.context !== undefined ? { context: request.context } : {}),
    });
  }

  async compileTimeline(request: TimelineRequest): Promise<TimelineResponse> {
    // Gate #48: normalize to the worker's flat contract.
    // Worker expects: { items: [...], duration, fps?, resolution? }
    // The active app path historically sent nested { metadata, tracks }.
    // We accept either shape and always send flat on the wire.
    const body = normalizeTimelineRequest(request);
    return this.callWorker('/timeline/compile', body);
  }


  async healthCheck(): Promise<any> {
    return this.callWorker('/health');
  }
}

// Normalize nested { metadata, tracks } -> flat { items, duration, fps, resolution }
// so the wire body always matches the worker's TimelineRequest contract.
function normalizeTimelineRequest(request: any): any {
  if (request && Array.isArray((request as any).items)) {
    // already flat; ensure required fields present
    return {
      items: (request as any).items,
      duration: (request as any).duration ?? 0,
      fps: (request as any).fps ?? 30,
      resolution: (request as any).resolution ?? { width: 1080, height: 1920 },
    };
  }
  // nested shape: { metadata: { duration, resolution? }, tracks: [ { id, type, start, end, ... } ] }
  const meta = (request as any).metadata ?? {};
  const tracks = (request as any).tracks ?? [];
  const items = tracks.map((t: any, i: number) => ({
    id: t.id ?? `item-${i}`,
    type: t.type ?? 'video',
    start_time: t.start_time ?? t.start ?? 0,
    end_time: t.end_time ?? t.end ?? (meta.duration ?? 0),
    track: t.track ?? 0,
    content: t.content ?? {},
    effects: t.effects ?? [],
  }));
  return {
    items,
    duration: meta.duration ?? (request as any).duration ?? 0,
    fps: (request as any).fps ?? 30,
    resolution: meta.resolution ?? (request as any).resolution ?? { width: 1080, height: 1920 },
  };
}

export const aiWorkerClient = new AIWorkerClient();