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
      admin_sessions: {
        Row: {
          admin_name: string
          device_info: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          last_active_at: string
          location_info: string | null
          login_at: string
          user_id: string
        }
        Insert: {
          admin_name?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_active_at?: string
          location_info?: string | null
          login_at?: string
          user_id: string
        }
        Update: {
          admin_name?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_active_at?: string
          location_info?: string | null
          login_at?: string
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
          caricature_type: string | null
          city: string | null
          country: string | null
          created_at: string
          district: string | null
          enquiry_number: string
          enquiry_type: string
          estimated_price: number | null
          event_date: string | null
          id: string
          instagram_id: string | null
          mobile: string
          name: string
          pricing_source: string | null
          state: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          caricature_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          enquiry_number: string
          enquiry_type?: string
          estimated_price?: number | null
          event_date?: string | null
          id?: string
          instagram_id?: string | null
          mobile: string
          name: string
          pricing_source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          caricature_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          enquiry_number?: string
          enquiry_type?: string
          estimated_price?: number | null
          event_date?: string | null
          id?: string
          instagram_id?: string | null
          mobile?: string
          name?: string
          pricing_source?: string | null
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
          artist_name: string | null
          ask_user_delivered: boolean | null
          assigned_artist_id: string | null
          caricature_type: Database["public"]["Enums"]["caricature_type"]
          city: string | null
          country: string | null
          created_at: string
          customer_email: string
          customer_mobile: string
          customer_name: string
          delivery_address: string | null
          delivery_city: string | null
          delivery_pincode: string | null
          delivery_state: string | null
          district: string | null
          expected_delivery_date: string | null
          face_count: number
          id: string
          instagram_id: string | null
          is_framed: boolean | null
          negotiated_amount: number | null
          notes: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          payment_status: string | null
          payment_verified: boolean | null
          priority: number | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          state: string | null
          status: Database["public"]["Enums"]["order_status"]
          style: Database["public"]["Enums"]["caricature_style"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          art_confirmation_status?: string | null
          artist_name?: string | null
          ask_user_delivered?: boolean | null
          assigned_artist_id?: string | null
          caricature_type: Database["public"]["Enums"]["caricature_type"]
          city?: string | null
          country?: string | null
          created_at?: string
          customer_email: string
          customer_mobile: string
          customer_name: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_pincode?: string | null
          delivery_state?: string | null
          district?: string | null
          expected_delivery_date?: string | null
          face_count?: number
          id?: string
          instagram_id?: string | null
          is_framed?: boolean | null
          negotiated_amount?: number | null
          notes?: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          payment_status?: string | null
          payment_verified?: boolean | null
          priority?: number | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          style?: Database["public"]["Enums"]["caricature_style"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          art_confirmation_status?: string | null
          artist_name?: string | null
          ask_user_delivered?: boolean | null
          assigned_artist_id?: string | null
          caricature_type?: Database["public"]["Enums"]["caricature_type"]
          city?: string | null
          country?: string | null
          created_at?: string
          customer_email?: string
          customer_mobile?: string
          customer_name?: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_pincode?: string | null
          delivery_state?: string | null
          district?: string | null
          expected_delivery_date?: string | null
          face_count?: number
          id?: string
          instagram_id?: string | null
          is_framed?: boolean | null
          negotiated_amount?: number | null
          notes?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_status?: string | null
          payment_verified?: boolean | null
          priority?: number | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          style?: Database["public"]["Enums"]["caricature_style"]
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
      profiles: {
        Row: {
          address: string | null
          age: number | null
          city: string | null
          created_at: string
          display_id: string | null
          email: string
          event_booking_allowed: boolean
          full_name: string
          gateway_charges_enabled: boolean
          gender: string | null
          id: string
          instagram_id: string | null
          international_booking_allowed: boolean
          is_manual: boolean
          mobile: string
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
        }
        Insert: {
          address?: string | null
          age?: number | null
          city?: string | null
          created_at?: string
          display_id?: string | null
          email: string
          event_booking_allowed?: boolean
          full_name: string
          gateway_charges_enabled?: boolean
          gender?: string | null
          id?: string
          instagram_id?: string | null
          international_booking_allowed?: boolean
          is_manual?: boolean
          mobile: string
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
        }
        Update: {
          address?: string | null
          age?: number | null
          city?: string | null
          created_at?: string
          display_id?: string | null
          email?: string
          event_booking_allowed?: boolean
          full_name?: string
          gateway_charges_enabled?: boolean
          gender?: string | null
          id?: string
          instagram_id?: string | null
          international_booking_allowed?: boolean
          is_manual?: boolean
          mobile?: string
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
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
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
      workshop_feedback: {
        Row: {
          admin_reply: string | null
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
          created_at: string
          email: string
          gender: string | null
          id: string
          instagram_id: string | null
          is_enabled: boolean
          mobile: string
          name: string
          occupation: string | null
          payment_screenshot_path: string | null
          roll_number: number | null
          slot: string
          student_type: string
          updated_at: string
          video_access_enabled: boolean
          video_download_allowed: boolean
          why_join: string | null
          workshop_date: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          email: string
          gender?: string | null
          id?: string
          instagram_id?: string | null
          is_enabled?: boolean
          mobile: string
          name: string
          occupation?: string | null
          payment_screenshot_path?: string | null
          roll_number?: number | null
          slot: string
          student_type?: string
          updated_at?: string
          video_access_enabled?: boolean
          video_download_allowed?: boolean
          why_join?: string | null
          workshop_date: string
        }
        Update: {
          age?: number | null
          created_at?: string
          email?: string
          gender?: string | null
          id?: string
          instagram_id?: string | null
          is_enabled?: boolean
          mobile?: string
          name?: string
          occupation?: string | null
          payment_screenshot_path?: string | null
          roll_number?: number | null
          slot?: string
          student_type?: string
          updated_at?: string
          video_access_enabled?: boolean
          video_download_allowed?: boolean
          why_join?: string | null
          workshop_date?: string
        }
        Relationships: []
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
