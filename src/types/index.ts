// BOOM! AI Video Editor - Shared Types

export interface Asset {
  id: string;
  filename: string;
  url: string;
  type: 'video' | 'audio' | 'image';
  duration?: number;
  size: number;
  createdAt: Date;
  metadata?: {
    width?: number;
    height?: number;
    fps?: number;
    codec?: string;
  };
}

export interface TimelineItem {
  id: string;
  assetId: string;
  startTime: number;
  endTime: number;
  track: number;
  effects?: Effect[];
  transitions?: Transition[];
}

export interface Effect {
  id: string;
  type: 'filter' | 'transform' | 'ai-style' | 'color-correction';
  name: string;
  parameters: Record<string, any>;
  intensity?: number;
}

export interface Transition {
  id: string;
  type: 'fade' | 'wipe' | 'dissolve' | 'zoom';
  duration: number;
  easing?: string;
}

export interface Timeline {
  id: string;
  jobId: string;
  items: TimelineItem[];
  duration: number;
  fps: number;
  resolution: {
    width: number;
    height: number;
  };
  audio?: {
    volume: number;
    fadeIn?: number;
    fadeOut?: number;
  };
}

export type JobStatus = 
  | 'pending'
  | 'processing' 
  | 'rendering'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Job {
  id: string;
  name: string;
  status: JobStatus;
  timeline: Timeline;
  assets: Asset[];
  outputUrl?: string;
  previewUrl?: string;
  stage?: string;
  progress?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedCompletionTime?: Date;
  renderSettings: {
    quality: 'draft' | 'standard' | 'high' | 'ultra';
    format: 'mp4' | 'mov' | 'webm';
    bitrate?: number;
  };
}

export interface AIStylePreset {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  parameters: Record<string, any>;
  category: 'cinematic' | 'artistic' | 'vintage' | 'modern' | 'experimental' | 'gaming' | 'luxury';
}

export interface RenderJob {
  id: string;
  jobId: string;
  status: JobStatus;
  progress: number;
  outputUrl?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}