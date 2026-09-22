"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { localWeeklySlotToUtc } from "@/lib/timezone";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

const profileDetailsSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(2000).optional(),
  timezone: z.string().min(1),
  languages: z.string().trim().max(500).optional(),
  contactEmail: z.string().trim().email(),
  isMentor: z.boolean(),
  isMentee: z.boolean(),
});

export type ProfileDetailsState = { error?: string };

export async function updateProfileDetails(
  _prev: ProfileDetailsState,
  formData: FormData
): Promise<ProfileDetailsState> {
  const parsed = profileDetailsSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") || undefined,
    timezone: formData.get("timezone"),
    languages: formData.get("languages") || undefined,
    contactEmail: formData.get("contactEmail"),
    isMentor: formData.get("isMentor") === "on",
    isMentee: formData.get("isMentee") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (!parsed.data.isMentor && !parsed.data.isMentee) {
    return { error: "Pick at least one of Mentor or Mentee." };
  }

  const { supabase, userId } = await requireUserId();
  const languages = (parsed.data.languages ?? "")
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      bio: parsed.data.bio ?? null,
      timezone: parsed.data.timezone,
      languages,
      is_mentor: parsed.data.isMentor,
      is_mentee: parsed.data.isMentee,
    })
    .eq("id", userId);

  if (profileError) return { error: profileError.message };

  const { error: contactError } = await supabase
    .from("profile_contacts")
    .update({ contact_email: parsed.data.contactEmail })
    .eq("profile_id", userId);

  if (contactError) return { error: contactError.message };

  revalidatePath("/profile");
  return {};
}

// Both overwrite the full set of links for the current user with the
// given skill ids: simple delete-then-insert rather than diffing, which
// is fine at this scale (a handful of rows per user) and keeps the
// action easy to reason about. Kept as two concrete functions rather
// than one generic helper parameterized over the table/column name --
// postgrest-js's per-table overloads don't resolve cleanly through a
// union of table names.
export async function updateMentorSkills(formData: FormData) {
  const skillIds = formData.getAll("skillIds").map(String);
  const { supabase, userId } = await requireUserId();

  const { error: deleteError } = await supabase
    .from("mentor_skills")
    .delete()
    .eq("mentor_id", userId);
  if (deleteError) throw new Error(deleteError.message);

  if (skillIds.length > 0) {
    const { error: insertError } = await supabase
      .from("mentor_skills")
      .insert(skillIds.map((skillId) => ({ mentor_id: userId, skill_id: skillId })));
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/profile");
}

export async function updateMenteeInterests(formData: FormData) {
  const skillIds = formData.getAll("skillIds").map(String);
  const { supabase, userId } = await requireUserId();

  const { error: deleteError } = await supabase
    .from("mentee_interests")
    .delete()
    .eq("mentee_id", userId);
  if (deleteError) throw new Error(deleteError.message);

  if (skillIds.length > 0) {
    const { error: insertError } = await supabase
      .from("mentee_interests")
      .insert(skillIds.map((skillId) => ({ mentee_id: userId, skill_id: skillId })));
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/profile");
}

const availabilitySchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "End time must be after start time (slots can't span midnight).",
  });

export type AvailabilityState = { error?: string };

export async function addAvailabilitySlot(
  _prev: AvailabilityState,
  formData: FormData
): Promise<AvailabilityState> {
  const parsed = availabilitySchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { supabase, userId } = await requireUserId();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();
  if (profileError || !profile) {
    return { error: profileError?.message ?? "Could not load your timezone." };
  }

  // Converted server-side from the profile's timezone (source of truth),
  // never trusting a client-supplied UTC value directly.
  const startUtc = localWeeklySlotToUtc(
    { dayOfWeek: parsed.data.dayOfWeek, time: parsed.data.startTime },
    profile.timezone
  );
  const endUtc = localWeeklySlotToUtc(
    { dayOfWeek: parsed.data.dayOfWeek, time: parsed.data.endTime },
    profile.timezone
  );

  if (startUtc.dayOfWeek !== endUtc.dayOfWeek) {
    return {
      error:
        "This slot crosses a UTC day boundary; pick a time further from midnight in your local timezone.",
    };
  }

  const { error } = await supabase.from("availability").insert({
    profile_id: userId,
    day_of_week: startUtc.dayOfWeek,
    start_time_utc: `${startUtc.time}:00`,
    end_time_utc: `${endUtc.time}:00`,
  });

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return {};
}

export async function deleteAvailabilitySlot(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, userId } = await requireUserId();
  await supabase.from("availability").delete().eq("id", id).eq("profile_id", userId);
  revalidatePath("/profile");
}
