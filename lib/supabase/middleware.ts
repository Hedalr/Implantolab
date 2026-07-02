import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

/**
 * Résultat de `updateSession` : la réponse à retourner (avec les cookies
 * Supabase potentiellement rafraîchis) et l'utilisateur courant (ou `null`).
 */
export type UpdateSessionResult = {
  response: NextResponse;
  user: User | null;
};

/**
 * Rafraîchit la session Supabase depuis le middleware Next.js.
 * Suit le pattern officiel Supabase pour Next.js App Router :
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 *
 * Retourne systématiquement une NextResponse — si Supabase n'est pas
 * configuré, on renvoie un no-op (`NextResponse.next()`).
 */
export async function updateSession(
  request: NextRequest,
): Promise<UpdateSessionResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { response: NextResponse.next({ request }), user: null };
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
