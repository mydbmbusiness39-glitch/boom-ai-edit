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

class AIWorkerClient {
  private async callWorker(endpoint: string, options: RequestInit = {}) {
    const { data, error } = await supabase.functions.invoke('ai-worker-proxy', {
      body: {
        path: endpoint,
        ...options
      }
    });

    if (error) {
      throw new Error(`AI Worker error: ${error.message}`);
    }

    return data;
  }

  async analyzeBeats(audioFile: File): Promise<BeatsAnalysis> {
    const formData = new FormData();
    formData.append('file', audioFile);

    return this.callWorker('/analyze/beats', {
      method: 'POST',
      body: formData
    });
  }

  async analyzeScenes(videoFile: File): Promise<ScenesAnalysis> {
    const formData = new FormData();
    formData.append('file', videoFile);

    return this.callWorker('/analyze/scenes', {
      method: 'POST',
      body: formData
    });
  }

  async generateCaptions(request: CaptionsRequest): Promise<CaptionsResponse> {
    return this.callWorker('/generate/captions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
  }

  async compileTimeline(request: TimelineRequest): Promise<TimelineResponse> {
    return this.callWorker('/timeline/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
  }

  async healthCheck(): Promise<any> {
    return this.callWorker('/health', {
      method: 'GET'
    });
  }
}

export const aiWorkerClient = new AIWorkerClient();