"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, escapeHtml } from "@/lib/email";
import type { RequestStatus } from "@/lib/types/database";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Only ever called from a button the UI shows solely to the mentor on a
// pending request they received, but the real authorization boundary is
// the requests_update_participant RLS policy plus the
// enforce_request_transition trigger (supabase/migrations) -- a stray
// request to accept/decline someone else's row fails there, not here.
export async function respondToRequest(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as Extract<
    RequestStatus,
    "accepted" | "declined"
  >;

  const { supabase, user } = await requireUser();

  const { data: updated, error } = await supabase
    .from("requests")
    .update({ status })
    .eq("id", id)
    .select("mentee_id, mentor_id, message")
    .single();

  if (error) {
    console.error("[requests] respond failed", error.message);
    return;
  }

  const admin = createAdminClient();
  const [{ data: menteeContact }, { data: mentorProfile }] = await Promise.all([
    admin
      .from("profile_contacts")
      .select("contact_email")
      .eq("profile_id", updated.mentee_id)
      .single(),
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
  ]);

  if (menteeContact) {
    const mentorName = mentorProfile?.display_name ?? "The mentor";
    const accepted = status === "accepted";
    await sendEmail({
      to: menteeContact.contact_email,
      subject: accepted
        ? `${mentorName} accepted your request`
        : `${mentorName} declined your request`,
      html: accepted
        ? `<p>${escapeHtml(mentorName)} accepted your mentoring request. You can now see each other's contact email on the platform.</p>
           <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/requests">View on the platform</a></p>`
        : `<p>${escapeHtml(mentorName)} wasn't able to take this on right now. Feel free to look for another mentor.</p>
           <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/mentors">Find another mentor</a></p>`,
    });
  }

  revalidatePath("/requests");
}

// Only shown to the mentee on their own pending request; enforced for
// real by the same RLS policy/trigger pair noted above.
export async function cancelRequest(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("requests")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) console.error("[requests] cancel failed", error.message);

  revalidatePath("/requests");
}
