import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestForm } from "./request-form";

export default async function RequestPage({
  params,
}: {
  params: Promise<{ mentorId: string }>;
}) {
  const { mentorId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: mentor }, { data: mentorSkillRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", mentorId).single(),
    supabase.from("mentor_skills").select("skill_id").eq("mentor_id", mentorId),
  ]);

  if (!mentor || !mentor.is_mentor) notFound();

  const skillIds = (mentorSkillRows ?? []).map((r) => r.skill_id);
  const { data: skills } =
    skillIds.length > 0
      ? await supabase.from("skills").select("*").in("id", skillIds)
      : { data: [] };

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Message {mentor.display_name}</h1>
        <p className="text-muted-foreground">
          They&apos;ll see your message and can accept or decline.
        </p>
      </div>

      <RequestForm mentorId={mentorId} skills={skills ?? []} />
    </div>
  );
}
