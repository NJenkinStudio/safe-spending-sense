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
      accounts: {
        Row: {
          account_type: string
          balance_as_of: string
          color: string
          created_at: string
          current_balance: number
          id: string
          include_in_forecast: boolean
          institution_name: string | null
          is_demo: boolean
          last_synced_at: string | null
          minimum_balance: number
          name: string
          notes: string | null
          plaid_account_id: string | null
          plaid_item_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          balance_as_of?: string
          color?: string
          created_at?: string
          current_balance?: number
          id?: string
          include_in_forecast?: boolean
          institution_name?: string | null
          is_demo?: boolean
          last_synced_at?: string | null
          minimum_balance?: number
          name: string
          notes?: string | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          balance_as_of?: string
          color?: string
          created_at?: string
          current_balance?: number
          id?: string
          include_in_forecast?: boolean
          institution_name?: string | null
          is_demo?: boolean
          last_synced_at?: string | null
          minimum_balance?: number
          name?: string
          notes?: string | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_plaid_item_id_fkey"
            columns: ["plaid_item_id"]
            isOneToOne: false
            referencedRelation: "plaid_items"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_rules: {
        Row: {
          active: boolean
          amount: number
          category: string | null
          confidence_level: string
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          destination_account_id: string | null
          end_date: string | null
          essential: boolean
          fixed_or_variable: string
          frequency: string
          id: string
          interval_count: number | null
          is_demo: boolean
          name: string
          notes: string | null
          occurrence_limit: number | null
          occurrences_completed: number
          rule_type: string
          source_account_id: string | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          amount: number
          category?: string | null
          confidence_level?: string
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          destination_account_id?: string | null
          end_date?: string | null
          essential?: boolean
          fixed_or_variable?: string
          frequency?: string
          id?: string
          interval_count?: number | null
          is_demo?: boolean
          name: string
          notes?: string | null
          occurrence_limit?: number | null
          occurrences_completed?: number
          rule_type: string
          source_account_id?: string | null
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          amount?: number
          category?: string | null
          confidence_level?: string
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          destination_account_id?: string | null
          end_date?: string | null
          essential?: boolean
          fixed_or_variable?: string
          frequency?: string
          id?: string
          interval_count?: number | null
          is_demo?: boolean
          name?: string
          notes?: string | null
          occurrence_limit?: number | null
          occurrences_completed?: number
          rule_type?: string
          source_account_id?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_rules_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_rules_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_responses: {
        Row: {
          account_setup_completeness: string | null
          account_structure: string | null
          all_accounts_added: string | null
          all_bills_added: string | null
          all_income_sources_added: string | null
          bill_preparation_style: string | null
          created_at: string
          current_budgeting_app: string | null
          current_step: number
          estimated_bills_remaining: number | null
          estimated_income_sources_remaining: number | null
          income_predictability: string | null
          money_management_style: string | null
          planning_goal_enabled: boolean
          primary_financial_goals: string[]
          spending_confidence: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_setup_completeness?: string | null
          account_structure?: string | null
          all_accounts_added?: string | null
          all_bills_added?: string | null
          all_income_sources_added?: string | null
          bill_preparation_style?: string | null
          created_at?: string
          current_budgeting_app?: string | null
          current_step?: number
          estimated_bills_remaining?: number | null
          estimated_income_sources_remaining?: number | null
          income_predictability?: string | null
          money_management_style?: string | null
          planning_goal_enabled?: boolean
          primary_financial_goals?: string[]
          spending_confidence?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_setup_completeness?: string | null
          account_structure?: string | null
          all_accounts_added?: string | null
          all_bills_added?: string | null
          all_income_sources_added?: string | null
          bill_preparation_style?: string | null
          created_at?: string
          current_budgeting_app?: string | null
          current_step?: number
          estimated_bills_remaining?: number | null
          estimated_income_sources_remaining?: number | null
          income_predictability?: string | null
          money_management_style?: string | null
          planning_goal_enabled?: boolean
          primary_financial_goals?: string[]
          spending_confidence?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plaid_items: {
        Row: {
          access_token: string
          created_at: string
          id: string
          institution_name: string | null
          item_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          institution_name?: string | null
          item_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          institution_name?: string | null
          item_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planning_goals: {
        Row: {
          amount_already_saved: number
          category: string | null
          created_at: string
          desired_date: string | null
          id: string
          name: string
          status: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_already_saved?: number
          category?: string | null
          created_at?: string
          desired_date?: string | null
          id?: string
          name: string
          status?: string
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_already_saved?: number
          category?: string | null
          created_at?: string
          desired_date?: string | null
          id?: string
          name?: string
          status?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_range: string | null
          created_at: string
          display_name: string | null
          email: string | null
          employment_status: string | null
          first_name: string | null
          household_status: string | null
          id: string
          last_name: string | null
          occupation: string | null
          onboarding_completed_at: string | null
          onboarding_version: number
          preferred_currency: string | null
          preferred_name: string | null
          setup_status: string
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          employment_status?: string | null
          first_name?: string | null
          household_status?: string | null
          id: string
          last_name?: string | null
          occupation?: string | null
          onboarding_completed_at?: string | null
          onboarding_version?: number
          preferred_currency?: string | null
          preferred_name?: string | null
          setup_status?: string
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          employment_status?: string | null
          first_name?: string | null
          household_status?: string | null
          id?: string
          last_name?: string | null
          occupation?: string | null
          onboarding_completed_at?: string | null
          onboarding_version?: number
          preferred_currency?: string | null
          preferred_name?: string | null
          setup_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      rule_changes: {
        Row: {
          created_at: string
          effective_date: string
          field_name: string
          financial_rule_id: string
          id: string
          is_demo: boolean
          new_value: string
          notes: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          effective_date: string
          field_name: string
          financial_rule_id: string
          id?: string
          is_demo?: boolean
          new_value: string
          notes?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          effective_date?: string
          field_name?: string
          financial_rule_id?: string
          id?: string
          is_demo?: boolean
          new_value?: string
          notes?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_changes_financial_rule_id_fkey"
            columns: ["financial_rule_id"]
            isOneToOne: false
            referencedRelation: "financial_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_rules: {
        Row: {
          account_id: string | null
          created_at: string
          emergency_fund_target: number | null
          id: string
          include_uncertain_income: boolean
          minimum_balance: number
          prevent_negative_balance: boolean
          required_days_funded: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          emergency_fund_target?: number | null
          id?: string
          include_uncertain_income?: boolean
          minimum_balance?: number
          prevent_negative_balance?: boolean
          required_days_funded?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          emergency_fund_target?: number | null
          id?: string
          include_uncertain_income?: boolean
          minimum_balance?: number
          prevent_negative_balance?: boolean
          required_days_funded?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
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
