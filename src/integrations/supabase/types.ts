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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_type: string
          created_at: string
          doctor_id: string
          facility_id: string | null
          id: string
          notes: string | null
          patient_id: string
          payment_amount: number | null
          payment_reference: string | null
          payment_status: string | null
          reason: string | null
          registration_code: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_type?: string
          created_at?: string
          doctor_id: string
          facility_id?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          payment_amount?: number | null
          payment_reference?: string | null
          payment_status?: string | null
          reason?: string | null
          registration_code?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_type?: string
          created_at?: string
          doctor_id?: string
          facility_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          payment_amount?: number | null
          payment_reference?: string | null
          payment_status?: string | null
          reason?: string | null
          registration_code?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          approved: boolean | null
          author_email: string
          author_name: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          approved?: boolean | null
          author_email: string
          author_name: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          approved?: boolean | null
          author_email?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
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
          published: boolean | null
          published_at: string | null
          slug: string
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
          published?: boolean | null
          published_at?: string | null
          slug: string
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
          published?: boolean | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          created_at: string
          event: string
          id: string
          metadata: Json | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          appointment_id: string | null
          call_type: string | null
          caller_id: string
          channel_name: string | null
          created_at: string
          ended_at: string | null
          id: string
          receiver_id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          appointment_id?: string | null
          call_type?: string | null
          caller_id: string
          channel_name?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          receiver_id: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          appointment_id?: string | null
          call_type?: string | null
          caller_id?: string
          channel_name?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          receiver_id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          session_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          session_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          session_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      clarifying_questions: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          question: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          question: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          question?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conditions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          severity: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          severity?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          severity?: string | null
        }
        Relationships: []
      }
      consultation_payments: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string
          currency: string | null
          doctor_id: string
          id: string
          patient_id: string
          payment_method: string | null
          payment_reference: string | null
          status: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string
          currency?: string | null
          doctor_id: string
          id?: string
          patient_id: string
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          currency?: string | null
          doctor_id?: string
          id?: string
          patient_id?: string
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
        }
        Relationships: []
      }
      daily_question_answers: {
        Row: {
          answer: string
          answered_on: string
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          answer: string
          answered_on?: string
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          answer?: string
          answered_on?: string
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_questions: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          options: Json | null
          question: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          options?: Json | null
          question: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          options?: Json | null
          question?: string
        }
        Relationships: []
      }
      daily_tips: {
        Row: {
          created_at: string
          date: string
          id: string
          tip_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          tip_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          tip_id?: string | null
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
      doctor_availability: {
        Row: {
          created_at: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id?: string
          is_available?: boolean | null
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          doctor_id?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
        }
        Relationships: []
      }
      doctor_reviews: {
        Row: {
          appointment_id: string | null
          comment: string | null
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          rating: number
        }
        Insert: {
          appointment_id?: string | null
          comment?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          rating: number
        }
        Update: {
          appointment_id?: string | null
          comment?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          rating?: number
        }
        Relationships: []
      }
      doctors: {
        Row: {
          bio: string | null
          consultation_fee: number | null
          created_at: string
          home_service_fee: number | null
          id: string
          kyc_documents: Json | null
          latitude: number | null
          license_number: string | null
          longitude: number | null
          offers_home_service: boolean | null
          profile_id: string | null
          rating: number | null
          service_locations: Json | null
          specialization: string
          total_reviews: number | null
          updated_at: string
          user_id: string
          verification_status: string
          years_of_experience: number | null
        }
        Insert: {
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string
          home_service_fee?: number | null
          id?: string
          kyc_documents?: Json | null
          latitude?: number | null
          license_number?: string | null
          longitude?: number | null
          offers_home_service?: boolean | null
          profile_id?: string | null
          rating?: number | null
          service_locations?: Json | null
          specialization: string
          total_reviews?: number | null
          updated_at?: string
          user_id: string
          verification_status?: string
          years_of_experience?: number | null
        }
        Update: {
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string
          home_service_fee?: number | null
          id?: string
          kyc_documents?: Json | null
          latitude?: number | null
          license_number?: string | null
          longitude?: number | null
          offers_home_service?: boolean | null
          profile_id?: string | null
          rating?: number | null
          service_locations?: Json | null
          specialization?: string
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
          verification_status?: string
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_reminders: {
        Row: {
          created_at: string
          dosage: string | null
          drug_name: string
          frequency: string
          id: string
          is_active: boolean
          remind_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          drug_name: string
          frequency?: string
          id?: string
          is_active?: boolean
          remind_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dosage?: string | null
          drug_name?: string
          frequency?: string
          id?: string
          is_active?: boolean
          remind_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      drugs: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          dosage_form: string | null
          generic_name: string | null
          id: string
          manufacturer: string | null
          name: string
          requires_prescription: boolean | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          dosage_form?: string | null
          generic_name?: string | null
          id?: string
          manufacturer?: string | null
          name: string
          requires_prescription?: boolean | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          dosage_form?: string | null
          generic_name?: string | null
          id?: string
          manufacturer?: string | null
          name?: string
          requires_prescription?: boolean | null
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          base_currency: string
          id: string
          rate: number
          target_currency: string
          updated_at: string
        }
        Insert: {
          base_currency?: string
          id?: string
          rate: number
          target_currency: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          id?: string
          rate?: number
          target_currency?: string
          updated_at?: string
        }
        Relationships: []
      }
      facilities: {
        Row: {
          address: string | null
          admin_user_id: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          facility_type: string | null
          id: string
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_user_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          facility_type?: string | null
          id?: string
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_user_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          facility_type?: string | null
          id?: string
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      facility_patient_records: {
        Row: {
          created_at: string
          created_by: string | null
          diagnosis: string | null
          facility_id: string
          follow_up_date: string | null
          id: string
          patient_id: string
          registration_code_id: string | null
          treatment_notes: string | null
          updated_at: string
          vitals: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          facility_id: string
          follow_up_date?: string | null
          id?: string
          patient_id: string
          registration_code_id?: string | null
          treatment_notes?: string | null
          updated_at?: string
          vitals?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          facility_id?: string
          follow_up_date?: string | null
          id?: string
          patient_id?: string
          registration_code_id?: string | null
          treatment_notes?: string | null
          updated_at?: string
          vitals?: Json | null
        }
        Relationships: []
      }
      facility_staff: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          is_active: boolean | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          is_active?: boolean | null
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          is_active?: boolean | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_staff_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      health_tips: {
        Row: {
          category: string | null
          created_at: string
          id: string
          tip: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          tip: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          tip?: string
        }
        Relationships: []
      }
      herbal_article_audit: {
        Row: {
          action: string
          admin_id: string | null
          article_id: string | null
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          article_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          article_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      herbal_articles: {
        Row: {
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          is_approved: boolean | null
          is_published: boolean | null
          practitioner_id: string
          title: string
          updated_at: string
          views: number | null
        }
        Insert: {
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          is_published?: boolean | null
          practitioner_id: string
          title: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          is_published?: boolean | null
          practitioner_id?: string
          title?: string
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      herbal_consultations: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          practitioner_id: string
          scheduled_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          practitioner_id: string
          scheduled_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          practitioner_id?: string
          scheduled_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      herbal_messages: {
        Row: {
          consultation_id: string | null
          content: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          consultation_id?: string | null
          content: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          consultation_id?: string | null
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "herbal_messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "herbal_consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      herbal_practitioners: {
        Row: {
          address: string | null
          bio: string | null
          business_name: string | null
          created_at: string
          email: string | null
          id: string
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          rating: number | null
          specialization: string | null
          total_reviews: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          bio?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          rating?: number | null
          specialization?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          bio?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          rating?: number | null
          specialization?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      herbal_remedies: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          id: string
          image_url: string | null
          ingredients: string[] | null
          is_approved: boolean | null
          name: string
          practitioner_id: string
          price: number | null
          stock: number | null
          updated_at: string
          usage_instructions: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          is_approved?: boolean | null
          name: string
          practitioner_id: string
          price?: number | null
          stock?: number | null
          updated_at?: string
          usage_instructions?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          is_approved?: boolean | null
          name?: string
          practitioner_id?: string
          price?: number | null
          stock?: number | null
          updated_at?: string
          usage_instructions?: string | null
        }
        Relationships: []
      }
      herbal_remedy_audit: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          reason: string | null
          remedy_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          remedy_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          remedy_id?: string | null
        }
        Relationships: []
      }
      home_visit_requests: {
        Row: {
          address: string | null
          appointment_id: string | null
          created_at: string
          doctor_id: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          patient_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          appointment_id?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          patient_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          appointment_id?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          patient_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      home_visit_reviews: {
        Row: {
          comment: string | null
          created_at: string
          doctor_id: string
          home_visit_request_id: string | null
          id: string
          patient_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          doctor_id: string
          home_visit_request_id?: string | null
          id?: string
          patient_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          doctor_id?: string
          home_visit_request_id?: string | null
          id?: string
          patient_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "home_visit_reviews_home_visit_request_id_fkey"
            columns: ["home_visit_request_id"]
            isOneToOne: false
            referencedRelation: "home_visit_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_registrations: {
        Row: {
          address: string | null
          admin_notes: string | null
          city: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          email: string
          hospital_name: string
          id: string
          phone: string | null
          registration_number: string | null
          state: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email: string
          hospital_name: string
          id?: string
          phone?: string | null
          registration_number?: string | null
          state?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string
          hospital_name?: string
          id?: string
          phone?: string | null
          registration_number?: string | null
          state?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      hydration_slots: {
        Row: {
          created_at: string
          id: string
          log_date: string
          ml: number
          scheduled_at: string
          slot_index: number
          status: string
          taken_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          ml?: number
          scheduled_at: string
          slot_index: number
          status?: string
          taken_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          ml?: number
          scheduled_at?: string
          slot_index?: number
          status?: string
          taken_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medication_doses: {
        Row: {
          created_at: string
          dosage: string | null
          dose_change: number
          drug_name: string
          id: string
          notes: string | null
          reminder_id: string | null
          scheduled_at: string
          status: string
          taken_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          dose_change?: number
          drug_name: string
          id?: string
          notes?: string | null
          reminder_id?: string | null
          scheduled_at: string
          status?: string
          taken_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dosage?: string | null
          dose_change?: number
          drug_name?: string
          id?: string
          notes?: string | null
          reminder_id?: string | null
          scheduled_at?: string
          status?: string
          taken_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_doses_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "drug_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      meditation_sessions: {
        Row: {
          actual_minutes: number | null
          completed: boolean
          created_at: string
          ended_at: string | null
          id: string
          planned_minutes: number
          points_change: number
          sound_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          actual_minutes?: number | null
          completed?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          planned_minutes: number
          points_change?: number
          sound_id?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          actual_minutes?: number | null
          completed?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          planned_minutes?: number
          points_change?: number
          sound_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          appointment_id: string | null
          content: string
          created_at: string
          id: string
          read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          appointment_id?: string | null
          content: string
          created_at?: string
          id?: string
          read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          appointment_id?: string | null
          content?: string
          created_at?: string
          id?: string
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          items: Json
          payment_reference: string | null
          shipping_address: Json | null
          status: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          items: Json
          payment_reference?: string | null
          shipping_address?: Json | null
          status?: string | null
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          items?: Json
          payment_reference?: string | null
          shipping_address?: Json | null
          status?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_prescriptions: {
        Row: {
          created_at: string
          doctor_id: string
          dosage: string | null
          drug_name: string
          duration: string | null
          frequency: string | null
          id: string
          patient_id: string
          prescription_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          doctor_id: string
          dosage?: string | null
          drug_name: string
          duration?: string | null
          frequency?: string | null
          id?: string
          patient_id: string
          prescription_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          doctor_id?: string
          dosage?: string | null
          drug_name?: string
          duration?: string | null
          frequency?: string | null
          id?: string
          patient_id?: string
          prescription_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          notes: string | null
          patient_id: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          notes?: string | null
          patient_id: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
        }
        Relationships: []
      }
      pending_drug_approvals: {
        Row: {
          created_at: string
          doctor_id: string
          dosage: string | null
          drug_name: string
          id: string
          patient_id: string
          reason: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          doctor_id: string
          dosage?: string | null
          drug_name: string
          id?: string
          patient_id: string
          reason?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          doctor_id?: string
          dosage?: string | null
          drug_name?: string
          id?: string
          patient_id?: string
          reason?: string | null
          status?: string | null
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          appointment_id: string | null
          created_at: string
          doctor_id: string
          dosage: string | null
          duration: string | null
          frequency: string | null
          id: string
          instructions: string | null
          medication: string
          patient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          doctor_id: string
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medication: string
          patient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          doctor_id?: string
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medication?: string
          patient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      prescriptions_v2: {
        Row: {
          appointment_id: string | null
          created_at: string
          diagnosis: string | null
          doctor_id: string
          id: string
          medications: Json
          notes: string | null
          patient_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          id?: string
          medications?: Json
          notes?: string | null
          patient_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          id?: string
          medications?: Json
          notes?: string | null
          patient_id?: string
          status?: string | null
          updated_at?: string
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
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          is_legacy: boolean | null
          last_name: string | null
          location_country: string | null
          location_state: string | null
          onboarding_completed: boolean | null
          phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          dashboard_tour_completed?: boolean | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          is_legacy?: boolean | null
          last_name?: string | null
          location_country?: string | null
          location_state?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          dashboard_tour_completed?: boolean | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          is_legacy?: boolean | null
          last_name?: string | null
          location_country?: string | null
          location_state?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          endpoint: string
          id: string
          p256dh: string | null
          user_id: string
        }
        Insert: {
          auth?: string | null
          created_at?: string
          endpoint: string
          id?: string
          p256dh?: string | null
          user_id: string
        }
        Update: {
          auth?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recent_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          title: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          title?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      registration_codes: {
        Row: {
          appointment_id: string | null
          code: string
          created_at: string
          facility_id: string | null
          id: string
          patient_id: string
          status: string
          verified_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          code: string
          created_at?: string
          facility_id?: string | null
          id?: string
          patient_id: string
          status?: string
          verified_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          code?: string
          created_at?: string
          facility_id?: string | null
          id?: string
          patient_id?: string
          status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_codes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_cart: {
        Row: {
          created_at: string
          id: string
          quantity: number
          remedy_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quantity?: number
          remedy_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quantity?: number
          remedy_id?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          expires_at: string | null
          id: string
          payment_reference: string | null
          plan: string
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          expires_at?: string | null
          id?: string
          payment_reference?: string | null
          plan?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          expires_at?: string | null
          id?: string
          payment_reference?: string | null
          plan?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      symptoms: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          badge_description: string
          badge_name: string
          badge_type: string
          date_awarded: string
          id: string
          user_id: string
        }
        Insert: {
          badge_description: string
          badge_name: string
          badge_type: string
          date_awarded?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_description?: string
          badge_name?: string
          badge_type?: string
          date_awarded?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_assessments: {
        Row: {
          answers: Json | null
          assessment_type: string
          created_at: string
          id: string
          score: number | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          assessment_type: string
          created_at?: string
          id?: string
          score?: number | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          assessment_type?: string
          created_at?: string
          id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_challenges: {
        Row: {
          challenge_name: string
          challenge_type: string
          completed_at: string | null
          created_at: string
          id: string
          progress: number | null
          started_at: string
          status: string
          target: number | null
          user_id: string
        }
        Insert: {
          challenge_name: string
          challenge_type: string
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number | null
          started_at?: string
          status?: string
          target?: number | null
          user_id: string
        }
        Update: {
          challenge_name?: string
          challenge_type?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number | null
          started_at?: string
          status?: string
          target?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_daily_checkins: {
        Row: {
          created_at: string
          date: string
          energy_level: number | null
          id: string
          mood: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          energy_level?: number | null
          id?: string
          mood?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          energy_level?: number | null
          id?: string
          mood?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_diagnosis_history: {
        Row: {
          ai_model: string | null
          confidence: number | null
          created_at: string
          diagnosis: string | null
          id: string
          metadata: Json | null
          recommendations: string[] | null
          severity: string | null
          symptoms: string[] | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          confidence?: number | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          metadata?: Json | null
          recommendations?: string[] | null
          severity?: string | null
          symptoms?: string[] | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          confidence?: number | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          metadata?: Json | null
          recommendations?: string[] | null
          severity?: string | null
          symptoms?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      user_encryption_keys: {
        Row: {
          created_at: string
          encrypted_private_key: string
          id: string
          public_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_private_key: string
          id?: string
          public_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_private_key?: string
          id?: string
          public_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_history: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_hydration_log: {
        Row: {
          created_at: string
          date: string
          glasses_drank: number
          goal: number
          goal_liters: number
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          glasses_drank?: number
          goal?: number
          goal_liters?: number
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          glasses_drank?: number
          goal?: number
          goal_liters?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_mindfulness_log: {
        Row: {
          created_at: string
          date: string
          id: string
          minutes_practiced: number | null
          session_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          minutes_practiced?: number | null
          session_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          minutes_practiced?: number | null
          session_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          id: string
          level: number
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          level?: number
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          level?: number
          points?: number
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
      user_routes: {
        Row: {
          activity_type: string
          avg_pace_min_per_km: number | null
          calories_burned: number | null
          created_at: string
          duration_minutes: number
          end_time: string | null
          id: string
          route_points: Json | null
          start_time: string
          total_distance_km: number
          user_id: string
        }
        Insert: {
          activity_type?: string
          avg_pace_min_per_km?: number | null
          calories_burned?: number | null
          created_at?: string
          duration_minutes?: number
          end_time?: string | null
          id?: string
          route_points?: Json | null
          start_time?: string
          total_distance_km?: number
          user_id: string
        }
        Update: {
          activity_type?: string
          avg_pace_min_per_km?: number | null
          calories_burned?: number | null
          created_at?: string
          duration_minutes?: number
          end_time?: string | null
          id?: string
          route_points?: Json | null
          start_time?: string
          total_distance_km?: number
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          id: string
          session_data: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_data?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_data?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sleep_log: {
        Row: {
          created_at: string
          date: string
          hours_slept: number | null
          id: string
          quality: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          hours_slept?: number | null
          id?: string
          quality?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          hours_slept?: number | null
          id?: string
          quality?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_steps: {
        Row: {
          created_at: string
          date: string
          goal: number
          goal_reached: boolean
          id: string
          step_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          goal?: number
          goal_reached?: boolean
          id?: string
          step_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          goal?: number
          goal_reached?: boolean
          id?: string
          step_count?: number
          user_id?: string
        }
        Relationships: []
      }
      wellness_alarm_queue: {
        Row: {
          body: string
          created_at: string
          fire_at: string
          fired: boolean
          id: string
          kind: string
          ref_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          fire_at: string
          fired?: boolean
          id?: string
          kind: string
          ref_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          fire_at?: string
          fired?: boolean
          id?: string
          kind?: string
          ref_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      wellness_check_results: {
        Row: {
          check_type: string
          created_at: string
          id: string
          results: Json | null
          score: number | null
          user_id: string
        }
        Insert: {
          check_type: string
          created_at?: string
          id?: string
          results?: Json | null
          score?: number | null
          user_id: string
        }
        Update: {
          check_type?: string
          created_at?: string
          id?: string
          results?: Json | null
          score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      wellness_eod_summary: {
        Row: {
          created_at: string
          email_sent: boolean
          id: string
          in_app_sent: boolean
          meditation_minutes: number
          meds_missed: number
          meds_taken: number
          points_earned: number
          points_lost: number
          sleep_hours: number
          steps: number
          summary_date: string
          total_score: number
          user_id: string
          water_missed: number
          water_taken: number
        }
        Insert: {
          created_at?: string
          email_sent?: boolean
          id?: string
          in_app_sent?: boolean
          meditation_minutes?: number
          meds_missed?: number
          meds_taken?: number
          points_earned?: number
          points_lost?: number
          sleep_hours?: number
          steps?: number
          summary_date?: string
          total_score?: number
          user_id: string
          water_missed?: number
          water_taken?: number
        }
        Update: {
          created_at?: string
          email_sent?: boolean
          id?: string
          in_app_sent?: boolean
          meditation_minutes?: number
          meds_missed?: number
          meds_taken?: number
          points_earned?: number
          points_lost?: number
          sleep_hours?: number
          steps?: number
          summary_date?: string
          total_score?: number
          user_id?: string
          water_missed?: number
          water_taken?: number
        }
        Relationships: []
      }
      wellness_logs: {
        Row: {
          created_at: string
          drugs_taken: number
          id: string
          log_date: string
          sleep_hours: number
          steps: number
          updated_at: string
          user_id: string
          water_glasses: number
        }
        Insert: {
          created_at?: string
          drugs_taken?: number
          id?: string
          log_date?: string
          sleep_hours?: number
          steps?: number
          updated_at?: string
          user_id: string
          water_glasses?: number
        }
        Update: {
          created_at?: string
          drugs_taken?: number
          id?: string
          log_date?: string
          sleep_hours?: number
          steps?: number
          updated_at?: string
          user_id?: string
          water_glasses?: number
        }
        Relationships: []
      }
      wellness_rewards: {
        Row: {
          created_at: string
          credit_amount: number | null
          description: string | null
          id: string
          is_redeemed: boolean
          redeemed_at: string | null
          reward_key: string
          reward_type: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_amount?: number | null
          description?: string | null
          id?: string
          is_redeemed?: boolean
          redeemed_at?: string | null
          reward_key: string
          reward_type: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit_amount?: number | null
          description?: string | null
          id?: string
          is_redeemed?: boolean
          redeemed_at?: string | null
          reward_key?: string
          reward_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      wellness_streaks: {
        Row: {
          current_streak: number
          last_activity_date: string | null
          longest_streak: number
          total_active_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_activity_date?: string | null
          longest_streak?: number
          total_active_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_activity_date?: string | null
          longest_streak?: number
          total_active_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_eod_summary: {
        Args: { _date?: string; _user_id: string }
        Returns: {
          created_at: string
          email_sent: boolean
          id: string
          in_app_sent: boolean
          meditation_minutes: number
          meds_missed: number
          meds_taken: number
          points_earned: number
          points_lost: number
          sleep_hours: number
          steps: number
          summary_date: string
          total_score: number
          user_id: string
          water_missed: number
          water_taken: number
        }
        SetofOptions: {
          from: "*"
          to: "wellness_eod_summary"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_registration_code: { Args: { _code: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      verify_registration_code: {
        Args: { _code: string }
        Returns: {
          appointment_id: string
          code: string
          created_at: string
          facility_id: string
          facility_name: string
          id: string
          patient_country: string
          patient_dob: string
          patient_email: string
          patient_first_name: string
          patient_gender: string
          patient_id: string
          patient_last_name: string
          patient_phone: string
          status: string
          verified_at: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
