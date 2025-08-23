export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_avatars: {
        Row: {
          animation_style: string | null
          avatar_type: string
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
          voice_model_id: string | null
        }
        Insert: {
          animation_style?: string | null
          avatar_type?: string
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
          voice_model_id?: string | null
        }
        Update: {
          animation_style?: string | null
          avatar_type?: string
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
          voice_model_id?: string | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          created_at: string
          id: string
          job_id: string
          kind: string
          meta: Json | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          kind: string
          meta?: Json | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          kind?: string
          meta?: Json | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_templates: {
        Row: {
          brand_colors: Json | null
          created_at: string
          fonts: Json | null
          id: string
          intro_template: Json | null
          is_default: boolean | null
          is_public: boolean | null
          is_team_shared: boolean | null
          logo_url: string | null
          name: string
          outro_template: Json | null
          overlay_settings: Json | null
          price: number | null
          sales_count: number | null
          team_id: string | null
          updated_at: string
          user_id: string
          watermark_position: string | null
        }
        Insert: {
          brand_colors?: Json | null
          created_at?: string
          fonts?: Json | null
          id?: string
          intro_template?: Json | null
          is_default?: boolean | null
          is_public?: boolean | null
          is_team_shared?: boolean | null
          logo_url?: string | null
          name: string
          outro_template?: Json | null
          overlay_settings?: Json | null
          price?: number | null
          sales_count?: number | null
          team_id?: string | null
          updated_at?: string
          user_id: string
          watermark_position?: string | null
        }
        Update: {
          brand_colors?: Json | null
          created_at?: string
          fonts?: Json | null
          id?: string
          intro_template?: Json | null
          is_default?: boolean | null
          is_public?: boolean | null
          is_team_shared?: boolean | null
          logo_url?: string | null
          name?: string
          outro_template?: Json | null
          overlay_settings?: Json | null
          price?: number | null
          sales_count?: number | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
          watermark_position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_performances: {
        Row: {
          click_through_rate: number | null
          clip_title: string | null
          clip_url: string
          comments: number | null
          confidence_level: number | null
          created_at: string
          engagement_rate: number | null
          id: string
          job_id: string | null
          last_updated: string | null
          likes: number | null
          platform: string
          posted_at: string | null
          predicted_max_views: number | null
          saves: number | null
          shares: number | null
          team_id: string | null
          updated_at: string
          user_id: string
          views: number | null
          viral_prediction_score: number | null
          watch_time_seconds: number | null
        }
        Insert: {
          click_through_rate?: number | null
          clip_title?: string | null
          clip_url: string
          comments?: number | null
          confidence_level?: number | null
          created_at?: string
          engagement_rate?: number | null
          id?: string
          job_id?: string | null
          last_updated?: string | null
          likes?: number | null
          platform: string
          posted_at?: string | null
          predicted_max_views?: number | null
          saves?: number | null
          shares?: number | null
          team_id?: string | null
          updated_at?: string
          user_id: string
          views?: number | null
          viral_prediction_score?: number | null
          watch_time_seconds?: number | null
        }
        Update: {
          click_through_rate?: number | null
          clip_title?: string | null
          clip_url?: string
          comments?: number | null
          confidence_level?: number | null
          created_at?: string
          engagement_rate?: number | null
          id?: string
          job_id?: string | null
          last_updated?: string | null
          likes?: number | null
          platform?: string
          posted_at?: string | null
          predicted_max_views?: number | null
          saves?: number | null
          shares?: number | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
          views?: number | null
          viral_prediction_score?: number | null
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clip_performances_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_performances_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_sync_configs: {
        Row: {
          access_token_encrypted: string | null
          auto_sync_new_videos: boolean | null
          created_at: string
          expires_at: string | null
          id: string
          is_enabled: boolean | null
          last_sync_at: string | null
          provider: string
          refresh_token_encrypted: string | null
          sync_folder_path: string | null
          sync_status: string | null
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          auto_sync_new_videos?: boolean | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          provider: string
          refresh_token_encrypted?: string | null
          sync_folder_path?: string | null
          sync_status?: string | null
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          auto_sync_new_videos?: boolean | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          provider?: string
          refresh_token_encrypted?: string | null
          sync_folder_path?: string | null
          sync_status?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloud_sync_configs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_analytics: {
        Row: {
          ad_revenue: number | null
          avg_watch_time: number | null
          created_at: string
          date: string
          engagement_rate: number | null
          estimated_revenue: number | null
          followers_count: number | null
          following_count: number | null
          id: string
          platform: string
          sponsored_content_revenue: number | null
          total_comments: number | null
          total_likes: number | null
          total_shares: number | null
          total_videos: number | null
          total_views: number | null
          total_watch_time_hours: number | null
          updated_at: string
          user_id: string
          viral_clips_count: number | null
        }
        Insert: {
          ad_revenue?: number | null
          avg_watch_time?: number | null
          created_at?: string
          date?: string
          engagement_rate?: number | null
          estimated_revenue?: number | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          platform: string
          sponsored_content_revenue?: number | null
          total_comments?: number | null
          total_likes?: number | null
          total_shares?: number | null
          total_videos?: number | null
          total_views?: number | null
          total_watch_time_hours?: number | null
          updated_at?: string
          user_id: string
          viral_clips_count?: number | null
        }
        Update: {
          ad_revenue?: number | null
          avg_watch_time?: number | null
          created_at?: string
          date?: string
          engagement_rate?: number | null
          estimated_revenue?: number | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          platform?: string
          sponsored_content_revenue?: number | null
          total_comments?: number | null
          total_likes?: number | null
          total_shares?: number | null
          total_videos?: number | null
          total_views?: number | null
          total_watch_time_hours?: number | null
          updated_at?: string
          user_id?: string
          viral_clips_count?: number | null
        }
        Relationships: []
      }
      dynamic_overlays: {
        Row: {
          avatar_id: string | null
          created_at: string
          id: string
          name: string
          position: string | null
          reactions: Json | null
          size: string | null
          style_settings: Json | null
          trigger_keywords: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_id?: string | null
          created_at?: string
          id?: string
          name: string
          position?: string | null
          reactions?: Json | null
          size?: string | null
          style_settings?: Json | null
          trigger_keywords?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_id?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: string | null
          reactions?: Json | null
          size?: string | null
          style_settings?: Json | null
          trigger_keywords?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          bpm: number | null
          captions: Json | null
          created_at: string
          duration_s: number
          id: string
          logs: string | null
          output_url: string | null
          preview_url: string | null
          progress: number | null
          stage: string | null
          status: string
          style: string
          timeline: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bpm?: number | null
          captions?: Json | null
          created_at?: string
          duration_s: number
          id?: string
          logs?: string | null
          output_url?: string | null
          preview_url?: string | null
          progress?: number | null
          stage?: string | null
          status?: string
          style: string
          timeline?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bpm?: number | null
          captions?: Json | null
          created_at?: string
          duration_s?: number
          id?: string
          logs?: string | null
          output_url?: string | null
          preview_url?: string | null
          progress?: number | null
          stage?: string | null
          status?: string
          style?: string
          timeline?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs_new: {
        Row: {
          created_at: string
          duration: number | null
          files: Json | null
          id: string
          name: string
          output_url: string | null
          preview_url: string | null
          progress: number | null
          status: string
          style_id: string | null
          team_id: string | null
          updated_at: string
          user_id: string
          watermarked: boolean | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          files?: Json | null
          id?: string
          name: string
          output_url?: string | null
          preview_url?: string | null
          progress?: number | null
          status?: string
          style_id?: string | null
          team_id?: string | null
          updated_at?: string
          user_id: string
          watermarked?: boolean | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          files?: Json | null
          id?: string
          name?: string
          output_url?: string | null
          preview_url?: string | null
          progress?: number | null
          status?: string
          style_id?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
          watermarked?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_new_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_items: {
        Row: {
          content: Json
          created_at: string
          creator_id: string
          description: string | null
          downloads_count: number | null
          id: string
          is_featured: boolean | null
          is_free: boolean | null
          name: string
          preview_url: string | null
          price: number
          rating: number | null
          reviews_count: number | null
          status: string | null
          tags: Json | null
          thumbnail_url: string | null
          type: string
          updated_at: string
        }
        Insert: {
          content: Json
          created_at?: string
          creator_id: string
          description?: string | null
          downloads_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_free?: boolean | null
          name: string
          preview_url?: string | null
          price?: number
          rating?: number | null
          reviews_count?: number | null
          status?: string | null
          tags?: Json | null
          thumbnail_url?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          creator_id?: string
          description?: string | null
          downloads_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_free?: boolean | null
          name?: string
          preview_url?: string | null
          price?: number
          rating?: number | null
          reviews_count?: number | null
          status?: string | null
          tags?: Json | null
          thumbnail_url?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      performance_snapshots: {
        Row: {
          clip_performance_id: string
          comments_delta: number | null
          created_at: string
          hours_since_post: number | null
          id: string
          likes_delta: number | null
          shares_delta: number | null
          snapshot_date: string
          views_delta: number | null
        }
        Insert: {
          clip_performance_id: string
          comments_delta?: number | null
          created_at?: string
          hours_since_post?: number | null
          id?: string
          likes_delta?: number | null
          shares_delta?: number | null
          snapshot_date?: string
          views_delta?: number | null
        }
        Update: {
          clip_performance_id?: string
          comments_delta?: number | null
          created_at?: string
          hours_since_post?: number | null
          id?: string
          likes_delta?: number | null
          shares_delta?: number | null
          snapshot_date?: string
          views_delta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_snapshots_clip_performance_id_fkey"
            columns: ["clip_performance_id"]
            isOneToOne: false
            referencedRelation: "clip_performances"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          jobs_today: number | null
          last_job_date: string | null
          plan: string
          tier: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          jobs_today?: number | null
          last_job_date?: string | null
          plan?: string
          tier?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          jobs_today?: number | null
          last_job_date?: string | null
          plan?: string
          tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          buyer_id: string
          id: string
          item_id: string
          price_paid: number
          purchased_at: string
        }
        Insert: {
          buyer_id: string
          id?: string
          item_id: string
          price_paid: number
          purchased_at?: string
        }
        Update: {
          buyer_id?: string
          id?: string
          item_id?: string
          price_paid?: number
          purchased_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_operations: {
        Row: {
          bytes_transferred: number | null
          cloud_file_id: string | null
          cloud_file_path: string | null
          cloud_file_url: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          operation_type: string
          provider: string
          started_at: string | null
          status: string
          total_bytes: number | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          bytes_transferred?: number | null
          cloud_file_id?: string | null
          cloud_file_path?: string | null
          cloud_file_url?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          operation_type: string
          provider: string
          started_at?: string | null
          status?: string
          total_bytes?: number | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          bytes_transferred?: number | null
          cloud_file_id?: string | null
          cloud_file_path?: string | null
          cloud_file_url?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          operation_type?: string
          provider?: string
          started_at?: string | null
          status?: string
          total_bytes?: number | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_operations_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_library"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          plan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          plan?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      uploads: {
        Row: {
          created_at: string
          file_path: string
          file_size: number
          filename: string
          id: string
          job_id: string | null
          mime_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size: number
          filename: string
          id?: string
          job_id?: string | null
          mime_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number
          filename?: string
          id?: string
          job_id?: string | null
          mime_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploads_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_new"
            referencedColumns: ["id"]
          },
        ]
      }
      video_library: {
        Row: {
          auto_backup_enabled: boolean | null
          backup_status: string | null
          cloud_sync_status: Json | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          file_path: string
          file_size: number
          filename: string
          folder_path: string | null
          id: string
          is_favorite: boolean | null
          job_id: string | null
          mime_type: string
          original_filename: string
          processing_status: string | null
          source_type: string
          tags: Json | null
          team_id: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_backup_enabled?: boolean | null
          backup_status?: string | null
          cloud_sync_status?: Json | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          file_path: string
          file_size: number
          filename: string
          folder_path?: string | null
          id?: string
          is_favorite?: boolean | null
          job_id?: string | null
          mime_type: string
          original_filename: string
          processing_status?: string | null
          source_type?: string
          tags?: Json | null
          team_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_backup_enabled?: boolean | null
          backup_status?: string | null
          cloud_sync_status?: Json | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          file_path?: string
          file_size?: number
          filename?: string
          folder_path?: string | null
          id?: string
          is_favorite?: boolean | null
          job_id?: string | null
          mime_type?: string
          original_filename?: string
          processing_status?: string | null
          source_type?: string
          tags?: Json | null
          team_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_library_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_library_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      viral_insights: {
        Row: {
          actual_viral: boolean | null
          clip_id: string | null
          created_at: string
          id: string
          improvement_suggestions: Json | null
          job_id: string | null
          optimal_posting_times: Json | null
          predicted_viral: boolean | null
          prediction_accuracy: number | null
          target_audience: Json | null
          trending_elements: Json | null
          updated_at: string
          user_id: string
          viral_factors: Json | null
        }
        Insert: {
          actual_viral?: boolean | null
          clip_id?: string | null
          created_at?: string
          id?: string
          improvement_suggestions?: Json | null
          job_id?: string | null
          optimal_posting_times?: Json | null
          predicted_viral?: boolean | null
          prediction_accuracy?: number | null
          target_audience?: Json | null
          trending_elements?: Json | null
          updated_at?: string
          user_id: string
          viral_factors?: Json | null
        }
        Update: {
          actual_viral?: boolean | null
          clip_id?: string | null
          created_at?: string
          id?: string
          improvement_suggestions?: Json | null
          job_id?: string | null
          optimal_posting_times?: Json | null
          predicted_viral?: boolean | null
          prediction_accuracy?: number | null
          target_audience?: Json | null
          trending_elements?: Json | null
          updated_at?: string
          user_id?: string
          viral_factors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "viral_insights_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clip_performances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viral_insights_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs_new"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_models: {
        Row: {
          created_at: string
          elevenlabs_voice_id: string | null
          id: string
          name: string
          sample_audio_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          elevenlabs_voice_id?: string | null
          id?: string
          name: string
          sample_audio_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          elevenlabs_voice_id?: string | null
          id?: string
          name?: string
          sample_audio_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_scripts: {
        Row: {
          audio_url: string | null
          created_at: string
          duration_ms: number | null
          id: string
          script_text: string
          script_type: string | null
          updated_at: string
          user_id: string
          voice_model_id: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          script_text: string
          script_type?: string | null
          updated_at?: string
          user_id: string
          voice_model_id?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          script_text?: string
          script_type?: string | null
          updated_at?: string
          user_id?: string
          voice_model_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_job_limit: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_team_role: {
        Args: { team_uuid: string; user_uuid: string }
        Returns: Database["public"]["Enums"]["team_role"]
      }
      increment_job_count: {
        Args: { user_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      team_role: "owner" | "manager" | "editor" | "uploader" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      team_role: ["owner", "manager", "editor", "uploader", "viewer"],
    },
  },
} as const
