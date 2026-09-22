import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listTimezones, utcWeeklySlotToLocal, DAY_LABELS } from "@/lib/timezone";
import { ProfileDetailsForm } from "./profile-details-form";
import { SkillsPicker } from "./skills-picker";
import { AvailabilitySection } from "./availability-section";
import { Separator } from "@/components/ui/separator";
import { updateMentorSkills, updateMenteeInterests } from "./actions";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: contact },
    { data: categories },
    { data: skills },
    { data: mentorSkills },
    { data: menteeInterests },
    { data: availability },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("profile_contacts")
      .select("contact_email")
      .eq("profile_id", user.id)
      .single(),
    supabase.from("skill_categories").select("*").order("name"),
    supabase.from("skills").select("*").order("name"),
    supabase.from("mentor_skills").select("skill_id").eq("mentor_id", user.id),
    supabase.from("mentee_interests").select("skill_id").eq("mentee_id", user.id),
    supabase
      .from("availability")
      .select("*")
      .eq("profile_id", user.id)
      .order("day_of_week"),
  ]);

  if (!profile) redirect("/login");

  const localSlots = (availability ?? [])
    .map((slot) => {
      const start = utcWeeklySlotToLocal(
        { dayOfWeek: slot.day_of_week, time: slot.start_time_utc.slice(0, 5) },
        profile.timezone
      );
      const end = utcWeeklySlotToLocal(
        { dayOfWeek: slot.day_of_week, time: slot.end_time_utc.slice(0, 5) },
        profile.timezone
      );
      return {
        id: slot.id,
        dayOfWeek: start.dayOfWeek,
        dayLabel: DAY_LABELS[start.dayOfWeek],
        startTime: start.time,
        endTime: end.time,
      };
    })
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Your profile</h1>
        <p className="text-muted-foreground">
          This is what other members see, plus your private contact details.
        </p>
      </div>

      {/* Keyed on updated_at so a save (which revalidates this page but
          keeps the same component instance) forces a remount -- Base
          UI's Checkbox/Select are uncontrolled, so a defaultChecked/
          defaultValue prop change on an already-mounted instance is a
          no-op and would otherwise leave the form showing stale values
          while silently submitting whatever was on screen before. */}
      <ProfileDetailsForm
        key={profile.updated_at}
        profile={profile}
        contactEmail={contact?.contact_email ?? ""}
        timezones={listTimezones()}
      />

      <Separator />

      {profile.is_mentor && (
        <SkillsPicker
          // Same remount-on-change reasoning as ProfileDetailsForm above,
          // keyed on the actual selection so a save re-syncs the checked
          // state shown here with what's really in mentor_skills.
          key={"mentor:" + (mentorSkills ?? []).map((s) => s.skill_id).sort().join(",")}
          title="Skills you can mentor in"
          description="Shown on your public profile and used for mentor search."
          categories={categories ?? []}
          skills={skills ?? []}
          selectedSkillIds={(mentorSkills ?? []).map((s) => s.skill_id)}
          formAction={updateMentorSkills}
        />
      )}

      {profile.is_mentee && (
        <SkillsPicker
          key={"mentee:" + (menteeInterests ?? []).map((s) => s.skill_id).sort().join(",")}
          title="What you'd like mentoring in"
          description="Private — only you and admins can see this."
          categories={categories ?? []}
          skills={skills ?? []}
          selectedSkillIds={(menteeInterests ?? []).map((s) => s.skill_id)}
          formAction={updateMenteeInterests}
        />
      )}

      <Separator />

      <AvailabilitySection slots={localSlots} timezone={profile.timezone} />
    </div>
  );
}
