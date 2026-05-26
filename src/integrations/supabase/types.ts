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
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          created_at: string
          detail: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          detail?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          detail?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          archived: boolean
          commission_year: Database["public"]["Enums"]["commission_year"]
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          qualified: boolean
          rep_id: string | null
          signup_id: string
          status: Database["public"]["Enums"]["commission_payment_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          archived?: boolean
          commission_year: Database["public"]["Enums"]["commission_year"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          qualified?: boolean
          rep_id?: string | null
          signup_id: string
          status?: Database["public"]["Enums"]["commission_payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          archived?: boolean
          commission_year?: Database["public"]["Enums"]["commission_year"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          qualified?: boolean
          rep_id?: string | null
          signup_id?: string
          status?: Database["public"]["Enums"]["commission_payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_signup_id_fkey"
            columns: ["signup_id"]
            isOneToOne: false
            referencedRelation: "signups"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          lead_id: string
          mime_type: string
          size_bytes: number
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          lead_id: string
          mime_type?: string
          size_bytes?: number
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          lead_id?: string
          mime_type?: string
          size_bytes?: number
          uploaded_by?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          archived: boolean
          assigned_rep_id: string | null
          city: string
          contact_person: string
          contact_role: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string
          id: string
          lead_source: string
          next_follow_up: string | null
          notes: string
          org_name: string
          org_type: Database["public"]["Enums"]["org_type"]
          phone: string
          province: string
          region: string
          sport_focus: string
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          archived?: boolean
          assigned_rep_id?: string | null
          city?: string
          contact_person?: string
          contact_role?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string
          id?: string
          lead_source?: string
          next_follow_up?: string | null
          notes?: string
          org_name: string
          org_type?: Database["public"]["Enums"]["org_type"]
          phone?: string
          province?: string
          region?: string
          sport_focus?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          archived?: boolean
          assigned_rep_id?: string | null
          city?: string
          contact_person?: string
          contact_role?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string
          id?: string
          lead_source?: string
          next_follow_up?: string | null
          notes?: string
          org_name?: string
          org_type?: Database["public"]["Enums"]["org_type"]
          phone?: string
          province?: string
          region?: string
          sport_focus?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_rep_id_fkey"
            columns: ["assigned_rep_id"]
            isOneToOne: false
            referencedRelation: "reps"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          archived: boolean
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          lead_id: string
          meeting_at: string
          meeting_type: Database["public"]["Enums"]["meeting_type"]
          next_action: string
          next_follow_up: string | null
          outcome_notes: string
          rep_id: string | null
          status: Database["public"]["Enums"]["meeting_status"]
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          lead_id: string
          meeting_at: string
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          next_action?: string
          next_follow_up?: string | null
          outcome_notes?: string
          rep_id?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          lead_id?: string
          meeting_at?: string
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          next_action?: string
          next_follow_up?: string | null
          outcome_notes?: string
          rep_id?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "reps"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      reps: {
        Row: {
          active: boolean
          archived: boolean
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string
          full_name: string
          id: string
          phone: string
          province: string
          region_manager_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          sport_focus: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          archived?: boolean
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string
          province?: string
          region_manager_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          sport_focus?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          archived?: boolean
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string
          province?: string
          region_manager_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          sport_focus?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      signups: {
        Row: {
          active_teams: number
          admin_notes: string
          archived: boolean
          commission_payment_status: Database["public"]["Enums"]["commission_payment_status"]
          commission_year: Database["public"]["Enums"]["commission_year"]
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          lead_id: string
          paid: boolean
          paying_users_active: boolean
          payment_date: string | null
          rep_id: string | null
          signed_date: string
          updated_at: string
        }
        Insert: {
          active_teams?: number
          admin_notes?: string
          archived?: boolean
          commission_payment_status?: Database["public"]["Enums"]["commission_payment_status"]
          commission_year?: Database["public"]["Enums"]["commission_year"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          lead_id: string
          paid?: boolean
          paying_users_active?: boolean
          payment_date?: string | null
          rep_id?: string | null
          signed_date?: string
          updated_at?: string
        }
        Update: {
          active_teams?: number
          admin_notes?: string
          archived?: boolean
          commission_payment_status?: Database["public"]["Enums"]["commission_payment_status"]
          commission_year?: Database["public"]["Enums"]["commission_year"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          lead_id?: string
          paid?: boolean
          paying_users_active?: boolean
          payment_date?: string | null
          rep_id?: string | null
          signed_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signups_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "reps"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_rep_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "sales_rep"
      commission_payment_status: "Pending" | "Approved" | "Paid" | "Rejected"
      commission_year:
        | "1st year"
        | "2nd consecutive year"
        | "3rd consecutive year"
        | "4th consecutive year"
        | "5th year+"
      lead_status:
        | "New Lead"
        | "Contacted"
        | "Meeting Scheduled"
        | "Pitched"
        | "Interested"
        | "Not Interested"
        | "Signed"
        | "Paid"
        | "Active"
        | "Lost"
      meeting_status: "Scheduled" | "Completed" | "Cancelled" | "Rescheduled"
      meeting_type: "Phone" | "WhatsApp" | "Online" | "In-person"
      org_type: "School" | "Club" | "Academy" | "Other"
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
      app_role: ["admin", "sales_rep"],
      commission_payment_status: ["Pending", "Approved", "Paid", "Rejected"],
      commission_year: [
        "1st year",
        "2nd consecutive year",
        "3rd consecutive year",
        "4th consecutive year",
        "5th year+",
      ],
      lead_status: [
        "New Lead",
        "Contacted",
        "Meeting Scheduled",
        "Pitched",
        "Interested",
        "Not Interested",
        "Signed",
        "Paid",
        "Active",
        "Lost",
      ],
      meeting_status: ["Scheduled", "Completed", "Cancelled", "Rescheduled"],
      meeting_type: ["Phone", "WhatsApp", "Online", "In-person"],
      org_type: ["School", "Club", "Academy", "Other"],
    },
  },
} as const
