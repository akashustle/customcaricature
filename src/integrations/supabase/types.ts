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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_action_log: {
        Row: {
          action: string
          admin_name: string
          created_at: string
          details: string | null
          id: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          admin_name?: string
          created_at?: string
          details?: string | null
          id?: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          admin_name?: string
          created_at?: string
          details?: string | null
          id?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_action_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "admin_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_activity_logs: {
        Row: {
          action_type: string
          admin_id: string
          admin_name: string
          created_at: string
          description: string | null
          device_info: string | null
          id: string
          ip_address: string | null
          module: string
          new_value: Json | null
          old_value: Json | null
          target_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          admin_name?: string
          created_at?: string
          description?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          module?: string
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          admin_name?: string
          created_at?: string
          description?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          module?: string
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
        }
        Relationships: []
      }
      admin_ai_alerts: {
        Row: {
          admin_id: string | null
          admin_name: string | null
          alert_type: string
          created_at: string
          description: string | null
          id: string
          is_read: boolean
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          suggestion: string | null
          title: string
        }
        Insert: {
          admin_id?: string | null
          admin_name?: string | null
          alert_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          suggestion?: string | null
          title: string
        }
        Update: {
          admin_id?: string | null
          admin_name?: string | null
          alert_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          suggestion?: string | null
          title?: string
        }
        Relationships: []
      }
      admin_blocked_ips: {
        Row: {
          blocked_by: string
          created_at: string
          id: string
          ip_address: string
          reason: string | null
        }
        Insert: {
          blocked_by: string
          created_at?: string
          id?: string
          ip_address: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string
          created_at?: string
          id?: string
          ip_address?: string
          reason?: string | null
        }
        Relationships: []
      }
      admin_failed_logins: {
        Row: {
          created_at: string
          device_info: string | null
          email: string
          id: string
          ip_address: string | null
          reason: string | null
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          email: string
          id?: string
          ip_address?: string | null
          reason?: string | null
        }
        Update: {
          created_at?: string
          device_info?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      admin_login_tracking: {
        Row: {
          created_at: string | null
          id: string
          otp_code: string | null
          otp_expires_at: string | null
          otp_required: boolean | null
          total_logins: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          otp_code?: string | null
          otp_expires_at?: string | null
          otp_required?: boolean | null
          total_logins?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          otp_code?: string | null
          otp_expires_at?: string | null
          otp_required?: boolean | null
          total_logins?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_media_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: string | null
          id: string
          target_order_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: string | null
          id?: string
          target_order_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: string | null
          id?: string
          target_order_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          access_level: string
          created_at: string
          id: string
          tab_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          id?: string
          tab_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: string
          created_at?: string
          id?: string
          tab_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_risk_scores: {
        Row: {
          admin_id: string
          created_at: string
          failed_logins: number
          id: string
          last_calculated_at: string
          risk_level: string
          risk_score: number
          suspicious_edits: number
          unusual_behavior: number
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          failed_logins?: number
          id?: string
          last_calculated_at?: string
          risk_level?: string
          risk_score?: number
          suspicious_edits?: number
          unusual_behavior?: number
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          failed_logins?: number
          id?: string
          last_calculated_at?: string
          risk_level?: string
          risk_score?: number
          suspicious_edits?: number
          unusual_behavior?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_security_alerts: {
        Row: {
          admin_id: string | null
          alert_type: string
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          admin_id?: string | null
          alert_type: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
        }
        Update: {
          admin_id?: string | null
          alert_type?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          admin_name: string
          device_info: string | null
          entered_name: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          last_active_at: string
          location_info: string | null
          login_at: string
          login_count: number | null
          steps_log: Json | null
          user_id: string
        }
        Insert: {
          admin_name?: string
          device_info?: string | null
          entered_name?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_active_at?: string
          location_info?: string | null
          login_at?: string
          login_count?: number | null
          steps_log?: Json | null
          user_id: string
        }
        Update: {
          admin_name?: string
          device_info?: string | null
          entered_name?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_active_at?: string
          location_info?: string | null
          login_at?: string
          login_count?: number | null
          steps_log?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      admin_site_settings: {
        Row: {
          id: string
          updated_at: string
          value: Json
        }
        Insert: {
          id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      ai_caricature_jobs: {
        Row: {
          caricature_image_url: string | null
          created_at: string
          id: string
          original_image_url: string
          status: string
          style: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caricature_image_url?: string | null
          created_at?: string
          id?: string
          original_image_url: string
          status?: string
          style?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caricature_image_url?: string | null
          created_at?: string
          id?: string
          original_image_url?: string
          status?: string
          style?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          sender_name: string | null
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role?: string
          sender_name?: string | null
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          sender_name?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          admin_joined: boolean
          admin_user_id: string | null
          created_at: string
          guest_city: string | null
          guest_email: string | null
          guest_ip: string | null
          guest_name: string | null
          id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_joined?: boolean
          admin_user_id?: string | null
          created_at?: string
          guest_city?: string | null
          guest_email?: string | null
          guest_ip?: string | null
          guest_name?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_joined?: boolean
          admin_user_id?: string | null
          created_at?: string
          guest_city?: string | null
          guest_email?: string | null
          guest_ip?: string | null
          guest_name?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_actions: {
        Row: {
          action_type: string
          created_at: string
          device_info: string | null
          id: string
          metadata: Json | null
          screen: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          device_info?: string | null
          id?: string
          metadata?: Json | null
          screen?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          device_info?: string | null
          id?: string
          metadata?: Json | null
          screen?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_downloads: {
        Row: {
          app_version: string | null
          created_at: string
          device_info: string | null
          id: string
          ip_address: string | null
          platform: string
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          platform?: string
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          platform?: string
          user_id?: string | null
        }
        Relationships: []
      }
      artist_action_logs: {
        Row: {
          action_type: string
          artist_id: string
          artist_name: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action_type: string
          artist_id: string
          artist_name?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action_type?: string
          artist_id?: string
          artist_name?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_action_logs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_blocked_dates: {
        Row: {
          artist_id: string | null
          blocked_date: string
          blocked_end_time: string | null
          blocked_start_time: string | null
          city: string | null
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          artist_id?: string | null
          blocked_date: string
          blocked_end_time?: string | null
          blocked_start_time?: string | null
          city?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          artist_id?: string | null
          blocked_date?: string
          blocked_end_time?: string | null
          blocked_start_time?: string | null
          city?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_blocked_dates_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_documents: {
        Row: {
          artist_id: string
          created_at: string
          document_type: string
          file_name: string
          id: string
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          document_type?: string
          file_name: string
          id?: string
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          id?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_documents_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_event_payouts: {
        Row: {
          artist_id: string
          calculated_amount: number
          created_at: string
          credited_at: string | null
          event_id: string
          event_total: number
          id: string
          payout_type: string
          payout_value: number
          status: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          calculated_amount?: number
          created_at?: string
          credited_at?: string | null
          event_id: string
          event_total?: number
          id?: string
          payout_type?: string
          payout_value?: number
          status?: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          calculated_amount?: number
          created_at?: string
          credited_at?: string | null
          event_id?: string
          event_total?: number
          id?: string
          payout_type?: string
          payout_value?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_event_payouts_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_event_payouts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_payment_details: {
        Row: {
          artist_id: string
          bank_account_name: string | null
          bank_account_number: string | null
          bank_ifsc_code: string | null
          created_at: string | null
          default_payment_method: string | null
          id: string
          updated_at: string | null
          upi_id: string | null
          upi_number: string | null
        }
        Insert: {
          artist_id: string
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc_code?: string | null
          created_at?: string | null
          default_payment_method?: string | null
          id?: string
          updated_at?: string | null
          upi_id?: string | null
          upi_number?: string | null
        }
        Update: {
          artist_id?: string
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc_code?: string | null
          created_at?: string | null
          default_payment_method?: string | null
          id?: string
          updated_at?: string | null
          upi_id?: string | null
          upi_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_payment_details_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: true
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_payout_requests: {
        Row: {
          admin_note: string | null
          amount: number
          artist_id: string
          created_at: string
          credited_at: string | null
          expected_credit_date: string | null
          id: string
          note: string | null
          preferred_payment_method: string | null
          request_type: string
          screenshot_path: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          artist_id: string
          created_at?: string
          credited_at?: string | null
          expected_credit_date?: string | null
          id?: string
          note?: string | null
          preferred_payment_method?: string | null
          request_type?: string
          screenshot_path?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          artist_id?: string
          created_at?: string
          credited_at?: string | null
          expected_credit_date?: string | null
          id?: string
          note?: string | null
          preferred_payment_method?: string | null
          request_type?: string
          screenshot_path?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_payout_requests_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_payout_settings: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          is_active: boolean
          payout_cycle: string
          payout_type: string
          payout_value: number
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          payout_cycle?: string
          payout_type?: string
          payout_value?: number
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          payout_cycle?: string
          payout_type?: string
          payout_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_payout_settings_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: true
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_transactions: {
        Row: {
          amount: number
          artist_id: string
          created_at: string
          description: string | null
          event_id: string | null
          id: string
          payout_request_id: string | null
          screenshot_path: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          artist_id: string
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          payout_request_id?: string | null
          screenshot_path?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          artist_id?: string
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          payout_request_id?: string | null
          screenshot_path?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_transactions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_transactions_payout_request_id_fkey"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "artist_payout_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          experience: string | null
          id: string
          mobile: string | null
          name: string
          portfolio_url: string | null
          secret_code: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          experience?: string | null
          id?: string
          mobile?: string | null
          name: string
          portfolio_url?: string | null
          secret_code?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          experience?: string | null
          id?: string
          mobile?: string | null
          name?: string
          portfolio_url?: string | null
          secret_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      artwork_ready_photos: {
        Row: {
          created_at: string
          file_name: string
          id: string
          order_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          order_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          order_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "artwork_ready_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_assign_eligible_artists: {
        Row: {
          artist_id: string
          created_at: string
          id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_assign_eligible_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: true
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_templates: {
        Row: {
          category: string | null
          created_at: string | null
          delay_minutes: number | null
          id: string
          is_enabled: boolean | null
          label: string
          message_body: string
          sort_order: number | null
          template_key: string
          trigger_event: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          is_enabled?: boolean | null
          label: string
          message_body: string
          sort_order?: number | null
          template_key: string
          trigger_event?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          is_enabled?: boolean | null
          label?: string
          message_body?: string
          sort_order?: number | null
          template_key?: string
          trigger_event?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      before_after_gallery: {
        Row: {
          after_image_url: string
          before_image_url: string
          caption: string | null
          created_at: string
          id: string
          is_active: boolean
          sort_order: number
        }
        Insert: {
          after_image_url: string
          before_image_url: string
          caption?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          after_image_url?: string
          before_image_url?: string
          caption?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string
          category: string
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          category?: string
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          category?: string
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      calculator_pricing_sets: {
        Row: {
          created_at: string
          details: string | null
          id: string
          is_active: boolean
          label: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          is_active?: boolean
          label: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          is_active?: boolean
          label?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      calculator_sessions: {
        Row: {
          action_taken: string | null
          artist_count: number | null
          city: string | null
          clicked_link: string | null
          created_at: string
          guest_count: number | null
          id: string
          ip_address: string | null
          region: string | null
          suggested_price: number | null
        }
        Insert: {
          action_taken?: string | null
          artist_count?: number | null
          city?: string | null
          clicked_link?: string | null
          created_at?: string
          guest_count?: number | null
          id?: string
          ip_address?: string | null
          region?: string | null
          suggested_price?: number | null
        }
        Update: {
          action_taken?: string | null
          artist_count?: number | null
          city?: string | null
          clicked_link?: string | null
          created_at?: string
          guest_count?: number | null
          id?: string
          ip_address?: string | null
          region?: string | null
          suggested_price?: number | null
        }
        Relationships: []
      }
      caricature_gallery: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          sort_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number
        }
        Relationships: []
      }
      caricature_types: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_faces: number
          min_faces: number
          name: string
          per_face: boolean
          price: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_faces?: number
          min_faces?: number
          name: string
          per_face?: boolean
          price?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_faces?: number
          min_faces?: number
          name?: string
          per_face?: boolean
          price?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          deleted: boolean
          edited_at: string | null
          file_name: string | null
          file_url: string | null
          id: string
          is_admin: boolean
          is_artist_chat: boolean
          message: string
          read: boolean
          receiver_id: string | null
          sender_id: string
        }
        Insert: {
          created_at?: string
          deleted?: boolean
          edited_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_admin?: boolean
          is_artist_chat?: boolean
          message: string
          read?: boolean
          receiver_id?: string | null
          sender_id: string
        }
        Update: {
          created_at?: string
          deleted?: boolean
          edited_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_admin?: boolean
          is_artist_chat?: boolean
          message?: string
          read?: boolean
          receiver_id?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      chatbot_training_data: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          block_type: string
          content: Json
          id: string
          is_visible: boolean
          page: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          block_type?: string
          content?: Json
          id: string
          is_visible?: boolean
          page?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          block_type?: string
          content?: Json
          id?: string
          is_visible?: boolean
          page?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      coupon_uses: {
        Row: {
          coupon_id: string
          created_at: string
          discount_applied: number
          id: string
          order_id: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_applied?: number
          id?: string
          order_id?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_applied?: number
          id?: string
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          allowed_user_ids: string[] | null
          applies_to: string
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount_amount: number | null
          max_uses: number | null
          min_order_amount: number | null
          times_used: number
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          allowed_user_ids?: string[] | null
          applies_to?: string
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_uses?: number | null
          min_order_amount?: number | null
          times_used?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          allowed_user_ids?: string[] | null
          applies_to?: string
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_uses?: number | null
          min_order_amount?: number | null
          times_used?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      customer_event_pricing: {
        Row: {
          artist_count: number
          created_at: string
          custom_advance_amount: number
          custom_extra_hour_rate: number
          custom_total_price: number
          id: string
          region: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_count?: number
          created_at?: string
          custom_advance_amount: number
          custom_extra_hour_rate?: number
          custom_total_price: number
          id?: string
          region: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_count?: number
          created_at?: string
          custom_advance_amount?: number
          custom_extra_hour_rate?: number
          custom_total_price?: number
          id?: string
          region?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_international_event_pricing: {
        Row: {
          artist_count: number
          country: string
          created_at: string
          custom_advance_amount: number
          custom_extra_hour_rate: number
          custom_total_price: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_count?: number
          country: string
          created_at?: string
          custom_advance_amount: number
          custom_extra_hour_rate?: number
          custom_total_price: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_count?: number
          country?: string
          created_at?: string
          custom_advance_amount?: number
          custom_extra_hour_rate?: number
          custom_total_price?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_pricing: {
        Row: {
          caricature_type_slug: string
          created_at: string
          custom_price: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caricature_type_slug: string
          created_at?: string
          custom_price: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caricature_type_slug?: string
          created_at?: string
          custom_price?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          budget: number | null
          caricature_type: string | null
          city: string | null
          country: string | null
          created_at: string
          district: string | null
          email: string | null
          enquiry_number: string
          enquiry_type: string
          estimated_price: number | null
          event_date: string | null
          event_type: string | null
          follow_up_date: string | null
          id: string
          instagram_id: string | null
          link_clicked: boolean | null
          link_clicked_at: string | null
          mobile: string
          name: string
          pricing_source: string | null
          source: string | null
          state: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          budget?: number | null
          caricature_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          enquiry_number: string
          enquiry_type?: string
          estimated_price?: number | null
          event_date?: string | null
          event_type?: string | null
          follow_up_date?: string | null
          id?: string
          instagram_id?: string | null
          link_clicked?: boolean | null
          link_clicked_at?: string | null
          mobile: string
          name: string
          pricing_source?: string | null
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          budget?: number | null
          caricature_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          enquiry_number?: string
          enquiry_type?: string
          estimated_price?: number | null
          event_date?: string | null
          event_type?: string | null
          follow_up_date?: string | null
          id?: string
          instagram_id?: string | null
          link_clicked?: boolean | null
          link_clicked_at?: string | null
          mobile?: string
          name?: string
          pricing_source?: string | null
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      enquiry_event_pricing: {
        Row: {
          city: string | null
          created_at: string
          currency: string
          district: string | null
          id: string
          is_active: boolean
          price: number
          priority: number
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          currency?: string
          district?: string | null
          id?: string
          is_active?: boolean
          price?: number
          priority?: number
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          currency?: string
          district?: string | null
          id?: string
          is_active?: boolean
          price?: number
          priority?: number
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      enquiry_settings: {
        Row: {
          id: string
          updated_at: string
          value: Json
        }
        Insert: {
          id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      event_artist_assignments: {
        Row: {
          artist_id: string
          created_at: string
          event_id: string
          id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          event_id: string
          id?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_artist_assignments_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artist_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      event_blocked_dates: {
        Row: {
          blocked_by: string
          blocked_date: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_by: string
          blocked_date: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string
          blocked_date?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      event_bookings: {
        Row: {
          accommodation_confirmed: boolean
          advance_amount: number
          artist_count: number
          assigned_artist_id: string | null
          city: string
          client_email: string
          client_instagram: string | null
          client_mobile: string
          client_name: string
          country: string
          created_at: string
          event_date: string
          event_end_time: string
          event_start_time: string
          event_type: string
          extra_hours: number
          full_address: string
          id: string
          is_international: boolean
          is_mumbai: boolean
          negotiated: boolean
          negotiated_advance: number | null
          negotiated_total: number | null
          notes: string | null
          payment_status: string
          pincode: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          registration_lat: number | null
          registration_lng: number | null
          registration_location_name: string | null
          remaining_amount: number | null
          sheet_pushed: boolean | null
          sheet_pushed_at: string | null
          source: string | null
          state: string
          status: string
          total_price: number
          travel_confirmed: boolean
          updated_at: string
          user_id: string | null
          venue_name: string
        }
        Insert: {
          accommodation_confirmed?: boolean
          advance_amount: number
          artist_count?: number
          assigned_artist_id?: string | null
          city: string
          client_email: string
          client_instagram?: string | null
          client_mobile: string
          client_name: string
          country?: string
          created_at?: string
          event_date: string
          event_end_time: string
          event_start_time: string
          event_type: string
          extra_hours?: number
          full_address: string
          id?: string
          is_international?: boolean
          is_mumbai?: boolean
          negotiated?: boolean
          negotiated_advance?: number | null
          negotiated_total?: number | null
          notes?: string | null
          payment_status?: string
          pincode: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          registration_lat?: number | null
          registration_lng?: number | null
          registration_location_name?: string | null
          remaining_amount?: number | null
          sheet_pushed?: boolean | null
          sheet_pushed_at?: string | null
          source?: string | null
          state: string
          status?: string
          total_price: number
          travel_confirmed?: boolean
          updated_at?: string
          user_id?: string | null
          venue_name: string
        }
        Update: {
          accommodation_confirmed?: boolean
          advance_amount?: number
          artist_count?: number
          assigned_artist_id?: string | null
          city?: string
          client_email?: string
          client_instagram?: string | null
          client_mobile?: string
          client_name?: string
          country?: string
          created_at?: string
          event_date?: string
          event_end_time?: string
          event_start_time?: string
          event_type?: string
          extra_hours?: number
          full_address?: string
          id?: string
          is_international?: boolean
          is_mumbai?: boolean
          negotiated?: boolean
          negotiated_advance?: number | null
          negotiated_total?: number | null
          notes?: string | null
          payment_status?: string
          pincode?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          registration_lat?: number | null
          registration_lng?: number | null
          registration_location_name?: string | null
          remaining_amount?: number | null
          sheet_pushed?: boolean | null
          sheet_pushed_at?: string | null
          source?: string | null
          state?: string
          status?: string
          total_price?: number
          travel_confirmed?: boolean
          updated_at?: string
          user_id?: string | null
          venue_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_bookings_assigned_artist_id_fkey"
            columns: ["assigned_artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      event_drafts: {
        Row: {
          city: string | null
          created_at: string
          district: string | null
          end_time: string | null
          event_date: string | null
          event_type: string | null
          full_address: string | null
          hours: number | null
          id: string
          notes: string | null
          pincode: string | null
          start_time: string | null
          state: string | null
          updated_at: string
          user_id: string
          venue_name: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          district?: string | null
          end_time?: string | null
          event_date?: string | null
          event_type?: string | null
          full_address?: string | null
          hours?: number | null
          id?: string
          notes?: string | null
          pincode?: string | null
          start_time?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          venue_name?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          district?: string | null
          end_time?: string | null
          event_date?: string | null
          event_type?: string | null
          full_address?: string | null
          hours?: number | null
          id?: string
          notes?: string | null
          pincode?: string | null
          start_time?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          venue_name?: string | null
        }
        Relationships: []
      }
      event_flight_tickets: {
        Row: {
          created_at: string
          event_id: string
          file_name: string
          id: string
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          event_id: string
          file_name: string
          id?: string
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          event_id?: string
          file_name?: string
          id?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_flight_tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      event_gallery: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          sort_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number
        }
        Relationships: []
      }
      event_payment_claims: {
        Row: {
          admin_reply: string | null
          amount: number
          claim_type: string
          created_at: string
          event_id: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_path: string | null
          status: string
          updated_at: string
          user_id: string
          user_note: string | null
        }
        Insert: {
          admin_reply?: string | null
          amount?: number
          claim_type: string
          created_at?: string
          event_id: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path?: string | null
          status?: string
          updated_at?: string
          user_id: string
          user_note?: string | null
        }
        Update: {
          admin_reply?: string | null
          amount?: number
          claim_type?: string
          created_at?: string
          event_id?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_payment_claims_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      event_pricing: {
        Row: {
          advance_amount: number
          artist_count: number
          created_at: string
          extra_hour_rate: number
          id: string
          region: string
          total_price: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          advance_amount?: number
          artist_count?: number
          created_at?: string
          extra_hour_rate?: number
          id?: string
          region: string
          total_price?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          advance_amount?: number
          artist_count?: number
          created_at?: string
          extra_hour_rate?: number
          id?: string
          region?: string
          total_price?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      event_reschedule_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          event_id: string
          id: string
          reason: string | null
          requested_date: string
          requested_end_time: string
          requested_start_time: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          event_id: string
          id?: string
          reason?: string | null
          requested_date: string
          requested_end_time: string
          requested_start_time: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          event_id?: string
          id?: string
          reason?: string | null
          requested_date?: string
          requested_end_time?: string
          requested_start_time?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reschedule_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          created_at: string
          field_key: string
          field_type: string
          form_id: string
          id: string
          is_required: boolean
          is_visible: boolean
          label: string
          options: Json | null
          placeholder: string | null
          sort_order: number
          updated_at: string
          validation: Json | null
        }
        Insert: {
          created_at?: string
          field_key: string
          field_type?: string
          form_id: string
          id?: string
          is_required?: boolean
          is_visible?: boolean
          label: string
          options?: Json | null
          placeholder?: string | null
          sort_order?: number
          updated_at?: string
          validation?: Json | null
        }
        Update: {
          created_at?: string
          field_key?: string
          field_type?: string
          form_id?: string
          id?: string
          is_required?: boolean
          is_visible?: boolean
          label?: string
          options?: Json | null
          placeholder?: string | null
          sort_order?: number
          updated_at?: string
          validation?: Json | null
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          session_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      google_indexing_log: {
        Row: {
          action_type: string
          created_at: string
          error_message: string | null
          id: string
          success: boolean
          url: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          success?: boolean
          url: string
        }
        Update: {
          action_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          success?: boolean
          url?: string
        }
        Relationships: []
      }
      guest_enquiry_tracking: {
        Row: {
          created_at: string
          enquiry_count: number
          fingerprint: string
          id: string
          last_enquiry_at: string
          mobile: string | null
        }
        Insert: {
          created_at?: string
          enquiry_count?: number
          fingerprint: string
          id?: string
          last_enquiry_at?: string
          mobile?: string | null
        }
        Update: {
          created_at?: string
          enquiry_count?: number
          fingerprint?: string
          id?: string
          last_enquiry_at?: string
          mobile?: string | null
        }
        Relationships: []
      }
      homepage_reviews: {
        Row: {
          created_at: string | null
          designation: string | null
          id: string
          is_visible: boolean | null
          rating: number
          review_text: string
          reviewer_name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          designation?: string | null
          id?: string
          is_visible?: boolean | null
          rating?: number
          review_text: string
          reviewer_name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          designation?: string | null
          id?: string
          is_visible?: boolean | null
          rating?: number
          review_text?: string
          reviewer_name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      international_event_pricing: {
        Row: {
          advance_amount: number
          artist_count: number
          country: string
          created_at: string
          currency: string
          extra_hour_rate: number
          id: string
          total_price: number
          updated_at: string
        }
        Insert: {
          advance_amount?: number
          artist_count?: number
          country: string
          created_at?: string
          currency?: string
          extra_hour_rate?: number
          id?: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          advance_amount?: number
          artist_count?: number
          country?: string
          created_at?: string
          currency?: string
          extra_hour_rate?: number
          id?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          customer_email: string
          customer_mobile: string
          customer_name: string
          id: string
          invoice_number: string
          invoice_type: string
          items: Json
          notes: string | null
          order_id: string | null
          payment_id: string | null
          payment_method: string | null
          shop_order_id: string | null
          status: string
          tax_amount: number
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          customer_email: string
          customer_mobile: string
          customer_name: string
          id?: string
          invoice_number?: string
          invoice_type?: string
          items?: Json
          notes?: string | null
          order_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          shop_order_id?: string | null
          status?: string
          tax_amount?: number
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          customer_email?: string
          customer_mobile?: string
          customer_name?: string
          id?: string
          invoice_number?: string
          invoice_type?: string
          items?: Json
          notes?: string | null
          order_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          shop_order_id?: string | null
          status?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lead_follow_ups: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          enquiry_id: string
          follow_up_type: string | null
          id: string
          note: string
          scheduled_at: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          enquiry_id: string
          follow_up_type?: string | null
          id?: string
          note: string
          scheduled_at?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          enquiry_id?: string
          follow_up_type?: string | null
          id?: string
          note?: string
          scheduled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_follow_ups_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_link_actions: {
        Row: {
          action_type: string
          created_at: string
          details: string | null
          id: string
          lead_link_id: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: string | null
          id?: string
          lead_link_id: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: string | null
          id?: string
          lead_link_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_link_actions_lead_link_id_fkey"
            columns: ["lead_link_id"]
            isOneToOne: false
            referencedRelation: "lead_links"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_link_caricature_pricing: {
        Row: {
          caricature_type_slug: string
          created_at: string
          custom_price: number
          id: string
          lead_link_id: string
        }
        Insert: {
          caricature_type_slug: string
          created_at?: string
          custom_price: number
          id?: string
          lead_link_id: string
        }
        Update: {
          caricature_type_slug?: string
          created_at?: string
          custom_price?: number
          id?: string
          lead_link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_link_caricature_pricing_lead_link_id_fkey"
            columns: ["lead_link_id"]
            isOneToOne: false
            referencedRelation: "lead_links"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_link_event_pricing: {
        Row: {
          artist_count: number
          created_at: string
          custom_advance_amount: number
          custom_extra_hour_rate: number
          custom_total_price: number
          id: string
          lead_link_id: string
          region: string
        }
        Insert: {
          artist_count?: number
          created_at?: string
          custom_advance_amount?: number
          custom_extra_hour_rate?: number
          custom_total_price?: number
          id?: string
          lead_link_id: string
          region?: string
        }
        Update: {
          artist_count?: number
          created_at?: string
          custom_advance_amount?: number
          custom_extra_hour_rate?: number
          custom_total_price?: number
          id?: string
          lead_link_id?: string
          region?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_link_event_pricing_lead_link_id_fkey"
            columns: ["lead_link_id"]
            isOneToOne: false
            referencedRelation: "lead_links"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_links: {
        Row: {
          booking_id: string | null
          booking_status: string | null
          created_at: string
          created_by: string
          created_by_user_id: string
          id: string
          is_active: boolean
          is_used: boolean
          label: string
          link_code: string
          notes: string | null
          updated_at: string
          used_at: string | null
          used_by_email: string | null
          used_by_mobile: string | null
          used_by_name: string | null
          used_by_user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          booking_status?: string | null
          created_at?: string
          created_by?: string
          created_by_user_id: string
          id?: string
          is_active?: boolean
          is_used?: boolean
          label?: string
          link_code?: string
          notes?: string | null
          updated_at?: string
          used_at?: string | null
          used_by_email?: string | null
          used_by_mobile?: string | null
          used_by_name?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          booking_status?: string | null
          created_at?: string
          created_by?: string
          created_by_user_id?: string
          id?: string
          is_active?: boolean
          is_used?: boolean
          label?: string
          link_code?: string
          notes?: string | null
          updated_at?: string
          used_at?: string | null
          used_by_email?: string | null
          used_by_mobile?: string | null
          used_by_name?: string | null
          used_by_user_id?: string | null
        }
        Relationships: []
      }
      lil_flea_gallery: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          image_url: string
          is_featured: boolean | null
          sort_order: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          is_featured?: boolean | null
          sort_order?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          is_featured?: boolean | null
          sort_order?: number | null
        }
        Relationships: []
      }
      lil_flea_notify_users: {
        Row: {
          created_at: string
          id: string
          instagram_id: string | null
          mobile: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_id?: string | null
          mobile: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          instagram_id?: string | null
          mobile?: string
          name?: string
        }
        Relationships: []
      }
      live_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          message_type: string
          options: Json | null
          sender_name: string | null
          sender_type: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_type?: string
          options?: Json | null
          sender_name?: string | null
          sender_type?: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          options?: Json | null
          sender_name?: string | null
          sender_type?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_chat_sessions: {
        Row: {
          admin_name: string | null
          admin_user_id: string | null
          browser_session_id: string
          caricature_type: string | null
          ended_at: string | null
          estimated_price: number | null
          event_city: string | null
          event_date: string | null
          event_district: string | null
          event_state: string | null
          event_time: string | null
          face_count: number | null
          id: string
          service_type: string
          started_at: string
          status: string
          user_address: string | null
          user_email: string | null
          user_name: string
          user_phone: string | null
        }
        Insert: {
          admin_name?: string | null
          admin_user_id?: string | null
          browser_session_id: string
          caricature_type?: string | null
          ended_at?: string | null
          estimated_price?: number | null
          event_city?: string | null
          event_date?: string | null
          event_district?: string | null
          event_state?: string | null
          event_time?: string | null
          face_count?: number | null
          id?: string
          service_type?: string
          started_at?: string
          status?: string
          user_address?: string | null
          user_email?: string | null
          user_name: string
          user_phone?: string | null
        }
        Update: {
          admin_name?: string | null
          admin_user_id?: string | null
          browser_session_id?: string
          caricature_type?: string | null
          ended_at?: string | null
          estimated_price?: number | null
          event_city?: string | null
          event_date?: string | null
          event_district?: string | null
          event_state?: string | null
          event_time?: string | null
          face_count?: number | null
          id?: string
          service_type?: string
          started_at?: string
          status?: string
          user_address?: string | null
          user_email?: string | null
          user_name?: string
          user_phone?: string | null
        }
        Relationships: []
      }
      maintenance_settings: {
        Row: {
          allowed_user_ids: string[] | null
          estimated_end: string | null
          id: string
          is_enabled: boolean
          message: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed_user_ids?: string[] | null
          estimated_end?: string | null
          id: string
          is_enabled?: boolean
          message?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed_user_ids?: string[] | null
          estimated_end?: string | null
          id?: string
          is_enabled?: boolean
          message?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notification_batches: {
        Row: {
          clicked_count: number
          created_at: string
          delivered_count: number
          id: string
          link: string | null
          message: string
          sent_by: string
          sent_to_count: number
          title: string
        }
        Insert: {
          clicked_count?: number
          created_at?: string
          delivered_count?: number
          id?: string
          link?: string | null
          message: string
          sent_by: string
          sent_to_count?: number
          title: string
        }
        Update: {
          clicked_count?: number
          created_at?: string
          delivered_count?: number
          id?: string
          link?: string | null
          message?: string
          sent_by?: string
          sent_to_count?: number
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          batch_id: string | null
          clicked: boolean
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          clicked?: boolean
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          batch_id?: string | null
          clicked?: boolean
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "notification_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      order_extensions: {
        Row: {
          admin_name: string | null
          created_at: string | null
          id: string
          new_date: string
          old_date: string | null
          order_id: string
          reason: string
          updated_by: string | null
        }
        Insert: {
          admin_name?: string | null
          created_at?: string | null
          id?: string
          new_date: string
          old_date?: string | null
          order_id: string
          reason: string
          updated_by?: string | null
        }
        Update: {
          admin_name?: string | null
          created_at?: string | null
          id?: string
          new_date?: string
          old_date?: string | null
          order_id?: string
          reason?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_extensions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_images: {
        Row: {
          created_at: string
          file_name: string
          id: string
          order_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          order_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          order_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_images_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          art_confirmation_status: string | null
          artist_message: string | null
          artist_name: string | null
          ask_user_delivered: boolean | null
          assigned_artist_id: string | null
          caricature_type: Database["public"]["Enums"]["caricature_type"]
          city: string | null
          country: string | null
          created_at: string
          current_stage: string | null
          customer_email: string
          customer_mobile: string
          customer_name: string
          delivery_address: string | null
          delivery_city: string | null
          delivery_pincode: string | null
          delivery_state: string | null
          district: string | null
          expected_delivery_date: string | null
          extended_delivery_date: string | null
          extension_reason: string | null
          face_count: number
          id: string
          instagram_id: string | null
          is_framed: boolean | null
          negotiated_amount: number | null
          notes: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          payment_status: string | null
          payment_verified: boolean | null
          preview_image_url: string | null
          priority: number | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          state: string | null
          status: Database["public"]["Enums"]["order_status"]
          style: Database["public"]["Enums"]["caricature_style"]
          timeline_logs: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          art_confirmation_status?: string | null
          artist_message?: string | null
          artist_name?: string | null
          ask_user_delivered?: boolean | null
          assigned_artist_id?: string | null
          caricature_type: Database["public"]["Enums"]["caricature_type"]
          city?: string | null
          country?: string | null
          created_at?: string
          current_stage?: string | null
          customer_email: string
          customer_mobile: string
          customer_name: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_pincode?: string | null
          delivery_state?: string | null
          district?: string | null
          expected_delivery_date?: string | null
          extended_delivery_date?: string | null
          extension_reason?: string | null
          face_count?: number
          id?: string
          instagram_id?: string | null
          is_framed?: boolean | null
          negotiated_amount?: number | null
          notes?: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          payment_status?: string | null
          payment_verified?: boolean | null
          preview_image_url?: string | null
          priority?: number | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          style?: Database["public"]["Enums"]["caricature_style"]
          timeline_logs?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          art_confirmation_status?: string | null
          artist_message?: string | null
          artist_name?: string | null
          ask_user_delivered?: boolean | null
          assigned_artist_id?: string | null
          caricature_type?: Database["public"]["Enums"]["caricature_type"]
          city?: string | null
          country?: string | null
          created_at?: string
          current_stage?: string | null
          customer_email?: string
          customer_mobile?: string
          customer_name?: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_pincode?: string | null
          delivery_state?: string | null
          district?: string | null
          expected_delivery_date?: string | null
          extended_delivery_date?: string | null
          extension_reason?: string | null
          face_count?: number
          id?: string
          instagram_id?: string | null
          is_framed?: boolean | null
          negotiated_amount?: number | null
          notes?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_status?: string | null
          payment_verified?: boolean | null
          preview_image_url?: string | null
          priority?: number | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          style?: Database["public"]["Enums"]["caricature_style"]
          timeline_logs?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_artist_id_fkey"
            columns: ["assigned_artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_demands: {
        Row: {
          amount: number
          created_at: string | null
          event_id: string
          id: string
          is_paid: boolean | null
          note: string | null
          paid_at: string | null
          status_on_paid: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          event_id: string
          id?: string
          is_paid?: boolean | null
          note?: string | null
          paid_at?: string | null
          status_on_paid?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          event_id?: string
          id?: string
          is_paid?: boolean | null
          note?: string | null
          paid_at?: string | null
          status_on_paid?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_demands_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          payment_type: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          payment_type?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          payment_type?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      portal_payment_requests: {
        Row: {
          amount: number
          artist_id: string
          created_at: string
          event_id: string
          extra_amount: number
          extra_hours: number
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          artist_id: string
          created_at?: string
          event_id: string
          extra_amount?: number
          extra_hours?: number
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          artist_id?: string
          created_at?: string
          event_id?: string
          extra_amount?: number
          extra_hours?: number
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_payment_requests_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_payment_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_verification_history: {
        Row: {
          action: string
          created_at: string
          id: string
          new_status: string | null
          notes: string | null
          performed_by: string | null
          performed_by_user_id: string | null
          previous_status: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_status?: string | null
          notes?: string | null
          performed_by?: string | null
          performed_by_user_id?: string | null
          previous_status?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_status?: string | null
          notes?: string | null
          performed_by?: string | null
          performed_by_user_id?: string | null
          previous_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          age: number | null
          avatar_url: string | null
          city: string | null
          created_at: string
          created_from_workshop: boolean
          display_id: string | null
          district: string | null
          email: string
          email_verified: boolean | null
          event_booking_allowed: boolean
          event_edit_allowed: boolean
          full_name: string
          gateway_charges_enabled: boolean
          gender: string | null
          id: string
          instagram_id: string | null
          international_booking_allowed: boolean
          is_manual: boolean
          is_verified: boolean
          mobile: string
          occupation: string | null
          pincode: string | null
          registration_lat: number | null
          registration_lng: number | null
          registration_location_name: string | null
          secret_code: string | null
          secret_code_login_enabled: boolean
          shop_access_allowed: boolean
          state: string | null
          updated_at: string
          user_id: string
          verification_method: string | null
          verification_notes: string | null
          verification_status: string
          verification_submitted_at: string | null
          verified_at: string | null
          verified_by: string | null
          why_join: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          created_from_workshop?: boolean
          display_id?: string | null
          district?: string | null
          email: string
          email_verified?: boolean | null
          event_booking_allowed?: boolean
          event_edit_allowed?: boolean
          full_name: string
          gateway_charges_enabled?: boolean
          gender?: string | null
          id?: string
          instagram_id?: string | null
          international_booking_allowed?: boolean
          is_manual?: boolean
          is_verified?: boolean
          mobile: string
          occupation?: string | null
          pincode?: string | null
          registration_lat?: number | null
          registration_lng?: number | null
          registration_location_name?: string | null
          secret_code?: string | null
          secret_code_login_enabled?: boolean
          shop_access_allowed?: boolean
          state?: string | null
          updated_at?: string
          user_id: string
          verification_method?: string | null
          verification_notes?: string | null
          verification_status?: string
          verification_submitted_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          why_join?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          created_from_workshop?: boolean
          display_id?: string | null
          district?: string | null
          email?: string
          email_verified?: boolean | null
          event_booking_allowed?: boolean
          event_edit_allowed?: boolean
          full_name?: string
          gateway_charges_enabled?: boolean
          gender?: string | null
          id?: string
          instagram_id?: string | null
          international_booking_allowed?: boolean
          is_manual?: boolean
          is_verified?: boolean
          mobile?: string
          occupation?: string | null
          pincode?: string | null
          registration_lat?: number | null
          registration_lng?: number | null
          registration_location_name?: string | null
          secret_code?: string | null
          secret_code_login_enabled?: boolean
          shop_access_allowed?: boolean
          state?: string | null
          updated_at?: string
          user_id?: string
          verification_method?: string | null
          verification_notes?: string | null
          verification_status?: string
          verification_submitted_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          why_join?: string | null
        }
        Relationships: []
      }
      push_analytics: {
        Row: {
          batch_id: string | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          notification_id: string | null
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          notification_id?: string | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          notification_id?: string | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_name: string | null
          device_type: string | null
          endpoint: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_active_at: string | null
          os: string | null
          p256dh: string
          timezone: string | null
          user_id: string
          welcome_sent: boolean | null
        }
        Insert: {
          auth: string
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_name?: string | null
          device_type?: string | null
          endpoint: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active_at?: string | null
          os?: string | null
          p256dh: string
          timezone?: string | null
          user_id: string
          welcome_sent?: boolean | null
        }
        Update: {
          auth?: string
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_name?: string | null
          device_type?: string | null
          endpoint?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active_at?: string | null
          os?: string | null
          p256dh?: string
          timezone?: string | null
          user_id?: string
          welcome_sent?: boolean | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          reward_type: string
          reward_value: number
          times_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          reward_type?: string
          reward_value?: number
          times_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          reward_type?: string
          reward_value?: number
          times_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_uses: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          referral_code_id: string
          referred_user_id: string
          referrer_user_id: string
          reward_amount: number | null
          reward_given: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          referral_code_id: string
          referred_user_id: string
          referrer_user_id: string
          reward_amount?: number | null
          reward_given?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          referral_code_id?: string
          referred_user_id?: string
          referrer_user_id?: string
          reward_amount?: number | null
          reward_given?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "referral_uses_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      reset_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      reversal_access_logs: {
        Row: {
          created_at: string
          device: string | null
          id: string
          ip_address: string | null
          status: string
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: string
          ip_address?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: string
          ip_address?: string | null
          status?: string
        }
        Relationships: []
      }
      reversal_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          log_id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          log_id: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          log_id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reversal_actions_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "reversal_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      reversal_logs: {
        Row: {
          action_type: string
          created_at: string
          device_info: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          performed_by: string | null
          role: string | null
          source_panel: string
        }
        Insert: {
          action_type: string
          created_at?: string
          device_info?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          performed_by?: string | null
          role?: string | null
          source_panel?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          device_info?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          performed_by?: string | null
          role?: string | null
          source_panel?: string
        }
        Relationships: []
      }
      reversal_snapshots: {
        Row: {
          created_at: string
          full_snapshot: Json | null
          id: string
          log_id: string
          new_data: Json | null
          previous_data: Json | null
          version: number
        }
        Insert: {
          created_at?: string
          full_snapshot?: Json | null
          id?: string
          log_id: string
          new_data?: Json | null
          previous_data?: Json | null
          version?: number
        }
        Update: {
          created_at?: string
          full_snapshot?: Json | null
          id?: string
          log_id?: string
          new_data?: Json | null
          previous_data?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "reversal_snapshots_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "reversal_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          admin_replied_at: string | null
          admin_reply: string | null
          booking_id: string | null
          comment: string | null
          created_at: string
          id: string
          order_id: string | null
          rating: number
          review_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_replied_at?: string | null
          admin_reply?: string | null
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          rating: number
          review_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_replied_at?: string | null
          admin_reply?: string | null
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          rating?: number
          review_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "event_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_scripts: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          script_body: string
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          script_body: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          script_body?: string
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      scheduled_push_notifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          failed_count: number | null
          icon_url: string | null
          id: string
          image_url: string | null
          link: string | null
          message: string
          scheduled_at: string
          sent_at: string | null
          sent_count: number | null
          status: string
          target_type: string
          target_user_ids: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          icon_url?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          message: string
          scheduled_at: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          target_type?: string
          target_user_ids?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          icon_url?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          message?: string
          scheduled_at?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          target_type?: string
          target_user_ids?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      scroll_event_images: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          image_url: string
          sort_order: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          sort_order?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      seo_landing_pages: {
        Row: {
          body_content: string
          city: string | null
          created_at: string | null
          h1_title: string
          id: string
          intro_text: string
          is_active: boolean | null
          keywords: string[] | null
          meta_description: string
          page_title: string
          service: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          body_content?: string
          city?: string | null
          created_at?: string | null
          h1_title: string
          id?: string
          intro_text: string
          is_active?: boolean | null
          keywords?: string[] | null
          meta_description: string
          page_title: string
          service: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          body_content?: string
          city?: string | null
          created_at?: string | null
          h1_title?: string
          id?: string
          intro_text?: string
          is_active?: boolean | null
          keywords?: string[] | null
          meta_description?: string
          page_title?: string
          service?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      seo_page_settings: {
        Row: {
          id: string
          meta_description: string
          og_description: string | null
          og_image: string | null
          og_title: string | null
          page_title: string
          seo_keywords: string
          updated_at: string
        }
        Insert: {
          id: string
          meta_description?: string
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_title?: string
          seo_keywords?: string
          updated_at?: string
        }
        Update: {
          id?: string
          meta_description?: string
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_title?: string
          seo_keywords?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_cart_items: {
        Row: {
          caricature_image_url: string | null
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
          variation_id: string | null
        }
        Insert: {
          caricature_image_url?: string | null
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
          variation_id?: string | null
        }
        Update: {
          caricature_image_url?: string | null
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_cart_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "shop_product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      shop_coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount_amount: number | null
          min_order_amount: number
          updated_at: string
          usage_limit: number | null
          used_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      shop_order_items: {
        Row: {
          caricature_image_url: string | null
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          variation_id: string | null
        }
        Insert: {
          caricature_image_url?: string | null
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity?: number
          unit_price: number
          variation_id?: string | null
        }
        Update: {
          caricature_image_url?: string | null
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          unit_price?: number
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "shop_product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          admin_notes: string | null
          cancelled_at: string | null
          coupon_code: string | null
          created_at: string
          delivered_at: string | null
          discount_amount: number
          estimated_delivery: string | null
          id: string
          notes: string | null
          order_number: string
          payment_status: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          refund_amount: number | null
          refund_status: string | null
          shipped_at: string | null
          shipping_address: string
          shipping_city: string
          shipping_method: string | null
          shipping_mobile: string
          shipping_name: string
          shipping_pincode: string
          shipping_state: string
          status: string
          total_amount: number
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          cancelled_at?: string | null
          coupon_code?: string | null
          created_at?: string
          delivered_at?: string | null
          discount_amount?: number
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          shipped_at?: string | null
          shipping_address?: string
          shipping_city?: string
          shipping_method?: string | null
          shipping_mobile?: string
          shipping_name?: string
          shipping_pincode?: string
          shipping_state?: string
          status?: string
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          cancelled_at?: string | null
          coupon_code?: string | null
          created_at?: string
          delivered_at?: string | null
          discount_amount?: number
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          shipped_at?: string | null
          shipping_address?: string
          shipping_city?: string
          shipping_method?: string | null
          shipping_mobile?: string
          shipping_name?: string
          shipping_pincode?: string
          shipping_state?: string
          status?: string
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          helpful_count: number
          id: string
          is_approved: boolean
          is_verified_purchase: boolean
          product_id: string
          rating: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          helpful_count?: number
          id?: string
          is_approved?: boolean
          is_verified_purchase?: boolean
          product_id: string
          rating: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          helpful_count?: number
          id?: string
          is_approved?: boolean
          is_verified_purchase?: boolean
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_variations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          price_adjustment: number
          product_id: string
          stock_quantity: number
          variation_type: string
          variation_value: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          price_adjustment?: number
          product_id: string
          stock_quantity?: number
          variation_type?: string
          variation_value: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          price_adjustment?: number
          product_id?: string
          stock_quantity?: number
          variation_type?: string
          variation_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          avg_rating: number | null
          brand: string | null
          category_id: string | null
          created_at: string
          description: string
          dimensions: string | null
          discount_price: number | null
          id: string
          images: string[] | null
          is_active: boolean
          is_bestseller: boolean
          is_featured: boolean
          is_pod: boolean
          name: string
          price: number
          review_count: number
          seo_description: string | null
          seo_title: string | null
          sku: string | null
          slug: string
          specifications: Json | null
          stock_quantity: number
          tags: string[] | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          avg_rating?: number | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          dimensions?: string | null
          discount_price?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_bestseller?: boolean
          is_featured?: boolean
          is_pod?: boolean
          name: string
          price?: number
          review_count?: number
          seo_description?: string | null
          seo_title?: string | null
          sku?: string | null
          slug: string
          specifications?: Json | null
          stock_quantity?: number
          tags?: string[] | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          avg_rating?: number | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          dimensions?: string | null
          discount_price?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_bestseller?: boolean
          is_featured?: boolean
          is_pod?: boolean
          name?: string
          price?: number
          review_count?: number
          seo_description?: string | null
          seo_title?: string | null
          sku?: string | null
          slug?: string
          specifications?: Json | null
          stock_quantity?: number
          tags?: string[] | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          id: string
          updated_at: string
          value: Json
        }
        Insert: {
          id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      shop_wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      social_links: {
        Row: {
          created_at: string
          icon_svg: string | null
          id: string
          is_active: boolean
          platform: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          icon_svg?: string | null
          id?: string
          is_active?: boolean
          platform: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          icon_svg?: string | null
          id?: string
          is_active?: boolean
          platform?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          admin_reply: string | null
          created_at: string
          email: string
          id: string
          message: string
          mobile: string | null
          name: string
          replied_at: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          mobile?: string | null
          name: string
          replied_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          mobile?: string | null
          name?: string
          replied_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string | null
          department: string | null
          email: string
          id: string
          is_active: boolean | null
          joined_at: string | null
          mobile: string | null
          name: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          mobile?: string | null
          name: string
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          mobile?: string | null
          name?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      team_performance: {
        Row: {
          created_at: string | null
          id: string
          metric_type: string
          metric_value: number | null
          period_end: string
          period_start: string
          team_member_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_type: string
          metric_value?: number | null
          period_end: string
          period_start: string
          team_member_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_type?: string
          metric_value?: number | null
          period_end?: string
          period_start?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_performance_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_to: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_brands: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_visible: boolean | null
          logo_url: string
          name: string
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          logo_url: string
          name: string
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          logo_url?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      ui_settings: {
        Row: {
          category: string
          id: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          id: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_feature_flags: {
        Row: {
          created_at: string | null
          enabled_by: string | null
          feature_key: string
          id: string
          is_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled_by?: string | null
          feature_key: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled_by?: string | null
          feature_key?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_live_locations: {
        Row: {
          city: string | null
          id: string
          is_online: boolean
          last_seen_at: string
          latitude: number
          location_name: string | null
          longitude: number
          user_id: string
        }
        Insert: {
          city?: string | null
          id?: string
          is_online?: boolean
          last_seen_at?: string
          latitude: number
          location_name?: string | null
          longitude: number
          user_id: string
        }
        Update: {
          city?: string | null
          id?: string
          is_online?: boolean
          last_seen_at?: string
          latitude?: number
          location_name?: string | null
          longitude?: number
          user_id?: string
        }
        Relationships: []
      }
      user_partial_advance_config: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          partial_1_amount: number
          partial_2_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          partial_1_amount?: number
          partial_2_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          partial_1_amount?: number
          partial_2_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workshop_admin_log: {
        Row: {
          action: string
          admin_id: string
          admin_name: string
          created_at: string
          details: string | null
          id: string
        }
        Insert: {
          action: string
          admin_id: string
          admin_name?: string
          created_at?: string
          details?: string | null
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string
          admin_name?: string
          created_at?: string
          details?: string | null
          id?: string
        }
        Relationships: []
      }
      workshop_admins: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      workshop_assignments: {
        Row: {
          admin_notes: string | null
          created_at: string
          file_name: string | null
          graded_at: string | null
          graded_by_artist: string | null
          id: string
          marks: number | null
          pass_status: string | null
          status: string
          storage_path: string | null
          submitted_at: string | null
          total_marks: number | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          file_name?: string | null
          graded_at?: string | null
          graded_by_artist?: string | null
          id?: string
          marks?: number | null
          pass_status?: string | null
          status?: string
          storage_path?: string | null
          submitted_at?: string | null
          total_marks?: number | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          file_name?: string | null
          graded_at?: string | null
          graded_by_artist?: string | null
          id?: string
          marks?: number | null
          pass_status?: string | null
          status?: string
          storage_path?: string | null
          submitted_at?: string | null
          total_marks?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "workshop_users"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_attendance: {
        Row: {
          created_at: string
          id: string
          marked_by: string | null
          session_date: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marked_by?: string | null
          session_date: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marked_by?: string | null
          session_date?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      workshop_certificates: {
        Row: {
          file_name: string
          id: string
          storage_path: string
          uploaded_at: string
          user_id: string
          visible: boolean
        }
        Insert: {
          file_name: string
          id?: string
          storage_path: string
          uploaded_at?: string
          user_id: string
          visible?: boolean
        }
        Update: {
          file_name?: string
          id?: string
          storage_path?: string
          uploaded_at?: string
          user_id?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "workshop_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "workshop_users"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_countdown_prompts: {
        Row: {
          created_at: string
          details: string | null
          id: string
          is_active: boolean
          seconds: number
          session_date: string
          slot: string
          started_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          is_active?: boolean
          seconds?: number
          session_date: string
          slot?: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          is_active?: boolean
          seconds?: number
          session_date?: string
          slot?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workshop_feedback: {
        Row: {
          admin_reply: string | null
          admin_reply_to_user_reply: string | null
          admin_reply_to_user_reply_at: string | null
          created_at: string
          google_review_clicked: boolean
          id: string
          message: string
          rating: number | null
          user_id: string
          user_reply: string | null
          user_reply_at: string | null
        }
        Insert: {
          admin_reply?: string | null
          admin_reply_to_user_reply?: string | null
          admin_reply_to_user_reply_at?: string | null
          created_at?: string
          google_review_clicked?: boolean
          id?: string
          message: string
          rating?: number | null
          user_id: string
          user_reply?: string | null
          user_reply_at?: string | null
        }
        Update: {
          admin_reply?: string | null
          admin_reply_to_user_reply?: string | null
          admin_reply_to_user_reply_at?: string | null
          created_at?: string
          google_review_clicked?: boolean
          id?: string
          message?: string
          rating?: number | null
          user_id?: string
          user_reply?: string | null
          user_reply_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "workshop_users"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_live_session_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workshop_live_sessions: {
        Row: {
          artist_name: string | null
          artist_portfolio_link: string | null
          created_at: string
          id: string
          link_enabled: boolean
          link_expiry: string | null
          meet_link: string | null
          requirements: string | null
          session_date: string
          slot: string
          status: string
          title: string
          updated_at: string
          what_students_learn: string | null
          workshop_id: string | null
        }
        Insert: {
          artist_name?: string | null
          artist_portfolio_link?: string | null
          created_at?: string
          id?: string
          link_enabled?: boolean
          link_expiry?: string | null
          meet_link?: string | null
          requirements?: string | null
          session_date: string
          slot?: string
          status?: string
          title: string
          updated_at?: string
          what_students_learn?: string | null
          workshop_id?: string | null
        }
        Update: {
          artist_name?: string | null
          artist_portfolio_link?: string | null
          created_at?: string
          id?: string
          link_enabled?: boolean
          link_expiry?: string | null
          meet_link?: string | null
          requirements?: string | null
          session_date?: string
          slot?: string
          status?: string
          title?: string
          updated_at?: string
          what_students_learn?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_live_sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      workshop_online_attendance_prompts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          session_date: string
          slot: string
          target_user_id: string | null
          timing: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          session_date: string
          slot?: string
          target_user_id?: string | null
          timing?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          session_date?: string
          slot?: string
          target_user_id?: string | null
          timing?: string
          updated_at?: string
        }
        Relationships: []
      }
      workshop_settings: {
        Row: {
          id: string
          updated_at: string
          value: Json
        }
        Insert: {
          id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      workshop_user_locations: {
        Row: {
          created_at: string
          id: string
          last_updated: string
          lat: number
          lng: number
          location_allowed: boolean
          location_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated?: string
          lat: number
          lng: number
          location_allowed?: boolean
          location_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_updated?: string
          lat?: number
          lng?: number
          location_allowed?: boolean
          location_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workshop_user_video_access: {
        Row: {
          access_enabled: boolean
          created_at: string
          custom_expiry: string | null
          download_allowed: boolean
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          access_enabled?: boolean
          created_at?: string
          custom_expiry?: string | null
          download_allowed?: boolean
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          access_enabled?: boolean
          created_at?: string
          custom_expiry?: string | null
          download_allowed?: boolean
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_user_video_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "workshop_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_user_video_access_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "workshop_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_users: {
        Row: {
          age: number | null
          artist_background: string | null
          artist_background_type: string | null
          auth_user_id: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          district: string | null
          email: string
          gender: string | null
          id: string
          instagram_id: string | null
          is_enabled: boolean
          is_verified: boolean
          mobile: string
          name: string
          occupation: string | null
          password: string | null
          payment_amount: number | null
          payment_screenshot_path: string | null
          payment_status: string | null
          prefers_recorded: boolean
          prefers_recorded_at: string | null
          prefers_recorded_note: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          roll_number: number | null
          secret_code: string | null
          skill_level: string | null
          slot: string
          state: string | null
          student_type: string
          sync_enabled: boolean
          terms_accepted: boolean | null
          updated_at: string
          verification_notes: string | null
          verification_status: string
          verification_submitted_at: string | null
          verified_at: string | null
          verified_by: string | null
          video_access_enabled: boolean
          video_download_allowed: boolean
          why_join: string | null
          workshop_date: string
          workshop_id: string | null
        }
        Insert: {
          age?: number | null
          artist_background?: string | null
          artist_background_type?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          email: string
          gender?: string | null
          id?: string
          instagram_id?: string | null
          is_enabled?: boolean
          is_verified?: boolean
          mobile: string
          name: string
          occupation?: string | null
          password?: string | null
          payment_amount?: number | null
          payment_screenshot_path?: string | null
          payment_status?: string | null
          prefers_recorded?: boolean
          prefers_recorded_at?: string | null
          prefers_recorded_note?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          roll_number?: number | null
          secret_code?: string | null
          skill_level?: string | null
          slot: string
          state?: string | null
          student_type?: string
          sync_enabled?: boolean
          terms_accepted?: boolean | null
          updated_at?: string
          verification_notes?: string | null
          verification_status?: string
          verification_submitted_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          video_access_enabled?: boolean
          video_download_allowed?: boolean
          why_join?: string | null
          workshop_date: string
          workshop_id?: string | null
        }
        Update: {
          age?: number | null
          artist_background?: string | null
          artist_background_type?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          email?: string
          gender?: string | null
          id?: string
          instagram_id?: string | null
          is_enabled?: boolean
          is_verified?: boolean
          mobile?: string
          name?: string
          occupation?: string | null
          password?: string | null
          payment_amount?: number | null
          payment_screenshot_path?: string | null
          payment_status?: string | null
          prefers_recorded?: boolean
          prefers_recorded_at?: string | null
          prefers_recorded_note?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          roll_number?: number | null
          secret_code?: string | null
          skill_level?: string | null
          slot?: string
          state?: string | null
          student_type?: string
          sync_enabled?: boolean
          terms_accepted?: boolean | null
          updated_at?: string
          verification_notes?: string | null
          verification_status?: string
          verification_submitted_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          video_access_enabled?: boolean
          video_download_allowed?: boolean
          why_join?: string | null
          workshop_date?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_users_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_verification_history: {
        Row: {
          action: string
          created_at: string
          id: string
          new_status: string | null
          notes: string | null
          performed_by: string | null
          performed_by_user_id: string | null
          previous_status: string | null
          workshop_user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_status?: string | null
          notes?: string | null
          performed_by?: string | null
          performed_by_user_id?: string | null
          previous_status?: string | null
          workshop_user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_status?: string | null
          notes?: string | null
          performed_by?: string | null
          performed_by_user_id?: string | null
          previous_status?: string | null
          workshop_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_verification_history_workshop_user_id_fkey"
            columns: ["workshop_user_id"]
            isOneToOne: false
            referencedRelation: "workshop_users"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_videos: {
        Row: {
          created_at: string
          expiry_date: string | null
          global_download_allowed: boolean
          id: string
          slot: string | null
          target_type: string
          title: string
          updated_at: string
          video_type: string
          video_url: string | null
          workshop_date: string
          workshop_id: string | null
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          global_download_allowed?: boolean
          id?: string
          slot?: string | null
          target_type?: string
          title: string
          updated_at?: string
          video_type?: string
          video_url?: string | null
          workshop_date: string
          workshop_id?: string | null
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          global_download_allowed?: boolean
          id?: string
          slot?: string | null
          target_type?: string
          title?: string
          updated_at?: string
          video_type?: string
          video_url?: string | null
          workshop_date?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_videos_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          brochure_image_url: string | null
          brochure_pdf_url: string | null
          contact_whatsapp: string | null
          created_at: string
          dates: string | null
          description: string | null
          duration: string | null
          faq: Json | null
          highlights: string[] | null
          id: string
          instructor_bio: string | null
          instructor_name: string | null
          instructor_stats: Json | null
          instructor_title: string | null
          is_active: boolean
          max_participants: number | null
          preview_video_url: string | null
          price: string | null
          registration_enabled: boolean | null
          requirements: string | null
          skill_level: string | null
          status: string
          title: string
          updated_at: string
          what_you_learn: string[] | null
          who_is_for: string[] | null
          workshop_language: string | null
          workshop_mode: string | null
        }
        Insert: {
          brochure_image_url?: string | null
          brochure_pdf_url?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          dates?: string | null
          description?: string | null
          duration?: string | null
          faq?: Json | null
          highlights?: string[] | null
          id?: string
          instructor_bio?: string | null
          instructor_name?: string | null
          instructor_stats?: Json | null
          instructor_title?: string | null
          is_active?: boolean
          max_participants?: number | null
          preview_video_url?: string | null
          price?: string | null
          registration_enabled?: boolean | null
          requirements?: string | null
          skill_level?: string | null
          status?: string
          title: string
          updated_at?: string
          what_you_learn?: string[] | null
          who_is_for?: string[] | null
          workshop_language?: string | null
          workshop_mode?: string | null
        }
        Update: {
          brochure_image_url?: string | null
          brochure_pdf_url?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          dates?: string | null
          description?: string | null
          duration?: string | null
          faq?: Json | null
          highlights?: string[] | null
          id?: string
          instructor_bio?: string | null
          instructor_name?: string | null
          instructor_stats?: Json | null
          instructor_title?: string | null
          is_active?: boolean
          max_participants?: number | null
          preview_video_url?: string | null
          price?: string | null
          registration_enabled?: boolean | null
          requirements?: string | null
          skill_level?: string | null
          status?: string
          title?: string
          updated_at?: string
          what_you_learn?: string[] | null
          who_is_for?: string[] | null
          workshop_language?: string | null
          workshop_mode?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      artist_assigned_to_event: {
        Args: { _auth_user_id: string; _event_id: string }
        Returns: boolean
      }
      auto_complete_past_events: { Args: never; Returns: number }
      detect_login_role: {
        Args: { p_identifier: string; p_identifier_type: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      track_order: {
        Args: { customer_verify: string; order_id_input: string }
        Returns: {
          amount: number
          created_at: string
          expected_delivery_date: string
          face_count: number
          id: string
          order_type: string
          payment_status: string
          status: string
          style: string
          updated_at: string
        }[]
      }
      user_has_event_with_artist: {
        Args: { _artist_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_event_booking: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      workshop_login: {
        Args: {
          p_credential: string
          p_credential_type: string
          p_identifier: string
          p_identifier_type: string
        }
        Returns: {
          age: number
          artist_background: string
          artist_background_type: string
          city: string
          country: string
          district: string
          email: string
          gender: string
          id: string
          instagram_id: string
          is_enabled: boolean
          mobile: string
          name: string
          occupation: string
          payment_status: string
          prefers_recorded: boolean
          roll_number: number
          secret_code: string
          skill_level: string
          slot: string
          state: string
          student_type: string
          terms_accepted: boolean
          video_access_enabled: boolean
          video_download_allowed: boolean
          why_join: string
          workshop_date: string
          workshop_id: string
        }[]
      }
      workshop_user_exists: {
        Args: { p_email: string; p_mobile: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "artist" | "shop_admin"
      caricature_style:
        | "cute"
        | "romantic"
        | "fun"
        | "royal"
        | "minimal"
        | "artists_choice"
      caricature_type: "digital" | "physical"
      order_status:
        | "new"
        | "in_progress"
        | "artwork_ready"
        | "dispatched"
        | "delivered"
        | "completed"
      order_type: "single" | "couple" | "group"
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
      app_role: ["admin", "moderator", "artist", "shop_admin"],
      caricature_style: [
        "cute",
        "romantic",
        "fun",
        "royal",
        "minimal",
        "artists_choice",
      ],
      caricature_type: ["digital", "physical"],
      order_status: [
        "new",
        "in_progress",
        "artwork_ready",
        "dispatched",
        "delivered",
        "completed",
      ],
      order_type: ["single", "couple", "group"],
    },
  },
} as const
