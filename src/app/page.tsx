import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">
        Free mentoring, worldwide.
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Volunteer mentors and mentees connect by shared interests. Sign up,
        share what you can teach or what you want to learn, and find a match.
      </p>
      <div className="flex gap-4">
        <Link href="/signup" className={buttonVariants({ size: "lg" })}>
          Get started
        </Link>
        <Link
          href="/login"
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
