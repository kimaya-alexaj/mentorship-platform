"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type SignupState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: SignupState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  if (state.emailSentTo) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a confirmation link to {state.emailSentTo}. Click it to
              activate your account.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Free for volunteer mentors and mentees, 18 and up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Keyed on the last submitted values so a failed submission
              (e.g. a duplicate email) redisplays what the user typed
              instead of resetting these uncontrolled inputs to empty. */}
          <form
            key={`${state.values?.displayName ?? ""}:${state.values?.email ?? ""}`}
            action={formAction}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                name="displayName"
                required
                autoComplete="name"
                defaultValue={state.values?.displayName}
              />
              {state.errors?.displayName && (
                <p className="text-sm text-destructive">{state.errors.displayName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={state.values?.email}
              />
              {state.errors?.email && (
                <p className="text-sm text-destructive">{state.errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
              {state.errors?.password && (
                <p className="text-sm text-destructive">{state.errors.password}</p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="isAdult" name="isAdult" required className="mt-1" />
              <Label htmlFor="isAdult" className="font-normal leading-snug">
                I confirm that I am 18 years of age or older.
              </Label>
            </div>
            {state.errors?.isAdult && (
              <p className="text-sm text-destructive">{state.errors.isAdult}</p>
            )}

            {state.errors?.form && (
              <p className="text-sm text-destructive">{state.errors.form}</p>
            )}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Creating account..." : "Sign up"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
