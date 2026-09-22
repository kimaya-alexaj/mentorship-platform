"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/auth/schemas";

export type SignupState = {
  errors?: Partial<Record<"displayName" | "email" | "password" | "isAdult" | "form", string>>;
  // Redisplayed on error so a failed submission doesn't force the user to
  // retype everything. Deliberately excludes the password.
  values?: { displayName: string; email: string };
  emailSentTo?: string;
};

export async function signup(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const rawDisplayName = String(formData.get("displayName") ?? "");
  const rawEmail = String(formData.get("email") ?? "");
  const values = { displayName: rawDisplayName, email: rawEmail };

  const parsed = signupSchema.safeParse({
    displayName: rawDisplayName,
    email: rawEmail,
    password: formData.get("password"),
    isAdult: formData.get("isAdult") === "on",
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      values,
      errors: {
        displayName: fieldErrors.displayName?.[0],
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
        isAdult: fieldErrors.isAdult?.[0],
      },
    };
  }

  const { displayName, email, password } = parsed.data;
  const supabase = await createClient();

  // is_adult / display_name land in raw_user_meta_data, which the
  // handle_new_user() database trigger reads to create the profile — and
  // to refuse the sign-up outright if is_adult isn't true.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { is_adult: true, display_name: displayName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  });

  if (error) {
    return { values, errors: { form: error.message } };
  }

  // Local dev has email confirmation disabled, so a session comes back
  // immediately; a real deployment normally requires clicking the
  // confirmation email first.
  if (data.session) {
    redirect("/profile");
  }

  return { emailSentTo: email };
}
