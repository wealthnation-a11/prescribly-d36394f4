export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          consultation_fee: number | null
          consultation_log: string | null
          created_at: string
          doctor_id: string
          duration_minutes: number | null
          id: string
          notes: string | null
          patient_id: string
          scheduled_time: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          updated_at: string
        }
        Insert: {
          consultation_fee?: number | null
          consultation_log?: string | null
          created_at?: string
          doctor_id: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          scheduled_time: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string
        }
        Update: {
          consultation_fee?: number | null
          consultation_log?: string | null
          created_at?: string
          doctor_id?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          scheduled_time?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          admin_fee: number | null
          call_date: string
          created_at: string | null
          doctor_earnings: number | null
          doctor_id: string
          duration_minutes: number | null
          id: string
          patient_id: string
          patient_payment: number | null
          status: string | null
        }
        Insert: {
          admin_fee?: number | null
          call_date: string
          created_at?: string | null
          doctor_earnings?: number | null
          doctor_id: string
          duration_minutes?: number | null
          id?: string
          patient_id: string
          patient_payment?: number | null
          status?: string | null
        }
        Update: {
          admin_fee?: number | null
          call_date?: string
          created_at?: string | null
          doctor_earnings?: number | null
          doctor_id?: string
          duration_minutes?: number | null
          id?: string
          patient_id?: string
          patient_payment?: number | null
          status?: string | null
        }
        Relationships: []
      }
      chats: {
        Row: {
          created_at: string
          file_type: string | null
          file_url: string | null
          id: string
          message: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          message?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          message?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      doctor_availability: {
        Row: {
          created_at: string | null
          doctor_id: string
          end_time: string | null
          id: string
          is_available: boolean | null
          start_time: string | null
          timezone: string | null
          updated_at: string | null
          weekday: string
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          start_time?: string | null
          timezone?: string | null
          updated_at?: string | null
          weekday: string
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          start_time?: string | null
          timezone?: string | null
          updated_at?: string | null
          weekday?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          bio: string | null
          consultation_fee: number | null
          created_at: string
          id: string
          kyc_documents: Json | null
          license_number: string | null
          rating: number | null
          specialization: string
          total_reviews: number | null
          updated_at: string
          user_id: string
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          years_of_experience: number | null
        }
        Insert: {
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string
          id?: string
          kyc_documents?: Json | null
          license_number?: string | null
          rating?: number | null
          specialization: string
          total_reviews?: number | null
          updated_at?: string
          user_id: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          years_of_experience?: number | null
        }
        Update: {
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string
          id?: string
          kyc_documents?: Json | null
          license_number?: string | null
          rating?: number | null
          specialization?: string
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          years_of_experience?: number | null
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          created_at: string
          currency: string
          id: string
          rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          rate: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message_text: string
          sender_id: string | null
          sender_type: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message_text: string
          sender_id?: string | null
          sender_type: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message_text?: string
          sender_id?: string | null
          sender_type?: string
          user_id?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          allergies: string | null
          created_at: string
          current_medications: string | null
          date_of_birth: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          medical_history: string | null
          phone: string | null
          registration_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string | null
          created_at?: string
          current_medications?: string | null
          date_of_birth?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          medical_history?: string | null
          phone?: string | null
          registration_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string | null
          created_at?: string
          current_medications?: string | null
          date_of_birth?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          medical_history?: string | null
          phone?: string | null
          registration_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          appointment_id: string | null
          created_at: string
          diagnosis: string | null
          doctor_id: string
          id: string
          instructions: string | null
          issued_at: string
          medications: Json
          patient_id: string
          status: Database["public"]["Enums"]["prescription_status"] | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          id?: string
          instructions?: string | null
          issued_at?: string
          medications: Json
          patient_id: string
          status?: Database["public"]["Enums"]["prescription_status"] | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          id?: string
          instructions?: string | null
          issued_at?: string
          medications?: Json
          patient_id?: string
          status?: Database["public"]["Enums"]["prescription_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          first_name: string | null
          gender: string | null
          id: string
          is_blocked: boolean | null
          last_name: string | null
          location_country: string | null
          location_state: string | null
          medical_history: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          first_name?: string | null
          gender?: string | null
          id?: string
          is_blocked?: boolean | null
          last_name?: string | null
          location_country?: string | null
          location_state?: string | null
          medical_history?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          is_blocked?: boolean | null
          last_name?: string | null
          location_country?: string | null
          location_state?: string | null
          medical_history?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string
          id: string
          priority: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      symptom_logs: {
        Row: {
          additional_symptoms: string | null
          created_at: string
          duration: string | null
          id: string
          main_symptom: string
          recent_events: string | null
          severity: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_symptoms?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          main_symptom: string
          recent_events?: string | null
          severity?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_symptoms?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          main_symptom?: string
          recent_events?: string | null
          severity?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string
          currency: string | null
          doctor_id: string | null
          id: string
          patient_id: string
          payment_method: string | null
          payment_reference: string | null
          processed_at: string | null
          status: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string
          currency?: string | null
          doctor_id?: string | null
          id?: string
          patient_id: string
          payment_method?: string | null
          payment_reference?: string | null
          processed_at?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          currency?: string | null
          doctor_id?: string | null
          id?: string
          patient_id?: string
          payment_method?: string | null
          payment_reference?: string | null
          processed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activities: {
        Row: {
          activity_description: string
          activity_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_description: string
          activity_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_description?: string
          activity_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
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
          _user_id: string
          _role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      appointment_status:
        | "scheduled"
        | "completed"
        | "cancelled"
        | "no_show"
        | "pending"
        | "approved"
      prescription_status: "pending" | "dispensed" | "cancelled"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      user_role: "admin" | "doctor" | "patient"
      verification_status: "pending" | "approved" | "rejected" | "suspended"
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
      appointment_status: [
        "scheduled",
        "completed",
        "cancelled",
        "no_show",
        "pending",
        "approved",
      ],
      prescription_status: ["pending", "dispensed", "cancelled"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      user_role: ["admin", "doctor", "patient"],
      verification_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
