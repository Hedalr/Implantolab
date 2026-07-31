import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";

export type UpdateSessionResult = {
  response: NextResponse;
  user: User | null;
};

function preventSessionCaching(response: NextResponse): void {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("auth-token"));
}

/**
 * Rafraîchit la session Supabase depuis le middleware Next.js.
 * Pattern officiel : https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(
  request: NextRequest,
): Promise<UpdateSessionResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { response: NextResponse.next({ request }), user: null };
  }

  // Pas de cookie auth → pas d'appel Auth réseau (login froid, etc.).
  if (!hasSupabaseAuthCookie(request)) {
    return { response: NextResponse.next({ request }), user: null };
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(url, anonKey, {
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, responseHeaders?: Record<string, string>) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          if (responseHeaders) {
            for (const [name, value] of Object.entries(responseHeaders)) {
              response.headers.set(name, value);
            }
          }
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          preventSessionCaching(response);
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    preventSessionCaching(response);
    return { response, user };
  } catch (error) {
    console.error("[updateSession] échec:", error);
    const failedResponse = NextResponse.next({ request });
    preventSessionCaching(failedResponse);
    return { response: failedResponse, user: null };
  }
}
