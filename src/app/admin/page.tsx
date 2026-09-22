import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateReportStatus } from "./actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Self-lookup against admin_users, which RLS lets any user do for
  // their own row -- no separate "am I admin" RPC needed. Every other
  // query below relies on the *_select_..._or_admin RLS policies to
  // return all rows for an admin and nothing extra for anyone else, so
  // this page reads no more than what RLS already permits.
  const { data: myAdminRow } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!myAdminRow) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">This page is for admins only.</p>
      </div>
    );
  }

  const [
    { data: profiles },
    { data: contacts },
    { data: adminRows },
    { data: matches },
    { data: reports },
  ] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("profile_contacts").select("profile_id, contact_email"),
    supabase.from("admin_users").select("user_id"),
    supabase.from("matches").select("*").order("created_at", { ascending: false }),
    supabase.from("reports").select("*").order("created_at", { ascending: false }),
  ]);

  const emailByProfileId = new Map((contacts ?? []).map((c) => [c.profile_id, c.contact_email]));
  const adminIds = new Set((adminRows ?? []).map((a) => a.user_id));
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-muted-foreground">Users, matches, and reports.</p>
      </div>

      <section className="space-y-4">
        <h2 className="font-medium">Users ({profiles?.length ?? 0})</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(profiles ?? []).map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.display_name}
                  {adminIds.has(p.id) && (
                    <Badge variant="secondary" className="ml-2">
                      admin
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{emailByProfileId.get(p.id) ?? "—"}</TableCell>
                <TableCell>
                  {[p.is_mentor && "mentor", p.is_mentee && "mentee"]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </TableCell>
                <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Matches ({matches?.length ?? 0})</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mentor</TableHead>
              <TableHead>Mentee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(matches ?? []).map((m) => (
              <TableRow key={m.id}>
                <TableCell>{nameById.get(m.mentor_id) ?? m.mentor_id}</TableCell>
                <TableCell>{nameById.get(m.mentee_id) ?? m.mentee_id}</TableCell>
                <TableCell>
                  <Badge variant={m.status === "active" ? "default" : "outline"}>
                    {m.status}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(m.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Reports ({reports?.length ?? 0})</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reporter</TableHead>
              <TableHead>Reported</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(reports ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>{nameById.get(r.reporter_id) ?? r.reporter_id}</TableCell>
                <TableCell>
                  {r.reported_user_id ? nameById.get(r.reported_user_id) : `match ${r.match_id}`}
                </TableCell>
                <TableCell>
                  {r.reason}
                  {r.details && (
                    <p className="text-xs text-muted-foreground">{r.details}</p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={r.status === "open" ? "secondary" : "outline"}>
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {r.status === "open" && (
                    <div className="flex gap-2">
                      <form action={updateReportStatus}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="resolved" />
                        <Button type="submit" size="sm" variant="outline">
                          Resolve
                        </Button>
                      </form>
                      <form action={updateReportStatus}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="dismissed" />
                        <Button type="submit" size="sm" variant="ghost">
                          Dismiss
                        </Button>
                      </form>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
