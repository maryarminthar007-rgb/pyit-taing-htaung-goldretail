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
      goldsmith_portfolio: {
        Row: {
          caption: string | null
          created_at: string
          goldsmith_id: string
          id: string
          photo_url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          goldsmith_id: string
          id?: string
          photo_url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          goldsmith_id?: string
          id?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "goldsmith_portfolio_goldsmith_id_fkey"
            columns: ["goldsmith_id"]
            isOneToOne: false
            referencedRelation: "goldsmiths"
            referencedColumns: ["id"]
          },
        ]
      }
      goldsmith_specialties: {
        Row: {
          created_at: string
          goldsmith_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          goldsmith_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          goldsmith_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goldsmith_specialties_goldsmith_id_fkey"
            columns: ["goldsmith_id"]
            isOneToOne: false
            referencedRelation: "goldsmiths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goldsmith_specialties_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      goldsmiths: {
        Row: {
          address: string | null
          apprentice_phone: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          symbol: string | null
          work_status: string
        }
        Insert: {
          address?: string | null
          apprentice_phone?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          photo_url?: string | null
          symbol?: string | null
          work_status?: string
        }
        Update: {
          address?: string | null
          apprentice_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          symbol?: string | null
          work_status?: string
        }
        Relationships: []
      }
      marketing_orders: {
        Row: {
          assigned_goldsmith_id: string | null
          assigned_order_id: string | null
          created_at: string
          created_by: string | null
          id: string
          order_date: string
          product_id: string | null
          product_name: string
          product_photo_url: string | null
          qty: number
          specs: string | null
          status: string
          team_id: string | null
          team_name: string
          updated_at: string
        }
        Insert: {
          assigned_goldsmith_id?: string | null
          assigned_order_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          order_date?: string
          product_id?: string | null
          product_name: string
          product_photo_url?: string | null
          qty: number
          specs?: string | null
          status?: string
          team_id?: string | null
          team_name: string
          updated_at?: string
        }
        Update: {
          assigned_goldsmith_id?: string | null
          assigned_order_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          order_date?: string
          product_id?: string | null
          product_name?: string
          product_photo_url?: string | null
          qty?: number
          specs?: string | null
          status?: string
          team_id?: string | null
          team_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_orders_assigned_goldsmith_id_fkey"
            columns: ["assigned_goldsmith_id"]
            isOneToOne: false
            referencedRelation: "goldsmiths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_orders_assigned_order_id_fkey"
            columns: ["assigned_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_orders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "marketing_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_teams: {
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
          return_date: string | null
          return_due_date: string | null
          returned_item_name: string | null
          returned_qty: number | null
          returned_weight: number | null
          sort_index: number
          specs: string | null
          total_due_gold: number | null
          total_excess_gold: number | null
          wastage: number | null
          wastage_per_piece: number | null
          water_loss: number | null
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
          return_date?: string | null
          return_due_date?: string | null
          returned_item_name?: string | null
          returned_qty?: number | null
          returned_weight?: number | null
          sort_index?: number
          specs?: string | null
          total_due_gold?: number | null
          total_excess_gold?: number | null
          wastage?: number | null
          wastage_per_piece?: number | null
          water_loss?: number | null
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
          return_date?: string | null
          return_due_date?: string | null
          returned_item_name?: string | null
          returned_qty?: number | null
          returned_weight?: number | null
          sort_index?: number
          specs?: string | null
          total_due_gold?: number | null
          total_excess_gold?: number | null
          wastage?: number | null
          wastage_per_piece?: number | null
          water_loss?: number | null
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
          category: string | null
          created_at: string
          id: string
          name: string
          photo_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
        }
        Update: {
          category?: string | null
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
      is_ultimate_super_admin: { Args: { _user_id: string }; Returns: boolean }
      recompute_goldsmith_status: {
        Args: { _goldsmith_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "super_admin" | "limited_admin" | "viewer" | "marketing"
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
      app_role: ["super_admin", "limited_admin", "viewer", "marketing"],
      gemstone_weight_unit: ["carat", "rati", "gram"],
    },
  },
} as const
