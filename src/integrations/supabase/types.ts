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
          logo_url: string | null
          name: string
          outro_template: Json | null
          overlay_settings: Json | null
          price: number | null
          sales_count: number | null
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
          logo_url?: string | null
          name: string
          outro_template?: Json | null
          overlay_settings?: Json | null
          price?: number | null
          sales_count?: number | null
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
          logo_url?: string | null
          name?: string
          outro_template?: Json | null
          overlay_settings?: Json | null
          price?: number | null
          sales_count?: number | null
          updated_at?: string
          user_id?: string
          watermark_position?: string | null
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
          updated_at?: string
          user_id?: string
          watermarked?: boolean | null
        }
        Relationships: []
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
      increment_job_count: {
        Args: { user_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
