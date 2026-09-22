import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Notifications are best-effort: a failed send (missing API key in dev,
// Resend outage, etc.) logs and returns rather than throwing, so it
// never blocks the request/match action that triggered it.
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set; skipping "${params.subject}" to ${params.to}`);
    return;
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Mentoring Platform <notifications@example.org>",
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  } catch (err) {
    console.error("[email] failed to send", params.subject, err);
  }
}
