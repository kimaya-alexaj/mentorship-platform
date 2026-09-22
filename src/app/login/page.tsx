import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full min-h-[70vh] max-w-md items-center px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
