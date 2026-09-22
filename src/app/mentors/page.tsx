import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasAnyOverlap } from "@/lib/availability-overlap";
import { utcWeeklySlotToLocal, DAY_LABELS } from "@/lib/timezone";
import { SearchFilters } from "./search-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export default async function MentorsPage({
  searchParams,
}: {
  searchParams: Promise<{ skillId?: string; language?: string; overlapOnly?: string }>;
}) {
  const { skillId, language, overlapOnly } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: categories }, { data: skills }, { data: myAvailability }] =
    await Promise.all([
      supabase.from("skill_categories").select("*").order("name"),
      supabase.from("skills").select("*").order("name"),
      supabase.from("availability").select("*").eq("profile_id", user.id),
    ]);

  const { data: mentorsRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_mentor", true)
    .neq("id", user.id);
  let mentors = mentorsRaw ?? [];

  // Filtered in JS rather than with .contains() at the query level:
  // .contains() is an exact-match array operator, and doing it there
  // first would drop e.g. a mentor who entered "Spanish" before this
  // case-insensitive check ever ran.
  if (language?.trim()) {
    const needle = language.trim().toLowerCase();
    mentors = mentors.filter((m) =>
      m.languages.some((l) => l.toLowerCase() === needle)
    );
  }

  if (skillId && skillId !== "any") {
    const { data: skillMatches } = await supabase
      .from("mentor_skills")
      .select("mentor_id")
      .eq("skill_id", skillId);
    const mentorIdsWithSkill = new Set((skillMatches ?? []).map((s) => s.mentor_id));
    mentors = mentors.filter((m) => mentorIdsWithSkill.has(m.id));
  }

  const mentorIds = mentors.map((m) => m.id);
  const [{ data: allMentorSkills }, { data: allMentorAvailability }] =
    await Promise.all([
      mentorIds.length > 0
        ? supabase.from("mentor_skills").select("mentor_id, skill_id").in("mentor_id", mentorIds)
        : Promise.resolve({ data: [] }),
      mentorIds.length > 0
        ? supabase.from("availability").select("*").in("profile_id", mentorIds)
        : Promise.resolve({ data: [] }),
    ]);

  const skillsById = new Map((skills ?? []).map((s) => [s.id, s]));
  const skillsByMentor = new Map<string, string[]>();
  for (const row of allMentorSkills ?? []) {
    const list = skillsByMentor.get(row.mentor_id) ?? [];
    const skill = skillsById.get(row.skill_id);
    if (skill) list.push(skill.name);
    skillsByMentor.set(row.mentor_id, list);
  }

  const availabilityByMentor = new Map<string, typeof allMentorAvailability>();
  for (const slot of allMentorAvailability ?? []) {
    const list = availabilityByMentor.get(slot.profile_id) ?? [];
    list.push(slot);
    availabilityByMentor.set(slot.profile_id, list);
  }

  if (overlapOnly === "on") {
    mentors = mentors.filter((m) =>
      hasAnyOverlap(myAvailability ?? [], availabilityByMentor.get(m.id) ?? [])
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Find a mentor</h1>
        <p className="text-muted-foreground">
          Filter by skill, language, or availability that overlaps with yours.
        </p>
      </div>

      <SearchFilters
        categories={categories ?? []}
        skills={skills ?? []}
        canFilterByOverlap={(myAvailability ?? []).length > 0}
        selected={{ skillId, language, overlapOnly }}
      />

      {mentors.length === 0 ? (
        <p className="text-muted-foreground">No mentors match those filters yet.</p>
      ) : (
        <ul className="space-y-4">
          {mentors.map((mentor) => {
            const localSlots = (availabilityByMentor.get(mentor.id) ?? [])
              .map((slot) =>
                utcWeeklySlotToLocal(
                  { dayOfWeek: slot.day_of_week, time: slot.start_time_utc.slice(0, 5) },
                  mentor.timezone
                )
              )
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

            return (
              <li key={mentor.id}>
                <Card>
                  <CardHeader>
                    <CardTitle>{mentor.display_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {mentor.bio && (
                      <p className="text-sm text-muted-foreground">{mentor.bio}</p>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {(skillsByMentor.get(mentor.id) ?? []).map((name) => (
                        <Badge key={name} variant="secondary">
                          {name}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {mentor.languages.length > 0
                        ? `Speaks ${mentor.languages.join(", ")} · `
                        : ""}
                      {mentor.timezone}
                      {localSlots.length > 0 &&
                        ` · Free ${localSlots
                          .map((s) => DAY_LABELS[s.dayOfWeek])
                          .join(", ")}`}
                    </p>

                    <Link
                      href={`/mentors/${mentor.id}/request`}
                      className={buttonVariants({ size: "sm" })}
                    >
                      Send a request
                    </Link>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
