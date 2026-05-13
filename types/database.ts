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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_links: {
        Row: {
          consultant_user_id: string
          created_at: string
          investor_id: string
          is_active: boolean
        }
        Insert: {
          consultant_user_id: string
          created_at?: string
          investor_id: string
          is_active?: boolean
        }
        Update: {
          consultant_user_id?: string
          created_at?: string
          investor_id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "consultant_links_consultant_user_id_fkey"
            columns: ["consultant_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultant_links_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      institutional_entities: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          display_name: string
          entity_type: string
          id: string
          legal_name: string | null
          notes: string | null
          organization_id: string
          status: string
          tax_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          display_name: string
          entity_type: string
          id?: string
          legal_name?: string | null
          notes?: string | null
          organization_id: string
          status?: string
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string
          entity_type?: string
          id?: string
          legal_name?: string | null
          notes?: string | null
          organization_id?: string
          status?: string
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institutional_entities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      institutional_entity_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          email: string
          entity_id: string
          expires_at: string
          id: string
          organization_id: string
          revoked_at: string | null
          role: string
          status: string
          token: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          entity_id: string
          expires_at: string
          id?: string
          organization_id: string
          revoked_at?: string | null
          role: string
          status?: string
          token?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          entity_id?: string
          expires_at?: string
          id?: string
          organization_id?: string
          revoked_at?: string | null
          role?: string
          status?: string
          token?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institutional_entity_invites_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "institutional_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutional_entity_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      institutional_entity_memberships: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          id: string
          role: string
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          id?: string
          role: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutional_entity_memberships_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "institutional_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_memberships: {
        Row: {
          created_at: string
          investor_id: string
          role: Database["public"]["Enums"]["investor_member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          investor_id: string
          role?: Database["public"]["Enums"]["investor_member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          investor_id?: string
          role?: Database["public"]["Enums"]["investor_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_memberships_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          created_at: string
          document: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          document?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          document?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      organization_documents: {
        Row: {
          created_at: string
          doc_name: string
          doc_type_code: string
          file_path: string | null
          id: string
          is_sent: boolean
          organization_id: string
          sent_at: string | null
          updated_at: string
          uploaded_by: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          doc_name: string
          doc_type_code: string
          file_path?: string | null
          id?: string
          is_sent?: boolean
          organization_id: string
          sent_at?: string | null
          updated_at?: string
          uploaded_by?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          doc_name?: string
          doc_type_code?: string
          file_path?: string | null
          id?: string
          is_sent?: boolean
          organization_id?: string
          sent_at?: string | null
          updated_at?: string
          uploaded_by?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_investor_links: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          expires_at: string | null
          id: string
          investor_id: string
          org_name: string | null
          organization_id: string | null
          status: string
          token: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          investor_id: string
          org_name?: string | null
          organization_id?: string | null
          status?: string
          token?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          investor_id?: string
          org_name?: string | null
          organization_id?: string | null
          status?: string
          token?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_investor_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["organization_member_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          email: string
          expires_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["organization_member_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_member_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          organization_id: string
          role: Database["public"]["Enums"]["organization_member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["organization_member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_questionnaire: {
        Row: {
          created_at: string
          edital_code: string | null
          edital_date: string | null
          edital_text: string | null
          filled_by_email: string | null
          filled_by_name: string | null
          filled_by_phone: string | null
          leader_email: string | null
          leader_gender: string | null
          leader_gender_other: string | null
          leader_name: string | null
          leader_phone: string | null
          leader_race: string | null
          legal_rep_criminal_declaration: string | null
          legal_rep_has_public_office: string | null
          legal_rep_political_office_details: string | null
          legal_rep_public_office_details: string | null
          legal_rep_ran_for_political_office: string | null
          organization_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          edital_code?: string | null
          edital_date?: string | null
          edital_text?: string | null
          filled_by_email?: string | null
          filled_by_name?: string | null
          filled_by_phone?: string | null
          leader_email?: string | null
          leader_gender?: string | null
          leader_gender_other?: string | null
          leader_name?: string | null
          leader_phone?: string | null
          leader_race?: string | null
          legal_rep_criminal_declaration?: string | null
          legal_rep_has_public_office?: string | null
          legal_rep_political_office_details?: string | null
          legal_rep_public_office_details?: string | null
          legal_rep_ran_for_political_office?: string | null
          organization_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          edital_code?: string | null
          edital_date?: string | null
          edital_text?: string | null
          filled_by_email?: string | null
          filled_by_name?: string | null
          filled_by_phone?: string | null
          leader_email?: string | null
          leader_gender?: string | null
          leader_gender_other?: string | null
          leader_name?: string | null
          leader_phone?: string | null
          leader_race?: string | null
          legal_rep_criminal_declaration?: string | null
          legal_rep_has_public_office?: string | null
          legal_rep_political_office_details?: string | null
          legal_rep_public_office_details?: string | null
          legal_rep_ran_for_political_office?: string | null
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_questionnaire_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_questionnaire_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          created_at: string
          document: string | null
          email: string | null
          facebook: string | null
          foundation_date: string | null
          id: string
          instagram: string | null
          legal_name: string | null
          linkedin: string | null
          logo_path: string | null
          name: string
          pix_key: string | null
          profile_other: string | null
          profile_type: string | null
          responsible_user_id: string | null
          site: string | null
          tax_id_type: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          facebook?: string | null
          foundation_date?: string | null
          id?: string
          instagram?: string | null
          legal_name?: string | null
          linkedin?: string | null
          logo_path?: string | null
          name: string
          pix_key?: string | null
          profile_other?: string | null
          profile_type?: string | null
          responsible_user_id?: string | null
          site?: string | null
          tax_id_type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          facebook?: string | null
          foundation_date?: string | null
          id?: string
          instagram?: string | null
          legal_name?: string | null
          linkedin?: string | null
          logo_path?: string | null
          name?: string
          pix_key?: string | null
          profile_other?: string | null
          profile_type?: string | null
          responsible_user_id?: string | null
          site?: string | null
          tax_id_type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      project_consultants: {
        Row: {
          active: boolean
          consultant_user_id: string
          created_at: string
          project_id: string
        }
        Insert: {
          active?: boolean
          consultant_user_id: string
          created_at?: string
          project_id: string
        }
        Update: {
          active?: boolean
          consultant_user_id?: string
          created_at?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_consultants_consultant_user_id_fkey"
            columns: ["consultant_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_consultants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          created_at: string
          created_by: string
          doc_type: string
          document_type: string | null
          file_name: string
          file_path: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          organization_id: string
          project_id: string
          size_bytes: number | null
          storage_bucket: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          doc_type: string
          document_type?: string | null
          file_name: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          project_id: string
          size_bytes?: number | null
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          doc_type?: string
          document_type?: string | null
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          project_id?: string
          size_bytes?: number | null
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_goals: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          indicator: string | null
          organization_id: string
          project_id: string
          sort_order: number
          status: string
          target_value: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          indicator?: string | null
          organization_id: string
          project_id: string
          sort_order?: number
          status?: string
          target_value?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          indicator?: string | null
          organization_id?: string
          project_id?: string
          sort_order?: number
          status?: string
          target_value?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_investors: {
        Row: {
          created_at: string
          investor_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          investor_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          investor_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_investors_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_investors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_memberships: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          goal_id: string | null
          id: string
          organization_id: string
          project_id: string
          sort_order: number
          starts_at: string | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          goal_id?: string | null
          id?: string
          organization_id: string
          project_id: string
          sort_order?: number
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          goal_id?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          sort_order?: number
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "project_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_status_transitions: {
        Row: {
          allowed_roles: string[]
          from_status: Database["public"]["Enums"]["project_status"]
          to_status: Database["public"]["Enums"]["project_status"]
        }
        Insert: {
          allowed_roles?: string[]
          from_status: Database["public"]["Enums"]["project_status"]
          to_status: Database["public"]["Enums"]["project_status"]
        }
        Update: {
          allowed_roles?: string[]
          from_status?: Database["public"]["Enums"]["project_status"]
          to_status?: Database["public"]["Enums"]["project_status"]
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          financial_data: Json
          id: string
          investor_id: string | null
          linked_entity_id: string | null
          linked_entity_name: string | null
          linked_entity_type: string | null
          metadata: Json | null
          organization_id: string
          overview_data: Json
          plan_data: Json
          project_type: Database["public"]["Enums"]["project_type"]
          rejection_reason: string | null
          resubmitted_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["project_status"]
          title: string
          type: Database["public"]["Enums"]["project_type"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          description?: string | null
          financial_data?: Json
          id?: string
          investor_id?: string | null
          linked_entity_id?: string | null
          linked_entity_name?: string | null
          linked_entity_type?: string | null
          metadata?: Json | null
          organization_id: string
          overview_data?: Json
          plan_data?: Json
          project_type: Database["public"]["Enums"]["project_type"]
          rejection_reason?: string | null
          resubmitted_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          type?: Database["public"]["Enums"]["project_type"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          financial_data?: Json
          id?: string
          investor_id?: string | null
          linked_entity_id?: string | null
          linked_entity_name?: string | null
          linked_entity_type?: string | null
          metadata?: Json | null
          organization_id?: string
          overview_data?: Json
          plan_data?: Json
          project_type?: Database["public"]["Enums"]["project_type"]
          rejection_reason?: string | null
          resubmitted_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          type?: Database["public"]["Enums"]["project_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_linked_entity_id_fkey"
            columns: ["linked_entity_id"]
            isOneToOne: false
            referencedRelation: "institutional_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_exports: {
        Row: {
          created_at: string
          created_by: string | null
          file_path: string
          generated_by: string | null
          id: string
          report_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_path: string
          generated_by?: string | null
          id?: string
          report_id: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_path?: string
          generated_by?: string | null
          id?: string
          report_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_exports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_exports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_reviews: {
        Row: {
          comment: string | null
          created_at: string
          decision: Database["public"]["Enums"]["review_decision"]
          id: string
          report_id: string
          reviewer_user_id: string
          version_number: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          decision: Database["public"]["Enums"]["review_decision"]
          id?: string
          report_id: string
          reviewer_user_id: string
          version_number: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          decision?: Database["public"]["Enums"]["review_decision"]
          id?: string
          report_id?: string
          reviewer_user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_reviews_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_reviews_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_status_transitions: {
        Row: {
          from_status: Database["public"]["Enums"]["report_status"]
          to_status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          from_status: Database["public"]["Enums"]["report_status"]
          to_status: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          from_status?: Database["public"]["Enums"]["report_status"]
          to_status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          meta: Json
          name: string
          project_type: Database["public"]["Enums"]["project_type"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          name: string
          project_type: Database["public"]["Enums"]["project_type"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          meta?: Json
          name?: string
          project_type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_versions: {
        Row: {
          created_at: string
          created_by: string
          data: Json
          id: string
          report_id: string
          status: string
          updated_at: string
          updated_by: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          report_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          report_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_versions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          approved_at: string | null
          created_at: string
          created_by: string
          current_version: number
          id: string
          period_end: string
          period_start: string
          period_type: Database["public"]["Enums"]["report_period_type"]
          project_id: string
          status: Database["public"]["Enums"]["report_status"]
          submitted_at: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          created_by?: string
          current_version?: number
          id?: string
          period_end?: string
          period_start?: string
          period_type?: Database["public"]["Enums"]["report_period_type"]
          project_id: string
          status?: Database["public"]["Enums"]["report_status"]
          submitted_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          created_by?: string
          current_version?: number
          id?: string
          period_end?: string
          period_start?: string
          period_type?: Database["public"]["Enums"]["report_period_type"]
          project_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          submitted_at?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      template_fields: {
        Row: {
          created_at: string
          field_type: string
          help_text: string | null
          id: string
          key: string
          label: string
          options: Json
          required: boolean
          section_id: string | null
          sort_order: number
          template_id: string
          validation: Json
        }
        Insert: {
          created_at?: string
          field_type: string
          help_text?: string | null
          id?: string
          key: string
          label: string
          options?: Json
          required?: boolean
          section_id?: string | null
          sort_order?: number
          template_id: string
          validation?: Json
        }
        Update: {
          created_at?: string
          field_type?: string
          help_text?: string | null
          id?: string
          key?: string
          label?: string
          options?: Json
          required?: boolean
          section_id?: string | null
          sort_order?: number
          template_id?: string
          validation?: Json
        }
        Relationships: [
          {
            foreignKeyName: "template_fields_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "template_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_fields_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "v_active_template_fields"
            referencedColumns: ["section_id"]
          },
          {
            foreignKeyName: "template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_active_template_fields"
            referencedColumns: ["template_id"]
          },
        ]
      }
      template_sections: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          template_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "v_active_template_fields"
            referencedColumns: ["template_id"]
          },
        ]
      }
    }
    Views: {
      v_active_template_fields: {
        Row: {
          field_id: string | null
          field_order: number | null
          field_type: string | null
          help_text: string | null
          key: string | null
          label: string | null
          options: Json | null
          project_type: Database["public"]["Enums"]["project_type"] | null
          required: boolean | null
          section_id: string | null
          section_order: number | null
          section_title: string | null
          template_id: string | null
          template_name: string | null
          validation: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_institutional_entity_invite: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          created_by: string | null
          entity_id: string
          id: string
          role: string
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "institutional_entity_memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      accept_org_invite: {
        Args: { p_token: string }
        Returns: {
          organization_id: string
          role: Database["public"]["Enums"]["organization_member_role"]
        }[]
      }
      can_access_report: { Args: { p_report_id: string }; Returns: boolean }
      create_institutional_entity_invite: {
        Args: {
          p_email: string
          p_entity_id: string
          p_expires_in_days?: number
          p_role?: string
        }
        Returns: {
          entity_id: string
          expires_at: string
          invite_id: string
          organization_id: string
          token: string
        }[]
      }
      create_org_invite: {
        Args: {
          p_email: string
          p_expires_in_days?: number
          p_organization_id: string
          p_role?: Database["public"]["Enums"]["organization_member_role"]
        }
        Returns: {
          expires_at: string
          invite_id: string
          token: string
        }[]
      }
      create_project_secure: {
        Args: {
          p_description?: string
          p_linked_entity_id?: string
          p_linked_entity_name?: string
          p_linked_entity_type?: string
          p_name: string
          p_organization_id: string
          p_project_type: string
        }
        Returns: {
          created_at: string
          created_by: string
          description: string | null
          financial_data: Json
          id: string
          investor_id: string | null
          linked_entity_id: string | null
          linked_entity_name: string | null
          linked_entity_type: string | null
          metadata: Json | null
          organization_id: string
          overview_data: Json
          plan_data: Json
          project_type: Database["public"]["Enums"]["project_type"]
          rejection_reason: string | null
          resubmitted_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["project_status"]
          title: string
          type: Database["public"]["Enums"]["project_type"] | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      debug_auth: { Args: never; Returns: Json }
      debug_auth_context: { Args: never; Returns: Json }
      debug_auth_uid: { Args: never; Returns: string }
      debug_jwt: { Args: never; Returns: Json }
      debug_projects_insert_check: {
        Args: { p_created_by: string; p_org_id: string }
        Returns: Json
      }
      get_active_template_id: {
        Args: { p_type: Database["public"]["Enums"]["project_type"] }
        Returns: string
      }
      is_investor_member: {
        Args: {
          inv_id: string
          required_role?: Database["public"]["Enums"]["investor_member_role"]
        }
        Returns: boolean
      }
      is_org_member: { Args: { org_id: string }; Returns: boolean }
      phi_approve_project: { Args: { project_id: string }; Returns: undefined }
      phi_can_access_project: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      phi_can_access_report: { Args: { rid: string }; Returns: boolean }
      phi_create_organization: {
        Args: { p_name: string }
        Returns: {
          id: string
        }[]
      }
      phi_debug_auth_uid: { Args: never; Returns: string }
      phi_is_consultant_linked: {
        Args: { project_id: string }
        Returns: boolean
      }
      phi_is_investor_member: { Args: { inv_id: string }; Returns: boolean }
      phi_is_org_admin: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
      phi_is_org_admin_v2: {
        Args: { p_org_id: string; p_user_id?: string }
        Returns: boolean
      }
      phi_is_org_member:
        | { Args: { org_id: string }; Returns: boolean }
        | { Args: { org_id: string; user_id: string }; Returns: boolean }
      phi_is_project_consultant: { Args: { proj_id: string }; Returns: boolean }
      phi_is_project_investor: { Args: { proj_id: string }; Returns: boolean }
      phi_is_project_org_admin: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      phi_is_valid_project_transition: {
        Args: {
          from_status: Database["public"]["Enums"]["project_status"]
          to_status: Database["public"]["Enums"]["project_status"]
        }
        Returns: boolean
      }
      phi_reject_project: {
        Args: { project_id: string; reason: string }
        Returns: undefined
      }
      phi_resubmit_project: { Args: { project_id: string }; Returns: undefined }
      phi_set_project_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["project_status"]
          p_project_id: string
          p_reason?: string
        }
        Returns: {
          created_at: string
          created_by: string
          description: string | null
          financial_data: Json
          id: string
          investor_id: string | null
          linked_entity_id: string | null
          linked_entity_name: string | null
          linked_entity_type: string | null
          metadata: Json | null
          organization_id: string
          overview_data: Json
          plan_data: Json
          project_type: Database["public"]["Enums"]["project_type"]
          rejection_reason: string | null
          resubmitted_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["project_status"]
          title: string
          type: Database["public"]["Enums"]["project_type"] | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      phi_set_report_status:
        | {
            Args: {
              p_new_status: Database["public"]["Enums"]["report_status"]
              p_report_id: string
            }
            Returns: {
              approved_at: string | null
              created_at: string
              created_by: string
              current_version: number
              id: string
              period_end: string
              period_start: string
              period_type: Database["public"]["Enums"]["report_period_type"]
              project_id: string
              status: Database["public"]["Enums"]["report_status"]
              submitted_at: string | null
              title: string | null
              updated_at: string
            }
            SetofOptions: {
              from: "*"
              to: "reports"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_reason: string
              p_report_id: string
              p_to_status: Database["public"]["Enums"]["report_status"]
            }
            Returns: undefined
          }
      phi_start_review: { Args: { project_id: string }; Returns: undefined }
      phi_storage_org_id: { Args: { path: string }; Returns: string }
      phi_submit_project: { Args: { project_id: string }; Returns: undefined }
      storage_can_access_project_document: {
        Args: { object_name: string }
        Returns: boolean
      }
      storage_extract_uuid_part: {
        Args: { idx: number; p: string }
        Returns: string
      }
    }
    Enums: {
      investor_member_role: "MASTER" | "MEMBER"
      organization_member_role: "ORG_ADMIN" | "ORG_MEMBER"
      project_status:
        | "DRAFT"
        | "ENVIADO"
        | "EM_ANALISE"
        | "APROVADO"
        | "DEVOLVIDO"
      project_type: "RECURSOS_PUBLICOS" | "RECURSOS_PROPRIOS" | "INCENTIVADO"
      report_period_type: "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL"
      report_status: "DRAFT" | "SUBMITTED" | "RETURNED" | "APPROVED"
      review_decision: "APPROVED" | "RETURNED"
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
      investor_member_role: ["MASTER", "MEMBER"],
      organization_member_role: ["ORG_ADMIN", "ORG_MEMBER"],
      project_status: [
        "DRAFT",
        "ENVIADO",
        "EM_ANALISE",
        "APROVADO",
        "DEVOLVIDO",
      ],
      project_type: ["RECURSOS_PUBLICOS", "RECURSOS_PROPRIOS", "INCENTIVADO"],
      report_period_type: ["MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"],
      report_status: ["DRAFT", "SUBMITTED", "RETURNED", "APPROVED"],
      review_decision: ["APPROVED", "RETURNED"],
    },
  },
} as const
