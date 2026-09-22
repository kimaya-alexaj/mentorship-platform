import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { respondToRequest, cancelRequest } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function RequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: requests } = await supabase
    .from("requests")
    .select("*")
    .or(`mentee_id.eq.${user.id},mentor_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const received = (requests ?? []).filter((r) => r.mentor_id === user.id);
  const sent = (requests ?? []).filter((r) => r.mentee_id === user.id);

  const otherIds = [
    ...new Set([...received.map((r) => r.mentee_id), ...sent.map((r) => r.mentor_id)]),
  ];
  const skillIds = [...new Set((requests ?? []).flatMap((r) => (r.skill_id ? [r.skill_id] : [])))];

  const [{ data: profiles }, { data: skills }, { data: myContacts }] = await Promise.all([
    otherIds.length > 0
      ? supabase.from("profiles").select("id, display_name").in("id", otherIds)
      : Promise.resolve({ data: [] }),
    skillIds.length > 0
      ? supabase.from("skills").select("id, name").in("id", skillIds)
      : Promise.resolve({ data: [] }),
    // RLS on profile_contacts only returns a row here once a match
    // exists between the viewer and that profile -- this list is
    // naturally limited to people the viewer has an accepted match with.
    otherIds.length > 0
      ? supabase.from("profile_contacts").select("profile_id, contact_email").in("profile_id", otherIds)
      : Promise.resolve({ data: [] }),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  const skillNameById = new Map((skills ?? []).map((s) => [s.id, s.name]));
  const contactByProfileId = new Map((myContacts ?? []).map((c) => [c.profile_id, c.contact_email]));

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Requests</h1>
        <p className="text-muted-foreground">
          Contact details only appear here once a request is accepted.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-medium">Received (as mentor)</h2>
        {received.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <ul className="space-y-3">
            {received.map((r) => (
              <li key={r.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {nameById.get(r.mentee_id) ?? "A mentee"}
                      {r.skill_id && ` · ${skillNameById.get(r.skill_id) ?? ""}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{r.message}</p>
                    <StatusRow status={r.status} contactEmail={contactByProfileId.get(r.mentee_id)} />
                    {r.status === "pending" && (
                      <div className="flex gap-2">
                        <form action={respondToRequest}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="accepted" />
                          <Button type="submit" size="sm">
                            Accept
                          </Button>
                        </form>
                        <form action={respondToRequest}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="declined" />
                          <Button type="submit" size="sm" variant="outline">
                            Decline
                          </Button>
                        </form>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Sent (as mentee)</h2>
        {sent.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven&apos;t sent any requests yet.</p>
        ) : (
          <ul className="space-y-3">
            {sent.map((r) => (
              <li key={r.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {nameById.get(r.mentor_id) ?? "A mentor"}
                      {r.skill_id && ` · ${skillNameById.get(r.skill_id) ?? ""}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{r.message}</p>
                    <StatusRow status={r.status} contactEmail={contactByProfileId.get(r.mentor_id)} />
                    {r.status === "pending" && (
                      <form action={cancelRequest}>
                        <input type="hidden" name="id" value={r.id} />
                        <Button type="submit" size="sm" variant="ghost">
                          Cancel
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusRow({
  status,
  contactEmail,
}: {
  status: string;
  contactEmail?: string;
}) {
  const variant =
    status === "accepted" ? "default" : status === "pending" ? "secondary" : "outline";
  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge variant={variant}>{status}</Badge>
      {status === "accepted" && contactEmail && (
        <span className="text-muted-foreground">Contact: {contactEmail}</span>
      )}
    </div>
  );
}
