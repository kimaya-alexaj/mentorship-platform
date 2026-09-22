import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Landing point for the confirmation link Supabase emails on sign-up
// (see the emailRedirectTo option in src/app/signup/actions.ts). Only
// reached when email confirmation is required/enabled; local dev has it
// disabled, so sign-up there gets a session immediately instead.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      redirect("/profile");
    }
  }

  redirect("/login?error=confirmation-failed");
}
