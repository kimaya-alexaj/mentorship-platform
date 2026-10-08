import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

// Refreshes the Supabase auth session cookie on every request. This is an
// optimistic check only (cookie presence, not a DB round-trip) — real
// authorization happens in RLS policies and in each route/action.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Must be called to refresh an expired session before Server Components
  // read cookies further down the request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/signup");
  // /auth/confirm must stay reachable while signed out — it's the route
  // that establishes the session from an emailed confirmation link.
  //
  // /forgot-password and /reset-password are public but deliberately NOT
  // "auth routes": the recovery link signs the user in, so /reset-password
  // must stay reachable while signed in (an auth route would bounce them
  // to /profile before they could set a new password).
  const isPublicRoute =
    path === "/" ||
    isAuthRoute ||
    path.startsWith("/auth/") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/profile";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
