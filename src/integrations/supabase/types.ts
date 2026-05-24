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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      books: {
        Row: {
          created_at: string
          goldsmith_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          goldsmith_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          goldsmith_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_goldsmith_id_fkey"
            columns: ["goldsmith_id"]
            isOneToOne: false
            referencedRelation: "goldsmiths"
            referencedColumns: ["id"]
          },
        ]
      }
      gemstones: {
        Row: {
          created_at: string
          entry_date: string
          gemstone_name: string
          gemstone_type: string | null
          id: string
          job_reference: string | null
          notes: string | null
          order_id: string | null
          quantity: number
          setting_fee: number
          supplier: string | null
          total_cost: number | null
          unit_cost: number
          weight: number
          weight_unit: Database["public"]["Enums"]["gemstone_weight_unit"]
        }
        Insert: {
          created_at?: string
          entry_date?: string
          gemstone_name: string
          gemstone_type?: string | null
          id?: string
          job_reference?: string | null
          notes?: string | null
          order_id?: string | null
          quantity?: number
          setting_fee?: number
          supplier?: string | null
          total_cost?: number | null
          unit_cost?: number
          weight?: number
          weight_unit?: Database["public"]["Enums"]["gemstone_weight_unit"]
        }
        Update: {
          created_at?: string
          entry_date?: string
          gemstone_name?: string
          gemstone_type?: string | null
          id?: string
          job_reference?: string | null
          notes?: string | null
          order_id?: string | null
          quantity?: number
          setting_fee?: number
          supplier?: string | null
          total_cost?: number | null
          unit_cost?: number
          weight?: number
          weight_unit?: Database["public"]["Enums"]["gemstone_weight_unit"]
        }
        Relationships: [
          {
            foreignKeyName: "gemstones_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      goldsmiths: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          work_status: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          photo_url?: string | null
          work_status?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          work_status?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          book_id: string
          created_at: string
          due_gold: number | null
          excess_gold: number | null
          fire_loss: number | null
          gold_quality: string | null
          id: string
          issue_date: string | null
          issued_item_name: string | null
          issued_weight: number | null
          ordered_qty: number | null
          return_due_date: string | null
          returned_item_name: string | null
          returned_qty: number | null
          returned_weight: number | null
          sort_index: number
          specs: string | null
          total_due_gold: number | null
          total_excess_gold: number | null
          wastage: number | null
        }
        Insert: {
          book_id: string
          created_at?: string
          due_gold?: number | null
          excess_gold?: number | null
          fire_loss?: number | null
          gold_quality?: string | null
          id?: string
          issue_date?: string | null
          issued_item_name?: string | null
          issued_weight?: number | null
          ordered_qty?: number | null
          return_due_date?: string | null
          returned_item_name?: string | null
          returned_qty?: number | null
          returned_weight?: number | null
          sort_index?: number
          specs?: string | null
          total_due_gold?: number | null
          total_excess_gold?: number | null
          wastage?: number | null
        }
        Update: {
          book_id?: string
          created_at?: string
          due_gold?: number | null
          excess_gold?: number | null
          fire_loss?: number | null
          gold_quality?: string | null
          id?: string
          issue_date?: string | null
          issued_item_name?: string | null
          issued_weight?: number | null
          ordered_qty?: number | null
          return_due_date?: string | null
          returned_item_name?: string | null
          returned_qty?: number | null
          returned_weight?: number | null
          sort_index?: number
          specs?: string | null
          total_due_gold?: number | null
          total_excess_gold?: number | null
          wastage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          id: string
          name: string
          photo_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "limited_admin" | "viewer"
      gemstone_weight_unit: "carat" | "rati" | "gram"
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
      app_role: ["super_admin", "limited_admin", "viewer"],
      gemstone_weight_unit: ["carat", "rati", "gram"],
    },
  },
} as const
