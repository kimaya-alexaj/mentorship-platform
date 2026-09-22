// Hand-maintained mirror of supabase/migrations. Update this whenever a
// migration changes the schema. If you have Docker + the Supabase CLI,
// prefer generating it instead and diffing:
//   supabase gen types typescript --local > src/lib/types/database.ts
//
// Every table needs a `Relationships` array (even if empty, since this
// app never uses PostgREST's embedded-resource selects) and Row/Insert/
// Update must each be `Record<string, unknown>`-compatible -- that's
// exactly what postgrest-js's GenericTable constraint requires, and
// deviating (e.g. `Update: never`) makes every query against that table
// silently resolve to `never` instead of a type error.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RequestStatus = "pending" | "accepted" | "declined" | "cancelled";
export type MatchStatus = "active" | "ended";
export type ReportStatus = "open" | "reviewed" | "resolved" | "dismissed";

// Shorthand for tables with no client-writable columns at all.
type NoWrite = Record<string, never>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          bio: string | null;
          avatar_url: string | null;
          is_mentor: boolean;
          is_mentee: boolean;
          timezone: string;
          languages: string[];
          is_adult_confirmed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          bio?: string | null;
          avatar_url?: string | null;
          is_mentor?: boolean;
          is_mentee?: boolean;
          timezone?: string;
          languages?: string[];
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["profiles"]["Insert"], "id">
        >;
        Relationships: [];
      };
      profile_contacts: {
        Row: {
          profile_id: string;
          contact_email: string;
          updated_at: string;
        };
        Insert: { profile_id: string; contact_email: string };
        Update: { contact_email?: string };
        Relationships: [];
      };
      admin_users: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string };
        Update: NoWrite;
        Relationships: [];
      };
      skill_categories: {
        Row: { id: string; name: string; slug: string; created_at: string };
        Insert: NoWrite;
        Update: NoWrite;
        Relationships: [];
      };
      skills: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          slug: string;
          synonyms: string[];
          created_at: string;
        };
        Insert: NoWrite;
        Update: NoWrite;
        Relationships: [];
      };
      mentor_skills: {
        Row: {
          id: string;
          mentor_id: string;
          skill_id: string;
          created_at: string;
        };
        Insert: { mentor_id: string; skill_id: string };
        Update: NoWrite;
        Relationships: [];
      };
      mentee_interests: {
        Row: {
          id: string;
          mentee_id: string;
          skill_id: string;
          created_at: string;
        };
        Insert: { mentee_id: string; skill_id: string };
        Update: NoWrite;
        Relationships: [];
      };
      availability: {
        Row: {
          id: string;
          profile_id: string;
          day_of_week: number;
          start_time_utc: string;
          end_time_utc: string;
          created_at: string;
        };
        Insert: {
          profile_id: string;
          day_of_week: number;
          start_time_utc: string;
          end_time_utc: string;
        };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["availability"]["Insert"],
            "profile_id"
          >
        >;
        Relationships: [];
      };
      requests: {
        Row: {
          id: string;
          mentee_id: string;
          mentor_id: string;
          skill_id: string | null;
          message: string;
          status: RequestStatus;
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          mentee_id: string;
          mentor_id: string;
          skill_id?: string | null;
          message: string;
          status?: RequestStatus;
        };
        Update: { status?: RequestStatus };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          request_id: string;
          mentor_id: string;
          mentee_id: string;
          status: MatchStatus;
          created_at: string;
          ended_at: string | null;
        };
        Insert: NoWrite;
        Update: { status?: MatchStatus };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string | null;
          match_id: string | null;
          reason: string;
          details: string | null;
          status: ReportStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          reporter_id: string;
          reported_user_id?: string | null;
          match_id?: string | null;
          reason: string;
          details?: string | null;
        };
        Update: {
          status?: ReportStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: { uid: string };
        Returns: boolean;
      };
      has_accepted_match: {
        Args: { a: string; b: string };
        Returns: boolean;
      };
    };
    Enums: {
      request_status: RequestStatus;
      match_status: MatchStatus;
      report_status: ReportStatus;
    };
  };
}
