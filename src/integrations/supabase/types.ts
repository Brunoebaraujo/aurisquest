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
          icon_key: string | null
          icon_url: string | null
          id: string
          name: string
          reward_amount_cents: number
          reward_auris: number
          tier: Database["public"]["Enums"]["activity_tier"]
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          family_id: string
          frequency_hint?: string | null
          icon_key?: string | null
          icon_url?: string | null
          id?: string
          name: string
          reward_amount_cents?: number
          reward_auris?: number
          tier?: Database["public"]["Enums"]["activity_tier"]
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          family_id?: string
          frequency_hint?: string | null
          icon_key?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          reward_amount_cents?: number
          reward_auris?: number
          tier?: Database["public"]["Enums"]["activity_tier"]
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
      avatars: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["avatar_category"]
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          image_url: string
          name: string
          rarity: Database["public"]["Enums"]["cosmetic_rarity"]
          scope_id: string | null
          scope_type: string
          sort_order: number
          starts_at: string | null
          unlock_condition_value: Json
          unlock_rule_type: Database["public"]["Enums"]["unlock_rule_type"]
          unlock_threshold: number
        }
        Insert: {
          active?: boolean
          category: Database["public"]["Enums"]["avatar_category"]
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url: string
          name: string
          rarity?: Database["public"]["Enums"]["cosmetic_rarity"]
          scope_id?: string | null
          scope_type?: string
          sort_order?: number
          starts_at?: string | null
          unlock_condition_value?: Json
          unlock_rule_type?: Database["public"]["Enums"]["unlock_rule_type"]
          unlock_threshold?: number
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["avatar_category"]
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string
          name?: string
          rarity?: Database["public"]["Enums"]["cosmetic_rarity"]
          scope_id?: string | null
          scope_type?: string
          sort_order?: number
          starts_at?: string | null
          unlock_condition_value?: Json
          unlock_rule_type?: Database["public"]["Enums"]["unlock_rule_type"]
          unlock_threshold?: number
        }
        Relationships: []
      }
      child_equipment: {
        Row: {
          armor_item_id: string | null
          aura_item_id: string | null
          avatar_id: string | null
          child_id: string
          favorite_badge_id: string | null
          frame_item_id: string | null
          helmet_item_id: string | null
          last_seen_unlocks_at: string
          pet_item_id: string | null
          updated_at: string
          weapon_item_id: string | null
        }
        Insert: {
          armor_item_id?: string | null
          aura_item_id?: string | null
          avatar_id?: string | null
          child_id: string
          favorite_badge_id?: string | null
          frame_item_id?: string | null
          helmet_item_id?: string | null
          last_seen_unlocks_at?: string
          pet_item_id?: string | null
          updated_at?: string
          weapon_item_id?: string | null
        }
        Update: {
          armor_item_id?: string | null
          aura_item_id?: string | null
          avatar_id?: string | null
          child_id?: string
          favorite_badge_id?: string | null
          frame_item_id?: string | null
          helmet_item_id?: string | null
          last_seen_unlocks_at?: string
          pet_item_id?: string | null
          updated_at?: string
          weapon_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_equipment_armor_item_id_fkey"
            columns: ["armor_item_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_equipment_aura_item_id_fkey"
            columns: ["aura_item_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_equipment_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_equipment_favorite_badge_id_fkey"
            columns: ["favorite_badge_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_equipment_frame_item_id_fkey"
            columns: ["frame_item_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_equipment_helmet_item_id_fkey"
            columns: ["helmet_item_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_equipment_pet_item_id_fkey"
            columns: ["pet_item_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_equipment_weapon_item_id_fkey"
            columns: ["weapon_item_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
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
      child_unlocked_avatars: {
        Row: {
          avatar_id: string
          child_id: string
          id: string
          source: string | null
          unlocked_at: string
        }
        Insert: {
          avatar_id: string
          child_id: string
          id?: string
          source?: string | null
          unlocked_at?: string
        }
        Update: {
          avatar_id?: string
          child_id?: string
          id?: string
          source?: string | null
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_unlocked_avatars_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "avatars"
            referencedColumns: ["id"]
          },
        ]
      }
      child_unlocked_items: {
        Row: {
          child_id: string
          id: string
          item_id: string
          source: string | null
          unlocked_at: string
        }
        Insert: {
          child_id: string
          id?: string
          item_id: string
          source?: string | null
          unlocked_at?: string
        }
        Update: {
          child_id?: string
          id?: string
          item_id?: string
          source?: string | null
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_unlocked_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
        ]
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
      cosmetic_items: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["cosmetic_category"]
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          image_url: string
          name: string
          rarity: Database["public"]["Enums"]["cosmetic_rarity"]
          scope_id: string | null
          scope_type: string
          sort_order: number
          starts_at: string | null
          unlock_condition_value: Json
          unlock_rule_type: Database["public"]["Enums"]["unlock_rule_type"]
          unlock_threshold: number
        }
        Insert: {
          active?: boolean
          category: Database["public"]["Enums"]["cosmetic_category"]
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url: string
          name: string
          rarity?: Database["public"]["Enums"]["cosmetic_rarity"]
          scope_id?: string | null
          scope_type?: string
          sort_order?: number
          starts_at?: string | null
          unlock_condition_value?: Json
          unlock_rule_type?: Database["public"]["Enums"]["unlock_rule_type"]
          unlock_threshold?: number
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["cosmetic_category"]
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string
          name?: string
          rarity?: Database["public"]["Enums"]["cosmetic_rarity"]
          scope_id?: string | null
          scope_type?: string
          sort_order?: number
          starts_at?: string | null
          unlock_condition_value?: Json
          unlock_rule_type?: Database["public"]["Enums"]["unlock_rule_type"]
          unlock_threshold?: number
        }
        Relationships: []
      }
      families: {
        Row: {
          auris_per_real: number
          created_at: string
          created_by: string
          id: string
          kid_access_token: string
          name: string
          primary_parent_id: string | null
          slug: string
          status: string
        }
        Insert: {
          auris_per_real?: number
          created_at?: string
          created_by: string
          id?: string
          kid_access_token?: string
          name: string
          primary_parent_id?: string | null
          slug?: string
          status?: string
        }
        Update: {
          auris_per_real?: number
          created_at?: string
          created_by?: string
          id?: string
          kid_access_token?: string
          name?: string
          primary_parent_id?: string | null
          slug?: string
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
          kind: string
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
          kind?: string
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
          kind?: string
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
          bonus_auris: number
          child_id: string
          family_id: string
          id: string
          mission_id: string
        }
        Insert: {
          awarded_at?: string
          bonus_amount_cents?: number
          bonus_auris?: number
          child_id: string
          family_id: string
          id?: string
          mission_id: string
        }
        Update: {
          awarded_at?: string
          bonus_amount_cents?: number
          bonus_auris?: number
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
          bonus_auris: number
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
          bonus_auris?: number
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
          bonus_auris?: number
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
          auris_redeemed: number
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
          auris_redeemed?: number
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
          auris_redeemed?: number
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
      shared_group_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          email: string
          expires_at: string
          group_id: string
          id: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          email: string
          expires_at?: string
          group_id: string
          id?: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          group_id?: string
          id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "shared_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_group_members: {
        Row: {
          family_id: string
          group_id: string
          id: string
          joined_at: string
        }
        Insert: {
          family_id: string
          group_id: string
          id?: string
          joined_at?: string
        }
        Update: {
          family_id?: string
          group_id?: string
          id?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "shared_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_family_id: string
          owner_user_id: string
          type: Database["public"]["Enums"]["group_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_family_id: string
          owner_user_id: string
          type?: Database["public"]["Enums"]["group_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_family_id?: string
          owner_user_id?: string
          type?: Database["public"]["Enums"]["group_type"]
        }
        Relationships: []
      }
      shared_mission_awards: {
        Row: {
          awarded_at: string
          bonus_auris: number
          child_id: string | null
          family_id: string | null
          id: string
          mission_id: string
        }
        Insert: {
          awarded_at?: string
          bonus_auris?: number
          child_id?: string | null
          family_id?: string | null
          id?: string
          mission_id: string
        }
        Update: {
          awarded_at?: string
          bonus_auris?: number
          child_id?: string | null
          family_id?: string | null
          id?: string
          mission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_mission_awards_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "shared_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_mission_logs: {
        Row: {
          approved_by: string
          child_id: string
          family_id: string
          id: string
          logged_at: string
          mission_id: string
        }
        Insert: {
          approved_by: string
          child_id: string
          family_id: string
          id?: string
          logged_at?: string
          mission_id: string
        }
        Update: {
          approved_by?: string
          child_id?: string
          family_id?: string
          id?: string
          logged_at?: string
          mission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_mission_logs_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "shared_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_missions: {
        Row: {
          active: boolean
          activity_name: string
          bonus_auris: number
          created_at: string
          created_by: string
          description: string | null
          goal_target: number
          goal_type: Database["public"]["Enums"]["mission_goal_type"]
          group_id: string
          id: string
          medal_url: string | null
          mode: Database["public"]["Enums"]["shared_mission_mode"]
          name: string
        }
        Insert: {
          active?: boolean
          activity_name: string
          bonus_auris?: number
          created_at?: string
          created_by: string
          description?: string | null
          goal_target: number
          goal_type: Database["public"]["Enums"]["mission_goal_type"]
          group_id: string
          id?: string
          medal_url?: string | null
          mode: Database["public"]["Enums"]["shared_mission_mode"]
          name: string
        }
        Update: {
          active?: boolean
          activity_name?: string
          bonus_auris?: number
          created_at?: string
          created_by?: string
          description?: string | null
          goal_target?: number
          goal_type?: Database["public"]["Enums"]["mission_goal_type"]
          group_id?: string
          id?: string
          medal_url?: string | null
          mode?: Database["public"]["Enums"]["shared_mission_mode"]
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_missions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "shared_groups"
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
          reward_auris: number
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
          reward_auris?: number
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
          reward_auris?: number
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
      _slugify: { Args: { _text: string }; Returns: string }
      accept_invitation: { Args: { _token: string }; Returns: Json }
      accept_shared_group_invitation: {
        Args: { _token: string }
        Returns: Json
      }
      admin_usage_alerts: { Args: never; Returns: Json }
      admin_usage_families: {
        Args: {
          _family_status?: string
          _from: string
          _group_id?: string
          _to: string
        }
        Returns: Json
      }
      admin_usage_overview: {
        Args: {
          _family_status?: string
          _from: string
          _group_id?: string
          _to: string
        }
        Returns: Json
      }
      compute_child_level: { Args: { _child_id: string }; Returns: Json }
      compute_streak: {
        Args: { _activity_id: string; _child_id: string }
        Returns: number
      }
      create_responsible_invitation: {
        Args: { _contact: string; _name: string }
        Returns: Json
      }
      evaluate_cosmetic_unlocks: {
        Args: { _child_id: string }
        Returns: undefined
      }
      expire_invitations: { Args: never; Returns: number }
      get_child_dashboard: { Args: { _token: string }; Returns: Json }
      get_family_id_by_token: { Args: { _token: string }; Returns: string }
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
      get_shared_group_invitation: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          group_id: string
          group_name: string
          is_valid: boolean
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
      is_group_member: {
        Args: { _group_id: string; _uid: string }
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
      list_children_by_family_token: {
        Args: { _token: string }
        Returns: {
          avatar_url: string
          child_id: string
          child_name: string
          family_id: string
          family_name: string
          has_password: boolean
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
      activity_tier: "rotina" | "responsabilidade" | "desafio"
      app_role: "admin" | "parent" | "member"
      avatar_category: "humano" | "fantastico"
      cosmetic_category:
        | "elmo"
        | "armadura"
        | "arma"
        | "pet"
        | "aura"
        | "moldura"
        | "badge"
      cosmetic_rarity: "comum" | "raro" | "epico" | "lendario"
      group_type: "familia_estendida" | "escola" | "condominio" | "outro"
      mission_goal_type: "total" | "streak"
      shared_mission_mode: "coletiva" | "individual"
      submission_status: "pendente" | "aprovado" | "recusado"
      unlock_rule_type:
        | "starter"
        | "auris_total"
        | "medalhas"
        | "streak"
        | "manual"
        | "aprovacoes"
        | "atividade"
        | "categoria"
        | "missao_grupo"
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
      activity_tier: ["rotina", "responsabilidade", "desafio"],
      app_role: ["admin", "parent", "member"],
      avatar_category: ["humano", "fantastico"],
      cosmetic_category: [
        "elmo",
        "armadura",
        "arma",
        "pet",
        "aura",
        "moldura",
        "badge",
      ],
      cosmetic_rarity: ["comum", "raro", "epico", "lendario"],
      group_type: ["familia_estendida", "escola", "condominio", "outro"],
      mission_goal_type: ["total", "streak"],
      shared_mission_mode: ["coletiva", "individual"],
      submission_status: ["pendente", "aprovado", "recusado"],
      unlock_rule_type: [
        "starter",
        "auris_total",
        "medalhas",
        "streak",
        "manual",
        "aprovacoes",
        "atividade",
        "categoria",
        "missao_grupo",
      ],
    },
  },
} as const
