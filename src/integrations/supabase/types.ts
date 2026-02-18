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
      artist_blocked_dates: {
        Row: {
          blocked_date: string
          blocked_end_time: string | null
          blocked_start_time: string | null
          city: string | null
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          blocked_end_time?: string | null
          blocked_start_time?: string | null
          city?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          blocked_end_time?: string | null
          blocked_start_time?: string | null
          city?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
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
          created_at: string
          event_date: string
          event_end_time: string
          event_start_time: string
          event_type: string
          extra_hours: number
          full_address: string
          id: string
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
          created_at?: string
          event_date: string
          event_end_time: string
          event_start_time: string
          event_type: string
          extra_hours?: number
          full_address: string
          id?: string
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
          created_at?: string
          event_date?: string
          event_end_time?: string
          event_start_time?: string
          event_type?: string
          extra_hours?: number
          full_address?: string
          id?: string
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
          artist_name: string | null
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
          artist_name?: string | null
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
          artist_name?: string | null
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
        Relationships: []
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
          city: string | null
          created_at: string
          email: string
          event_booking_allowed: boolean
          full_name: string
          id: string
          instagram_id: string | null
          is_manual: boolean
          mobile: string
          pincode: string | null
          registration_lat: number | null
          registration_lng: number | null
          registration_location_name: string | null
          secret_code: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email: string
          event_booking_allowed?: boolean
          full_name: string
          id?: string
          instagram_id?: string | null
          is_manual?: boolean
          mobile: string
          pincode?: string | null
          registration_lat?: number | null
          registration_lng?: number | null
          registration_location_name?: string | null
          secret_code?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string
          event_booking_allowed?: boolean
          full_name?: string
          id?: string
          instagram_id?: string | null
          is_manual?: boolean
          mobile?: string
          pincode?: string | null
          registration_lat?: number | null
          registration_lng?: number | null
          registration_location_name?: string | null
          secret_code?: string | null
          state?: string | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      track_order: {
        Args: { order_id_input: string }
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
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "artist"
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
      app_role: ["admin", "moderator", "artist"],
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
