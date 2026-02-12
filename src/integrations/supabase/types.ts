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
      profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          instagram_id: string | null
          mobile: string
          pincode: string | null
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
          full_name: string
          id?: string
          instagram_id?: string | null
          mobile: string
          pincode?: string | null
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
          full_name?: string
          id?: string
          instagram_id?: string | null
          mobile?: string
          pincode?: string | null
          secret_code?: string | null
          state?: string | null
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
    }
    Enums: {
      app_role: "admin" | "moderator"
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
      app_role: ["admin", "moderator"],
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
