// Hand-maintained mirror of supabase/migrations. Regenerate/update this
// whenever a migration changes the schema. If you have Docker + the
// Supabase CLI, prefer generating it instead:
//   supabase gen types typescript --local > src/lib/types/database.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
