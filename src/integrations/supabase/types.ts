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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audio_bookmarks: {
        Row: {
          call_log_id: string
          category: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_auto_generated: boolean | null
          label: string
          metadata: Json | null
          timestamp: number
        }
        Insert: {
          call_log_id: string
          category?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_auto_generated?: boolean | null
          label: string
          metadata?: Json | null
          timestamp: number
        }
        Update: {
          call_log_id?: string
          category?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_auto_generated?: boolean | null
          label?: string
          metadata?: Json | null
          timestamp?: number
        }
        Relationships: [
          {
            foreignKeyName: "audio_bookmarks_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      call_campaigns: {
        Row: {
          assistant_id: string | null
          batch_size: number | null
          completed_at: string | null
          completed_calls: number | null
          created_at: string | null
          description: string | null
          end_time: string | null
          id: string
          interval_minutes: number | null
          name: string
          phone_number_id: string | null
          start_time: string | null
          started_at: string | null
          status: string | null
          total_contacts: number | null
        }
        Insert: {
          assistant_id?: string | null
          batch_size?: number | null
          completed_at?: string | null
          completed_calls?: number | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          interval_minutes?: number | null
          name: string
          phone_number_id?: string | null
          start_time?: string | null
          started_at?: string | null
          status?: string | null
          total_contacts?: number | null
        }
        Update: {
          assistant_id?: string | null
          batch_size?: number | null
          completed_at?: string | null
          completed_calls?: number | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          interval_minutes?: number | null
          name?: string
          phone_number_id?: string | null
          start_time?: string | null
          started_at?: string | null
          status?: string | null
          total_contacts?: number | null
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          analysis_structured_data: Json | null
          analysis_success_evaluation: string | null
          analysis_summary: string | null
          assistant_id: string | null
          call_type: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string
          customer_satisfaction: string | null
          duration: number | null
          ended_at: string | null
          error_message: string | null
          id: string
          phone_number_id: string | null
          recording_url: string | null
          retry_count: number | null
          scheduled_at: string | null
          sentiment: string | null
          started_at: string | null
          status: string | null
          transcript: string | null
          vapi_call_id: string
        }
        Insert: {
          analysis_structured_data?: Json | null
          analysis_success_evaluation?: string | null
          analysis_summary?: string | null
          assistant_id?: string | null
          call_type?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone: string
          customer_satisfaction?: string | null
          duration?: number | null
          ended_at?: string | null
          error_message?: string | null
          id?: string
          phone_number_id?: string | null
          recording_url?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          sentiment?: string | null
          started_at?: string | null
          status?: string | null
          transcript?: string | null
          vapi_call_id: string
        }
        Update: {
          analysis_structured_data?: Json | null
          analysis_success_evaluation?: string | null
          analysis_summary?: string | null
          assistant_id?: string | null
          call_type?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string
          customer_satisfaction?: string | null
          duration?: number | null
          ended_at?: string | null
          error_message?: string | null
          id?: string
          phone_number_id?: string | null
          recording_url?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          sentiment?: string | null
          started_at?: string | null
          status?: string | null
          transcript?: string | null
          vapi_call_id?: string
        }
        Relationships: []
      }
      call_queue: {
        Row: {
          assistant_id: string | null
          call_log_id: string | null
          campaign_id: string | null
          completed_at: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string
          dispatched_at: string | null
          error_message: string | null
          id: string
          initial_message: string | null
          max_retries: number | null
          phone_number_id: string | null
          priority: number | null
          retry_count: number | null
          scheduled_for: string | null
          status: string | null
        }
        Insert: {
          assistant_id?: string | null
          call_log_id?: string | null
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone: string
          dispatched_at?: string | null
          error_message?: string | null
          id?: string
          initial_message?: string | null
          max_retries?: number | null
          phone_number_id?: string | null
          priority?: number | null
          retry_count?: number | null
          scheduled_for?: string | null
          status?: string | null
        }
        Update: {
          assistant_id?: string | null
          call_log_id?: string | null
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string
          dispatched_at?: string | null
          error_message?: string | null
          id?: string
          initial_message?: string | null
          max_retries?: number | null
          phone_number_id?: string | null
          priority?: number | null
          retry_count?: number | null
          scheduled_for?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_queue_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "call_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      call_transcripts: {
        Row: {
          call_log_id: string
          created_at: string | null
          duration: number | null
          error_message: string | null
          full_text: string | null
          id: string
          keywords: Json | null
          language: string | null
          segments: Json | null
          sentiment_by_segment: Json | null
          status: string | null
          word_count: number | null
        }
        Insert: {
          call_log_id: string
          created_at?: string | null
          duration?: number | null
          error_message?: string | null
          full_text?: string | null
          id?: string
          keywords?: Json | null
          language?: string | null
          segments?: Json | null
          sentiment_by_segment?: Json | null
          status?: string | null
          word_count?: number | null
        }
        Update: {
          call_log_id?: string
          created_at?: string | null
          duration?: number | null
          error_message?: string | null
          full_text?: string | null
          id?: string
          keywords?: Json | null
          language?: string | null
          segments?: Json | null
          sentiment_by_segment?: Json | null
          status?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "call_transcripts_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_recordings: {
        Row: {
          access_log: Json | null
          allow_download: boolean | null
          allowed_emails: string[] | null
          call_log_id: string
          created_at: string | null
          created_by: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          max_views: number | null
          password_hash: string | null
          require_password: boolean | null
          revoked_at: string | null
          share_token: string
          view_count: number | null
        }
        Insert: {
          access_log?: Json | null
          allow_download?: boolean | null
          allowed_emails?: string[] | null
          call_log_id: string
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          max_views?: number | null
          password_hash?: string | null
          require_password?: boolean | null
          revoked_at?: string | null
          share_token: string
          view_count?: number | null
        }
        Update: {
          access_log?: Json | null
          allow_download?: boolean | null
          allowed_emails?: string[] | null
          call_log_id?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          max_views?: number | null
          password_hash?: string | null
          require_password?: boolean | null
          revoked_at?: string | null
          share_token?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_recordings_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
