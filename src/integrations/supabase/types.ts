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
      activities: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          family_id: string
          frequency_hint: string | null
          id: string
          name: string
          reward_amount_cents: number
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          family_id: string
          frequency_hint?: string | null
          id?: string
          name: string
          reward_amount_cents?: number
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          family_id?: string
          frequency_hint?: string | null
          id?: string
          name?: string
          reward_amount_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "activities_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      child_sessions: {
        Row: {
          child_id: string
          created_at: string
          expires_at: string
          family_id: string
          id: string
          last_used_at: string
          token_hash: string
        }
        Insert: {
          child_id: string
          created_at?: string
          expires_at?: string
          family_id: string
          id?: string
          last_used_at?: string
          token_hash: string
        }
        Update: {
          child_id?: string
          created_at?: string
          expires_at?: string
          family_id?: string
          id?: string
          last_used_at?: string
          token_hash?: string
        }
        Relationships: []
      }
      children: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          family_id: string
          id: string
          name: string
          password_hash: string | null
          password_set_at: string | null
          username: string | null
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          family_id: string
          id?: string
          name: string
          password_hash?: string | null
          password_set_at?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          family_id?: string
          id?: string
          name?: string
          password_hash?: string | null
          password_set_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          primary_parent_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          primary_parent_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          primary_parent_id?: string | null
          status?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          contact: string
          created_at: string
          created_by: string
          expires_at: string
          family_id: string
          id: string
          parent_name: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          contact: string
          created_at?: string
          created_by: string
          expires_at?: string
          family_id: string
          id?: string
          parent_name: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          contact?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          family_id?: string
          id?: string
          parent_name?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_awards: {
        Row: {
          awarded_at: string
          bonus_amount_cents: number
          child_id: string
          family_id: string
          id: string
          mission_id: string
        }
        Insert: {
          awarded_at?: string
          bonus_amount_cents?: number
          child_id: string
          family_id: string
          id?: string
          mission_id: string
        }
        Update: {
          awarded_at?: string
          bonus_amount_cents?: number
          child_id?: string
          family_id?: string
          id?: string
          mission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_awards_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_awards_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_awards_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_participants: {
        Row: {
          child_id: string
          family_id: string
          mission_id: string
        }
        Insert: {
          child_id: string
          family_id: string
          mission_id: string
        }
        Update: {
          child_id?: string
          family_id?: string
          mission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_participants_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_participants_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_participants_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          active: boolean
          activity_id: string
          bonus_amount_cents: number
          created_at: string
          description: string | null
          family_id: string
          goal_target: number
          goal_type: Database["public"]["Enums"]["mission_goal_type"]
          id: string
          medal_url: string | null
          name: string
        }
        Insert: {
          active?: boolean
          activity_id: string
          bonus_amount_cents?: number
          created_at?: string
          description?: string | null
          family_id: string
          goal_target: number
          goal_type: Database["public"]["Enums"]["mission_goal_type"]
          id?: string
          medal_url?: string | null
          name: string
        }
        Update: {
          active?: boolean
          activity_id?: string
          bonus_amount_cents?: number
          created_at?: string
          description?: string | null
          family_id?: string
          goal_target?: number
          goal_type?: Database["public"]["Enums"]["mission_goal_type"]
          id?: string
          medal_url?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          child_id: string
          created_at: string
          created_by: string
          family_id: string
          id: string
          note: string | null
          paid_at: string
        }
        Insert: {
          amount_cents: number
          child_id: string
          created_at?: string
          created_by: string
          family_id: string
          id?: string
          note?: string | null
          paid_at?: string
        }
        Update: {
          amount_cents?: number
          child_id?: string
          created_at?: string
          created_by?: string
          family_id?: string
          id?: string
          note?: string | null
          paid_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          family_id: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          family_id?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          family_id?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          activity_id: string
          child_id: string
          completed_at: string
          created_at: string
          family_id: string
          id: string
          photo_url: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reward_amount_cents: number
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string
        }
        Insert: {
          activity_id: string
          child_id: string
          completed_at?: string
          created_at?: string
          family_id: string
          id?: string
          photo_url?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_amount_cents?: number
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
        }
        Update: {
          activity_id?: string
          child_id?: string
          completed_at?: string
          created_at?: string
          family_id?: string
          id?: string
          photo_url?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_amount_cents?: number
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
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
      accept_invitation: { Args: { _token: string }; Returns: Json }
      compute_streak: {
        Args: { _activity_id: string; _child_id: string }
        Returns: number
      }
      expire_invitations: { Args: never; Returns: number }
      get_child_dashboard: { Args: { _token: string }; Returns: Json }
      get_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          expires_at: string
          family_id: string
          family_name: string
          is_valid: boolean
          parent_name: string
          status: string
        }[]
      }
      get_user_family_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_active_children_public: {
        Args: never
        Returns: {
          avatar_url: string
          has_password: boolean
          id: string
          name: string
        }[]
      }
      validate_child_token: {
        Args: { _token: string }
        Returns: {
          child_id: string
          family_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "parent" | "member"
      mission_goal_type: "total" | "streak"
      submission_status: "pendente" | "aprovado" | "recusado"
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
      app_role: ["admin", "parent", "member"],
      mission_goal_type: ["total", "streak"],
      submission_status: ["pendente", "aprovado", "recusado"],
    },
  },
} as const
