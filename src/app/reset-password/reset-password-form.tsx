"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema } from "@/lib/auth/schemas";
import { buttonVariants, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Phase =
  | { kind: "checking" }
  | { kind: "ready" }
  | { kind: "invalid"; reason?: string }
  | { kind: "success" };

// Supabase reports a bad/expired link by redirecting back here with
// error details in the query string (PKCE) or the hash (implicit).
function readLinkError(): string | undefined {
  const fromQuery = new URLSearchParams(window.location.search);
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return (
    fromQuery.get("error_description") ??
    fromHash.get("error_description") ??
    undefined
  );
}

export function ResetPasswordForm() {
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>({});

  useEffect(() => {
    // Read the link error before creating the client: initialising it
    // processes and then strips the auth params from the URL, so reading
    // afterwards finds nothing.
    const linkError = readLinkError();
    const supabase = createClient();
    let cancelled = false;

    // The browser client exchanges the ?code= from the emailed link for a
    // recovery session as it initialises, and announces it with
    // PASSWORD_RECOVERY. getSession() waits for that initialisation, so it
    // is the reliable "did we end up with a session?" check; the listener
    // just lets us react the moment the recovery event lands.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && !cancelled) {
        setPhase({ kind: "ready" });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setPhase((current) =>
        current.kind !== "checking"
          ? current
          : session
            ? { kind: "ready" }
            : { kind: "invalid", reason: linkError }
      );
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const parsed = resetPasswordSchema.safeParse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
      });
      return;
    }

    setErrors({});
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    setPending(false);

    if (error) {
      // e.g. "New password should be different from the old password" or
      // a weak-password rejection -- Supabase's wording is user-readable.
      setErrors({ form: error.message });
      return;
    }
    setPhase({ kind: "success" });
  }

  if (phase.kind === "checking") {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>Checking your reset link...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (phase.kind === "invalid") {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Reset link not valid</CardTitle>
          <CardDescription>
            {phase.reason
              ? phase.reason.replace(/\.?$/, ".")
              : "This password reset link is invalid or has expired."}{" "}
            Request a new one to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link
            href="/forgot-password"
            className={buttonVariants({ className: "w-full" })}
          >
            Request a new link
          </Link>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline underline-offset-4">
              Back to log in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  if (phase.kind === "success") {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Password updated</CardTitle>
          <CardDescription>
            Your password has been changed and you&apos;re signed in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/profile"
            className={buttonVariants({ className: "w-full" })}
          >
            Continue to your profile
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {errors.form && (
            <p className="text-sm text-destructive">{errors.form}</p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Updating password..." : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
