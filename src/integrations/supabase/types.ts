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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_confidence_logs: {
        Row: {
          ai_model: string
          average_confidence: number
          conditions_analyzed: Json
          confidence_threshold: number
          created_at: string
          diagnosis_session_id: string
          highest_confidence: number
          id: string
          override_reason: string | null
          passed_threshold: boolean
        }
        Insert: {
          ai_model: string
          average_confidence: number
          conditions_analyzed: Json
          confidence_threshold?: number
          created_at?: string
          diagnosis_session_id: string
          highest_confidence: number
          id?: string
          override_reason?: string | null
          passed_threshold: boolean
        }
        Update: {
          ai_model?: string
          average_confidence?: number
          conditions_analyzed?: Json
          confidence_threshold?: number
          created_at?: string
          diagnosis_session_id?: string
          highest_confidence?: number
          id?: string
          override_reason?: string | null
          passed_threshold?: boolean
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          request_count: number | null
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number | null
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number | null
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      api_rate_limits_enhanced: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
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
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      approved_medications: {
        Row: {
          active: boolean
          created_at: string
          diagnosis_name: string
          icd10_code: string
          id: string
          last_reviewed_by: string | null
          notes: string | null
          protocol: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          diagnosis_name: string
          icd10_code: string
          id?: string
          last_reviewed_by?: string | null
          notes?: string | null
          protocol: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          diagnosis_name?: string
          icd10_code?: string
          id?: string
          last_reviewed_by?: string | null
          notes?: string | null
          protocol?: Json
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          diagnosis_id: string
          id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          diagnosis_id: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          diagnosis_id?: string
          id?: string
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          approved: boolean | null
          author_email: string
          author_name: string
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          approved?: boolean | null
          author_email: string
          author_name: string
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          approved?: boolean | null
          author_email?: string
          author_name?: string
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          category: string | null
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          meta_description: string | null
          meta_keywords: string[] | null
          og_image: string | null
          published: boolean
          published_at: string | null
          slug: string
          source_id: string | null
          source_type: string | null
          tags: string[] | null
          title: string
          updated_at: string
          views: number | null
        }
        Insert: {
          author_id: string
          category?: string | null
          content: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string[] | null
          og_image?: string | null
          published?: boolean
          published_at?: string | null
          slug: string
          source_id?: string | null
          source_type?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          author_id?: string
          category?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string[] | null
          og_image?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string
          source_id?: string | null
          source_type?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          admin_fee: number | null
          call_date: string | null
          call_session_id: string | null
          created_at: string | null
          doctor_earnings: number | null
          doctor_id: string
          duration_minutes: number | null
          id: string
          patient_id: string
          patient_payment: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_fee?: number | null
          call_date?: string | null
          call_session_id?: string | null
          created_at?: string | null
          doctor_earnings?: number | null
          doctor_id: string
          duration_minutes?: number | null
          id?: string
          patient_id: string
          patient_payment?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_fee?: number | null
          call_date?: string | null
          call_session_id?: string | null
          created_at?: string | null
          doctor_earnings?: number | null
          doctor_id?: string
          duration_minutes?: number | null
          id?: string
          patient_id?: string
          patient_payment?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          appointment_id: string | null
          channel_name: string
          created_at: string | null
          doctor_id: string
          ended_at: string | null
          id: string
          patient_id: string
          started_at: string | null
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          channel_name: string
          created_at?: string | null
          doctor_id: string
          ended_at?: string | null
          id?: string
          patient_id: string
          started_at?: string | null
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          channel_name?: string
          created_at?: string | null
          doctor_id?: string
          ended_at?: string | null
          id?: string
          patient_id?: string
          started_at?: string | null
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          created_at: string
          data: Json | null
          day_number: number
          id: string
          status: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          data?: Json | null
          day_number: number
          id?: string
          status?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          data?: Json | null
          day_number?: number
          id?: string
          status?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          active: boolean | null
          challenge_type: string | null
          created_at: string | null
          description: string
          duration: number
          end_date: string
          id: string
          points_per_day: number | null
          start_date: string
          title: string
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          challenge_type?: string | null
          created_at?: string | null
          description: string
          duration: number
          end_date: string
          id?: string
          points_per_day?: number | null
          start_date: string
          title: string
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          challenge_type?: string | null
          created_at?: string | null
          description?: string
          duration?: number
          end_date?: string
          id?: string
          points_per_day?: number | null
          start_date?: string
          title?: string
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          confidence_score: number | null
          conversation_history: Json | null
          created_at: string | null
          current_question: string | null
          diagnosis_result: Json | null
          id: string
          points_earned: number | null
          session_data: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          conversation_history?: Json | null
          created_at?: string | null
          current_question?: string | null
          diagnosis_result?: Json | null
          id?: string
          points_earned?: number | null
          session_data?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          conversation_history?: Json | null
          created_at?: string | null
          current_question?: string | null
          diagnosis_result?: Json | null
          id?: string
          points_earned?: number | null
          session_data?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          created_at: string | null
          encrypted_message: string | null
          file_type: string | null
          id: string
          message: string | null
          recipient_id: string
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          encrypted_message?: string | null
          file_type?: string | null
          id?: string
          message?: string | null
          recipient_id: string
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          encrypted_message?: string | null
          file_type?: string | null
          id?: string
          message?: string | null
          recipient_id?: string
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      clarifying_questions: {
        Row: {
          condition_id: number | null
          id: number
          question: string
        }
        Insert: {
          condition_id?: number | null
          id?: number
          question: string
        }
        Update: {
          condition_id?: number | null
          id?: number
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "clarifying_questions_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_questions: {
        Row: {
          category: string
          created_at: string | null
          id: number
          question_text: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: number
          question_text: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: number
          question_text?: string
        }
        Relationships: []
      }
      conditions: {
        Row: {
          common_symptoms: Json | null
          description: string | null
          id: number
          name: string
          severity_level: string | null
        }
        Insert: {
          common_symptoms?: Json | null
          description?: string | null
          id?: number
          name: string
          severity_level?: string | null
        }
        Update: {
          common_symptoms?: Json | null
          description?: string | null
          id?: number
          name?: string
          severity_level?: string | null
        }
        Relationships: []
      }
      consultation_payments: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string
          currency: string | null
          exchange_rate_used: number | null
          id: string
          local_amount: number | null
          provider: string | null
          reference: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string
          currency?: string | null
          exchange_rate_used?: number | null
          id?: string
          local_amount?: number | null
          provider?: string | null
          reference: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          currency?: string | null
          exchange_rate_used?: number | null
          id?: string
          local_amount?: number | null
          provider?: string | null
          reference?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_tips: {
        Row: {
          created_at: string | null
          date: string
          id: number
          tip_id: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: never
          tip_id?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: never
          tip_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_tips_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "health_tips"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_history: {
        Row: {
          condition_id: number | null
          created_at: string | null
          evidence: Json | null
          id: string
          probability: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          condition_id?: number | null
          created_at?: string | null
          evidence?: Json | null
          id?: string
          probability?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          condition_id?: number | null
          created_at?: string | null
          evidence?: Json | null
          id?: string
          probability?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_history_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
        ]
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
      doctor_overrides: {
        Row: {
          confidence_after: number | null
          confidence_before: number | null
          created_at: string
          diagnosis_session_id: string
          doctor_id: string
          doctor_modified_conditions: Json
          id: string
          original_ai_conditions: Json
          override_reason: string
          override_type: string
        }
        Insert: {
          confidence_after?: number | null
          confidence_before?: number | null
          created_at?: string
          diagnosis_session_id: string
          doctor_id: string
          doctor_modified_conditions: Json
          id?: string
          original_ai_conditions: Json
          override_reason: string
          override_type: string
        }
        Update: {
          confidence_after?: number | null
          confidence_before?: number | null
          created_at?: string
          diagnosis_session_id?: string
          doctor_id?: string
          doctor_modified_conditions?: Json
          id?: string
          original_ai_conditions?: Json
          override_reason?: string
          override_type?: string
        }
        Relationships: []
      }
      doctor_verification_audit: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          doctor_id: string
          id: string
          notes: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          doctor_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          doctor_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_verification_audit_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
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
      drugs: {
        Row: {
          category: string | null
          condition_id: number | null
          dosage: string | null
          drug_name: string
          form: string | null
          id: number
          notes: string | null
          rxnorm_id: string | null
          strength: string | null
        }
        Insert: {
          category?: string | null
          condition_id?: number | null
          dosage?: string | null
          drug_name: string
          form?: string | null
          id?: number
          notes?: string | null
          rxnorm_id?: string | null
          strength?: string | null
        }
        Update: {
          category?: string | null
          condition_id?: number | null
          dosage?: string | null
          drug_name?: string
          form?: string | null
          id?: number
          notes?: string | null
          rxnorm_id?: string | null
          strength?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drugs_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_flags: {
        Row: {
          action_required: string
          created_at: string
          description: string
          diagnosis_session_id: string
          flag_type: string
          flagged_by: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          severity_level: number
        }
        Insert: {
          action_required: string
          created_at?: string
          description: string
          diagnosis_session_id: string
          flag_type: string
          flagged_by: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity_level: number
        }
        Update: {
          action_required?: string
          created_at?: string
          description?: string
          diagnosis_session_id?: string
          flag_type?: string
          flagged_by?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity_level?: number
        }
        Relationships: []
      }
      encrypted_message_audit: {
        Row: {
          action: string
          encrypted_at: string | null
          encryption_version: number | null
          id: string
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          encrypted_at?: string | null
          encryption_version?: number | null
          id?: string
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          encrypted_at?: string | null
          encryption_version?: number | null
          id?: string
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      encryption_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_version: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_version?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_version?: number
          user_id?: string
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
      health_tips: {
        Row: {
          created_at: string | null
          id: number
          tip: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          tip: string
        }
        Update: {
          created_at?: string | null
          id?: never
          tip?: string
        }
        Relationships: []
      }
      herbal_article_audit: {
        Row: {
          action: string
          admin_id: string
          article_id: string
          created_at: string
          id: string
          notes: string | null
        }
        Insert: {
          action: string
          admin_id: string
          article_id: string
          created_at?: string
          id?: string
          notes?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          article_id?: string
          created_at?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "herbal_article_audit_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "herbal_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      herbal_articles: {
        Row: {
          approval_status: Database["public"]["Enums"]["verification_status"]
          approved_at: string | null
          approved_by: string | null
          category: string | null
          content: string
          cover_image: string | null
          created_at: string
          id: string
          practitioner_id: string
          published_at: string | null
          rejection_reason: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["verification_status"]
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          content: string
          cover_image?: string | null
          created_at?: string
          id?: string
          practitioner_id: string
          published_at?: string | null
          rejection_reason?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["verification_status"]
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          id?: string
          practitioner_id?: string
          published_at?: string | null
          rejection_reason?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "herbal_articles_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "herbal_practitioners"
            referencedColumns: ["id"]
          },
        ]
      }
      herbal_consultations: {
        Row: {
          consultation_fee: number | null
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          patient_id: string
          practitioner_id: string
          scheduled_time: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          updated_at: string
        }
        Insert: {
          consultation_fee?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          practitioner_id: string
          scheduled_time: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string
        }
        Update: {
          consultation_fee?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          practitioner_id?: string
          scheduled_time?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "herbal_consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "herbal_consultations_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "herbal_practitioners"
            referencedColumns: ["id"]
          },
        ]
      }
      herbal_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          patient_id: string
          practitioner_id: string
          read: boolean
          sender_type: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          patient_id: string
          practitioner_id: string
          read?: boolean
          sender_type: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          patient_id?: string
          practitioner_id?: string
          read?: boolean
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "herbal_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "herbal_messages_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "herbal_practitioners"
            referencedColumns: ["id"]
          },
        ]
      }
      herbal_practitioners: {
        Row: {
          bio: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          license_number: string | null
          phone: string | null
          practice_location: string | null
          qualifications: Json | null
          specialization: string
          updated_at: string | null
          user_id: string
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          years_of_experience: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          license_number?: string | null
          phone?: string | null
          practice_location?: string | null
          qualifications?: Json | null
          specialization: string
          updated_at?: string | null
          user_id: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          years_of_experience?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          license_number?: string | null
          phone?: string | null
          practice_location?: string | null
          qualifications?: Json | null
          specialization?: string
          updated_at?: string | null
          user_id?: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          years_of_experience?: number | null
        }
        Relationships: []
      }
      herbal_remedies: {
        Row: {
          approval_status: Database["public"]["Enums"]["verification_status"]
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          id: string
          images: Json | null
          ingredients: Json | null
          name: string
          practitioner_id: string
          price: number | null
          rejection_reason: string | null
          updated_at: string
          usage_instructions: string | null
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["verification_status"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          ingredients?: Json | null
          name: string
          practitioner_id: string
          price?: number | null
          rejection_reason?: string | null
          updated_at?: string
          usage_instructions?: string | null
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["verification_status"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          ingredients?: Json | null
          name?: string
          practitioner_id?: string
          price?: number | null
          rejection_reason?: string | null
          updated_at?: string
          usage_instructions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "herbal_remedies_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "herbal_practitioners"
            referencedColumns: ["id"]
          },
        ]
      }
      herbal_remedy_audit: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          notes: string | null
          remedy_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          notes?: string | null
          remedy_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          remedy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "herbal_remedy_audit_remedy_id_fkey"
            columns: ["remedy_id"]
            isOneToOne: false
            referencedRelation: "herbal_remedies"
            referencedColumns: ["id"]
          },
        ]
      }
      herbal_verification_audit: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          id: string
          notes: string | null
          practitioner_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          practitioner_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          practitioner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "herbal_verification_audit_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "herbal_practitioners"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          sender: string
        }
        Insert: {
          content: string
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          sender: string
        }
        Update: {
          content?: string
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      monitoring_logs: {
        Row: {
          created_at: string
          entity_id: string | null
          error_message: string | null
          event_data: Json
          event_type: string
          id: string
          latency_ms: number | null
          processed_at: string | null
          success: boolean
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          error_message?: string | null
          event_data?: Json
          event_type: string
          id?: string
          latency_ms?: number | null
          processed_at?: string | null
          success?: boolean
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          error_message?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          latency_ms?: number | null
          processed_at?: string | null
          success?: boolean
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          subscribed: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          subscribed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          subscribed?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          diagnosis_session_id: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          diagnosis_session_id?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          diagnosis_session_id?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          admin_commission: number
          created_at: string
          id: string
          items: Json
          notes: string | null
          payment_reference: string | null
          practitioner_earnings: number
          practitioner_id: string
          shipping_address: Json | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_commission: number
          created_at?: string
          id?: string
          items: Json
          notes?: string | null
          payment_reference?: string | null
          practitioner_earnings: number
          practitioner_id: string
          shipping_address?: Json | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_commission?: number
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          payment_reference?: string | null
          practitioner_earnings?: number
          practitioner_id?: string
          shipping_address?: Json | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "herbal_practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      patient_prescriptions: {
        Row: {
          created_at: string
          diagnosis: Json | null
          id: string
          medications: Json
          patient_id: string
          safety_flags: Json | null
          status: string
          updated_at: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          diagnosis?: Json | null
          id?: string
          medications: Json
          patient_id: string
          safety_flags?: Json | null
          status?: string
          updated_at?: string
          visit_id: string
        }
        Update: {
          created_at?: string
          diagnosis?: Json | null
          id?: string
          medications?: Json
          patient_id?: string
          safety_flags?: Json | null
          status?: string
          updated_at?: string
          visit_id?: string
        }
        Relationships: []
      }
      patient_visits: {
        Row: {
          ai_differential: Json | null
          clarifying_qna: Json | null
          created_at: string
          final_diagnosis: string | null
          icd10_code: string | null
          id: string
          patient_id: string
          prescription_id: string | null
          safety_flags: Json | null
          selected_symptoms: string[] | null
          status: string
          symptom_text: string | null
          updated_at: string
        }
        Insert: {
          ai_differential?: Json | null
          clarifying_qna?: Json | null
          created_at?: string
          final_diagnosis?: string | null
          icd10_code?: string | null
          id?: string
          patient_id: string
          prescription_id?: string | null
          safety_flags?: Json | null
          selected_symptoms?: string[] | null
          status?: string
          symptom_text?: string | null
          updated_at?: string
        }
        Update: {
          ai_differential?: Json | null
          clarifying_qna?: Json | null
          created_at?: string
          final_diagnosis?: string | null
          icd10_code?: string | null
          id?: string
          patient_id?: string
          prescription_id?: string | null
          safety_flags?: Json | null
          selected_symptoms?: string[] | null
          status?: string
          symptom_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          allergies: string | null
          country: string | null
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
          pregnancy_status: boolean | null
          registration_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string | null
          country?: string | null
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
          pregnancy_status?: boolean | null
          registration_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string | null
          country?: string | null
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
          pregnancy_status?: boolean | null
          registration_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          exchange_rate_used: number | null
          id: string
          local_amount: number | null
          provider: string | null
          reference: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          exchange_rate_used?: number | null
          id?: string
          local_amount?: number | null
          provider?: string | null
          reference: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          exchange_rate_used?: number | null
          id?: string
          local_amount?: number | null
          provider?: string | null
          reference?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          created_at: string
          endpoint: string | null
          id: string
          measured_at: string
          metadata: Json | null
          metric_type: string
          unit: string
          value: number
        }
        Insert: {
          created_at?: string
          endpoint?: string | null
          id?: string
          measured_at?: string
          metadata?: Json | null
          metric_type: string
          unit: string
          value: number
        }
        Update: {
          created_at?: string
          endpoint?: string | null
          id?: string
          measured_at?: string
          metadata?: Json | null
          metric_type?: string
          unit?: string
          value?: number
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
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      prescriptions_v2: {
        Row: {
          created_at: string
          diagnosis_id: string
          doctor_id: string
          drugs: Json
          encrypted_drugs: string | null
          encryption_key_id: string | null
          id: string
          patient_id: string
          status: string
        }
        Insert: {
          created_at?: string
          diagnosis_id: string
          doctor_id: string
          drugs?: Json
          encrypted_drugs?: string | null
          encryption_key_id?: string | null
          id?: string
          patient_id: string
          status?: string
        }
        Update: {
          created_at?: string
          diagnosis_id?: string
          doctor_id?: string
          drugs?: Json
          encrypted_drugs?: string | null
          encryption_key_id?: string | null
          id?: string
          patient_id?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          dashboard_tour_completed: boolean | null
          date_of_birth: string | null
          email: string
          first_name: string | null
          gender: string | null
          id: string
          is_blocked: boolean | null
          is_legacy: boolean | null
          last_login: string | null
          last_name: string | null
          location_country: string | null
          location_state: string | null
          medical_history: string | null
          onboarding_completed: boolean | null
          phone: string | null
          previous_login: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          dashboard_tour_completed?: boolean | null
          date_of_birth?: string | null
          email: string
          first_name?: string | null
          gender?: string | null
          id?: string
          is_blocked?: boolean | null
          is_legacy?: boolean | null
          last_login?: string | null
          last_name?: string | null
          location_country?: string | null
          location_state?: string | null
          medical_history?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          previous_login?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          dashboard_tour_completed?: boolean | null
          date_of_birth?: string | null
          email?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          is_blocked?: boolean | null
          is_legacy?: boolean | null
          last_login?: string | null
          last_name?: string | null
          location_country?: string | null
          location_state?: string | null
          medical_history?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          previous_login?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_doctor_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          consultation_fee: number | null
          created_at: string
          doctor_id: string
          doctor_user_id: string
          first_name: string | null
          last_name: string | null
          rating: number | null
          specialization: string
          total_reviews: number | null
          updated_at: string
          years_of_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string
          doctor_id: string
          doctor_user_id: string
          first_name?: string | null
          last_name?: string | null
          rating?: number | null
          specialization: string
          total_reviews?: number | null
          updated_at?: string
          years_of_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string
          doctor_id?: string
          doctor_user_id?: string
          first_name?: string | null
          last_name?: string | null
          rating?: number | null
          specialization?: string
          total_reviews?: number | null
          updated_at?: string
          years_of_experience?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recent_activities: {
        Row: {
          activity_id: string
          created_at: string
          details: string
          doctor_id: string | null
          related_id: string | null
          timestamp: string
          type: string
          user_id: string | null
        }
        Insert: {
          activity_id?: string
          created_at?: string
          details: string
          doctor_id?: string | null
          related_id?: string | null
          timestamp?: string
          type: string
          user_id?: string | null
        }
        Update: {
          activity_id?: string
          created_at?: string
          details?: string
          doctor_id?: string | null
          related_id?: string | null
          timestamp?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      security_audit: {
        Row: {
          created_at: string
          endpoint: string
          event_type: string
          id: string
          ip_address: unknown
          request_method: string | null
          request_payload: Json | null
          response_status: number | null
          risk_level: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          event_type: string
          id?: string
          ip_address?: unknown
          request_method?: string | null
          request_payload?: Json | null
          response_status?: number | null
          risk_level?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          request_method?: string | null
          request_payload?: Json | null
          response_status?: number | null
          risk_level?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shopping_cart: {
        Row: {
          created_at: string
          id: string
          quantity: number
          remedy_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quantity?: number
          remedy_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quantity?: number
          remedy_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_cart_remedy_id_fkey"
            columns: ["remedy_id"]
            isOneToOne: false
            referencedRelation: "herbal_remedies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_cart_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          authorization_code: string | null
          created_at: string
          expires_at: string | null
          id: string
          plan: string
          started_at: string | null
          status: string
          subscription_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          authorization_code?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string | null
          status?: string
          subscription_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          authorization_code?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string | null
          status?: string
          subscription_code?: string | null
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
      symptom_condition_map: {
        Row: {
          condition_id: number | null
          id: number
          symptom: string
          weight: number
        }
        Insert: {
          condition_id?: number | null
          id?: number
          symptom: string
          weight: number
        }
        Update: {
          condition_id?: number | null
          id?: number
          symptom?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "symptom_condition_map_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
        ]
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
      symptoms: {
        Row: {
          aliases: string[] | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          severity_weight: number | null
        }
        Insert: {
          aliases?: string[] | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          severity_weight?: number | null
        }
        Update: {
          aliases?: string[] | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          severity_weight?: number | null
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          alert_data: Json
          alert_type: string
          created_at: string
          description: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
          triggered_at: string
        }
        Insert: {
          alert_data?: Json
          alert_type: string
          created_at?: string
          description: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          title: string
          triggered_at?: string
        }
        Update: {
          alert_data?: Json
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
          triggered_at?: string
        }
        Relationships: []
      }
      test_patients: {
        Row: {
          created_at: string
          expected_conditions: string[]
          expected_confidence_range: unknown
          id: string
          is_active: boolean
          last_tested_at: string | null
          test_metadata: Json | null
          test_name: string
          test_results: Json | null
          test_symptoms: string[]
        }
        Insert: {
          created_at?: string
          expected_conditions: string[]
          expected_confidence_range: unknown
          id?: string
          is_active?: boolean
          last_tested_at?: string | null
          test_metadata?: Json | null
          test_name: string
          test_results?: Json | null
          test_symptoms: string[]
        }
        Update: {
          created_at?: string
          expected_conditions?: string[]
          expected_confidence_range?: unknown
          id?: string
          is_active?: boolean
          last_tested_at?: string | null
          test_metadata?: Json | null
          test_name?: string
          test_results?: Json | null
          test_symptoms?: string[]
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
      user_achievements: {
        Row: {
          badge_description: string | null
          badge_name: string
          badge_type: string
          created_at: string
          date_awarded: string
          id: string
          user_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_name: string
          badge_type: string
          created_at?: string
          date_awarded?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_description?: string | null
          badge_name?: string
          badge_type?: string
          created_at?: string
          date_awarded?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
      user_assessments: {
        Row: {
          answers: Json
          condition_id: number | null
          created_at: string
          id: string
          probability: number | null
          reasoning: string | null
          recommended_drugs: Json
          session_id: string | null
          symptoms: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          condition_id?: number | null
          created_at?: string
          id?: string
          probability?: number | null
          reasoning?: string | null
          recommended_drugs?: Json
          session_id?: string | null
          symptoms?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          condition_id?: number | null
          created_at?: string
          id?: string
          probability?: number | null
          reasoning?: string | null
          recommended_drugs?: Json
          session_id?: string | null
          symptoms?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_assessments_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_description: string | null
          badge_name: string
          created_at: string | null
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_name: string
          created_at?: string | null
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_description?: string | null
          badge_name?: string
          created_at?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_challenges: {
        Row: {
          challenge_id: string
          completed_at: string | null
          id: string
          joined_at: string | null
          points_earned: number | null
          progress: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          id?: string
          joined_at?: string | null
          points_earned?: number | null
          progress?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          id?: string
          joined_at?: string | null
          points_earned?: number | null
          progress?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_daily_checkins: {
        Row: {
          answer: string
          created_at: string | null
          date: string | null
          id: number
          question_id: number | null
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string | null
          date?: string | null
          id?: number
          question_id?: number | null
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string | null
          date?: string | null
          id?: number
          question_id?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_diagnosis_history: {
        Row: {
          created_at: string | null
          diagnosis: string | null
          dosage: string | null
          drug: string | null
          id: string
          instructions: string | null
          precautions: string | null
          symptoms: string[] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          diagnosis?: string | null
          dosage?: string | null
          drug?: string | null
          id?: string
          instructions?: string | null
          precautions?: string | null
          symptoms?: string[] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          diagnosis?: string | null
          dosage?: string | null
          drug?: string | null
          id?: string
          instructions?: string | null
          precautions?: string | null
          symptoms?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_encryption_keys: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          key_version: number | null
          public_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key_version?: number | null
          public_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key_version?: number | null
          public_key?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_history: {
        Row: {
          confirmed_condition: number | null
          created_at: string | null
          id: string
          input_text: string | null
          parsed_symptoms: Json | null
          suggested_conditions: Json | null
          user_id: string | null
        }
        Insert: {
          confirmed_condition?: number | null
          created_at?: string | null
          id?: string
          input_text?: string | null
          parsed_symptoms?: Json | null
          suggested_conditions?: Json | null
          user_id?: string | null
        }
        Update: {
          confirmed_condition?: number | null
          created_at?: string | null
          id?: string
          input_text?: string | null
          parsed_symptoms?: Json | null
          suggested_conditions?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_hydration_log: {
        Row: {
          created_at: string
          date: string
          glasses_drank: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          glasses_drank?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          glasses_drank?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          created_at: string | null
          id: string
          points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_routes: {
        Row: {
          activity_id: string | null
          activity_type: string
          avg_pace_min_per_km: number | null
          calories_burned: number | null
          created_at: string
          duration_minutes: number
          end_time: string | null
          id: string
          route_data: Json | null
          start_time: string
          steps_during_activity: number | null
          total_distance_km: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          activity_type?: string
          avg_pace_min_per_km?: number | null
          calories_burned?: number | null
          created_at?: string
          duration_minutes?: number
          end_time?: string | null
          id?: string
          route_data?: Json | null
          start_time?: string
          steps_during_activity?: number | null
          total_distance_km?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          activity_type?: string
          avg_pace_min_per_km?: number | null
          calories_burned?: number | null
          created_at?: string
          duration_minutes?: number
          end_time?: string | null
          id?: string
          route_data?: Json | null
          start_time?: string
          steps_during_activity?: number | null
          total_distance_km?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          id: string
          path: string
          payload: Json
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path?: string
          payload?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          payload?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_steps: {
        Row: {
          calories_burned: number | null
          created_at: string
          date: string
          distance_km: number | null
          goal_reached: boolean
          id: string
          step_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calories_burned?: number | null
          created_at?: string
          date?: string
          distance_km?: number | null
          goal_reached?: boolean
          id?: string
          step_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calories_burned?: number | null
          created_at?: string
          date?: string
          distance_km?: number | null
          goal_reached?: boolean
          id?: string
          step_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wellness_check_results: {
        Row: {
          created_at: string
          diagnosis: string | null
          id: string
          instructions: string | null
          patient_info: Json | null
          prescription: Json | null
          symptoms: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          diagnosis?: string | null
          id?: string
          instructions?: string | null
          patient_info?: Json | null
          prescription?: Json | null
          symptoms?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          diagnosis?: string | null
          id?: string
          instructions?: string | null
          patient_info?: Json | null
          prescription?: Json | null
          symptoms?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wellness_checks: {
        Row: {
          age: number | null
          calculated_probabilities: Json
          consent_timestamp: string
          created_at: string
          duration: string | null
          entered_symptoms: string[]
          gender: string | null
          id: string
          suggested_drugs: Json | null
          user_id: string
        }
        Insert: {
          age?: number | null
          calculated_probabilities: Json
          consent_timestamp?: string
          created_at?: string
          duration?: string | null
          entered_symptoms: string[]
          gender?: string | null
          id?: string
          suggested_drugs?: Json | null
          user_id: string
        }
        Update: {
          age?: number | null
          calculated_probabilities?: Json
          consent_timestamp?: string
          created_at?: string
          duration?: string | null
          entered_symptoms?: string[]
          gender?: string | null
          id?: string
          suggested_drugs?: Json | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_award_step_achievements: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: {
          endpoint_name: string
          max_requests?: number
          user_uuid: string
          window_minutes?: number
        }
        Returns: boolean
      }
      check_system_health: { Args: never; Returns: Json }
      get_challenge_leaderboard: {
        Args: { challenge_uuid: string }
        Returns: {
          points_earned: number
          progress: number
          rank: number
          user_id: string
          username: string
        }[]
      }
      get_daily_questions_for_user: {
        Args: { user_uuid: string }
        Returns: {
          category: string
          id: number
          question_text: string
        }[]
      }
      get_symptom_suggestions: {
        Args: { search_term?: string }
        Returns: {
          symptom: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { user_email: string }; Returns: boolean }
      log_monitoring_event: {
        Args: {
          entity_id_param: string
          error_message_param?: string
          event_data_param: Json
          event_type_param: string
          latency_ms_param?: number
          success_param?: boolean
        }
        Returns: string
      }
      refresh_public_doctor_profile: {
        Args: { _user_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_user_points: {
        Args: { points_to_add: number; user_uuid: string }
        Returns: undefined
      }
      validate_encrypted_content: {
        Args: { content: string }
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
