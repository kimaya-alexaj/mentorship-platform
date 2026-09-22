import { z } from "zod";

export const signupSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters.")
    .max(80, "Keep it under 80 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(128, "Keep it under 128 characters."),
  // Sign-up must be blocked without this — see CLAUDE.md. Checked as a
  // hard requirement here (z.literal(true), not just boolean truthy), and
  // enforced again in the handle_new_user() database trigger.
  isAdult: z.literal(true, {
    error: "You must confirm you are 18 or older to sign up.",
  }),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export type LoginInput = z.infer<typeof loginSchema>;
