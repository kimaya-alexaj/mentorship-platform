import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Service-role client: bypasses RLS entirely. Only import this from
// server-side admin code that has already checked the caller is an admin
// (see src/lib/auth/require-admin.ts). Never send this client, or data
// fetched with it, to a Client Component without filtering first.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
