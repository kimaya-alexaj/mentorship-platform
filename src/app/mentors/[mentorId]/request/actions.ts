"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, escapeHtml } from "@/lib/email";

const schema = z.object({
  message: z.string().trim().min(1, "Write a short message.").max(2000),
  skillId: z.string().optional(),
});

export type SendRequestState = { error?: string };

export async function sendRequest(
  mentorId: string,
  _prev: SendRequestState,
  formData: FormData
): Promise<SendRequestState> {
  const parsed = schema.safeParse({
    message: formData.get("message"),
    skillId: formData.get("skillId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("requests").insert({
    mentee_id: user.id,
    mentor_id: mentorId,
    skill_id: parsed.data.skillId,
    message: parsed.data.message,
  });

  if (error) {
    // RLS/insert-policy failures land here too (e.g. the viewer hasn't
    // turned on "mentee" for themselves) -- surfaced as a normal form
    // error rather than a crash.
    return { error: error.message };
  }

  // Notify the mentor by email. Uses the service-role client to read a
  // contact address RLS would otherwise hide from this mentee (no match
  // exists yet) -- legitimate here because it's the platform's own
  // transactional email and the address is never returned to the client.
  const admin = createAdminClient();
  const [{ data: mentorContact }, { data: menteeProfile }] = await Promise.all([
    admin
      .from("profile_contacts")
      .select("contact_email")
      .eq("profile_id", mentorId)
      .single(),
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
  ]);

  if (mentorContact) {
    const menteeName = menteeProfile?.display_name ?? "A mentee";
    await sendEmail({
      to: mentorContact.contact_email,
      subject: `${menteeName} sent you a mentoring request`,
      html: `
        <p>${escapeHtml(menteeName)} sent you a mentoring request:</p>
        <blockquote>${escapeHtml(parsed.data.message)}</blockquote>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/requests">View and respond</a></p>
      `,
    });
  }

  revalidatePath("/requests");
  redirect("/requests");
}
