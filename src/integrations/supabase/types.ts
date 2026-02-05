export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      branches: {
        Row: {
          color: string
          confidence_score: number | null
          created_at: string
          description: string | null
          event_id: string
          id: string
          is_main: boolean | null
          name: string
          position_z: number | null
          updated_at: string
        }
        Insert: {
          color?: string
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          is_main?: boolean | null
          name: string
          position_z?: number | null
          updated_at?: string
        }
        Update: {
          color?: string
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          is_main?: boolean | null
          name?: string
          position_z?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          current_phase: number | null
          description: string | null
          id: string
          status: Database["public"]["Enums"]["investigation_status"]
          title: string
          total_phases: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_phase?: number | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["investigation_status"]
          title: string
          total_phases?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_phase?: number | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["investigation_status"]
          title?: string
          total_phases?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      evidence: {
        Row: {
          bounding_boxes: Json | null
          branch_id: string
          content: string | null
          created_at: string
          event_id: string
          evidence_type: Database["public"]["Enums"]["evidence_type"]
          gemini_analysis: Json | null
          id: string
          image_url: string | null
          parent_evidence_id: string | null
          position_x: number | null
          position_y: number | null
          source_credibility: number | null
          source_url: string | null
          supports_narrative: boolean | null
          title: string
        }
        Insert: {
          bounding_boxes?: Json | null
          branch_id: string
          content?: string | null
          created_at?: string
          event_id: string
          evidence_type?: Database["public"]["Enums"]["evidence_type"]
          gemini_analysis?: Json | null
          id?: string
          image_url?: string | null
          parent_evidence_id?: string | null
          position_x?: number | null
          position_y?: number | null
          source_credibility?: number | null
          source_url?: string | null
          supports_narrative?: boolean | null
          title: string
        }
        Update: {
          bounding_boxes?: Json | null
          branch_id?: string
          content?: string | null
          created_at?: string
          event_id?: string
          evidence_type?: Database["public"]["Enums"]["evidence_type"]
          gemini_analysis?: Json | null
          id?: string
          image_url?: string | null
          parent_evidence_id?: string | null
          position_x?: number | null
          position_y?: number | null
          source_credibility?: number | null
          source_url?: string | null
          supports_narrative?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_parent_evidence_id_fkey"
            columns: ["parent_evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      hypotheses: {
        Row: {
          branch_id: string
          claim: string
          confidence_impact: number | null
          created_at: string
          id: string
          reasoning: string | null
          refuting_evidence_ids: string[] | null
          status: Database["public"]["Enums"]["hypothesis_status"]
          supporting_evidence_ids: string[] | null
          testable_prediction: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          claim: string
          confidence_impact?: number | null
          created_at?: string
          id?: string
          reasoning?: string | null
          refuting_evidence_ids?: string[] | null
          status?: Database["public"]["Enums"]["hypothesis_status"]
          supporting_evidence_ids?: string[] | null
          testable_prediction?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          claim?: string
          confidence_impact?: number | null
          created_at?: string
          id?: string
          reasoning?: string | null
          refuting_evidence_ids?: string[] | null
          status?: Database["public"]["Enums"]["hypothesis_status"]
          supporting_evidence_ids?: string[] | null
          testable_prediction?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hypotheses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      investigation_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          event_id: string
          id: string
          phase: number
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          event_id: string
          id?: string
          phase: number
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          event_id?: string
          id?: string
          phase?: number
        }
        Relationships: [
          {
            foreignKeyName: "investigation_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      merges: {
        Row: {
          conflicts: Json | null
          created_at: string
          event_id: string
          id: string
          resolution: string | null
          resolved_at: string | null
          source_branch_id: string
          status: Database["public"]["Enums"]["merge_status"]
          target_branch_id: string
        }
        Insert: {
          conflicts?: Json | null
          created_at?: string
          event_id: string
          id?: string
          resolution?: string | null
          resolved_at?: string | null
          source_branch_id: string
          status?: Database["public"]["Enums"]["merge_status"]
          target_branch_id: string
        }
        Update: {
          conflicts?: Json | null
          created_at?: string
          event_id?: string
          id?: string
          resolution?: string | null
          resolved_at?: string | null
          source_branch_id?: string
          status?: Database["public"]["Enums"]["merge_status"]
          target_branch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merges_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merges_source_branch_id_fkey"
            columns: ["source_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merges_target_branch_id_fkey"
            columns: ["target_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
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
      evidence_type: "image" | "text" | "link" | "document"
      hypothesis_status: "pending" | "testing" | "confirmed" | "refuted"
      investigation_status:
      | "idle"
      | "collecting"
      | "analyzing"
      | "complete"
      | "error"
      merge_status: "pending" | "merged" | "conflict"
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
      evidence_type: ["image", "text", "link", "document"],
      hypothesis_status: ["pending", "testing", "confirmed", "refuted"],
      investigation_status: [
        "idle",
        "collecting",
        "analyzing",
        "complete",
        "error",
      ],
      merge_status: ["pending", "merged", "conflict"],
    },
  },
} as const
