"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema } from "@/lib/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Status =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "error"; message: string }
  | { kind: "sent"; email: string };

// Runs in the browser (not a Server Action) on purpose: with the PKCE flow
// Supabase stores a code verifier in a cookie when the reset is requested,
// and the same browser must later exchange the emailed ?code= for a session
// on /reset-password. Requesting from the browser client keeps both halves
// on one client.
export function ForgotPasswordForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const parsed = forgotPasswordSchema.safeParse({
      email: formData.get("email"),
    });
    if (!parsed.success) {
      setStatus({
        kind: "error",
        message: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
      });
      return;
    }

    setStatus({ kind: "pending" });
    const supabase = createClient();
    // window.location.origin rather than NEXT_PUBLIC_SITE_URL so the link
    // always points back at whichever host the user is actually on
    // (localhost, preview, production). That URL must be in the Supabase
    // project's Auth > URL Configuration > Redirect URLs allowlist.
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      { redirectTo: `${window.location.origin}/reset-password` }
    );

    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    setStatus({ kind: "sent", email: parsed.data.email });
  }

  if (status.kind === "sent") {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          {/* Deliberately doesn't confirm the address has an account --
              Supabase also returns success for unknown emails, so this
              avoids leaking who is registered. */}
          <CardDescription>
            If an account exists for {status.email}, we&apos;ve sent a link to
            reset your password. It may take a minute to arrive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline underline-offset-4">
              Back to log in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  const pending = status.kind === "pending";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to reset it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </div>

          {status.kind === "error" && (
            <p className="text-sm text-destructive">{status.message}</p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Sending link..." : "Send reset link"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="underline underline-offset-4">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
