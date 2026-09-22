"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ReportStatus } from "@/lib/types/database";

// The RLS policy on reports (reports_update_admin) plus the
// enforce_report_transition trigger are the real gate here -- a
// non-admin's update fails there regardless of this action existing.
export async function updateReportStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as ReportStatus;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("reports")
    .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) console.error("[admin] failed to update report", error.message);

  revalidatePath("/admin");
}
