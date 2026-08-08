import { NextResponse, type NextRequest } from "next/server";

function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  return value.split(",")[0]?.trim() || null;
}

function isLoopbackHost(host: string): boolean {
  const hostname = host.toLowerCase().split(":")[0] ?? "";
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1"
  );
}

/**
 * Origine publique vue par le navigateur (Scalingo / reverse-proxy).
 *
 * Sur Scalingo, `request.nextUrl.origin` vaut souvent `http://localhost:$PORT`
 * (host interne du conteneur). Les redirects auth doivent utiliser
 * `X-Forwarded-Host` / `Host` public, sinon le login envoie vers localhost.
 */
export function publicRequestOrigin(request: NextRequest): string {
  const forwardedHost = firstHeaderValue(
    request.headers.get("x-forwarded-host"),
  );
  const forwardedProto = firstHeaderValue(
    request.headers.get("x-forwarded-proto"),
  );

  if (forwardedHost && !isLoopbackHost(forwardedHost)) {
    const proto = forwardedProto === "http" ? "http" : "https";
    return `${proto}://${forwardedHost}`;
  }

  const host = firstHeaderValue(request.headers.get("host"));
  if (host && !isLoopbackHost(host)) {
    const proto =
      forwardedProto === "http"
        ? "http"
        : forwardedProto === "https"
          ? "https"
          : request.nextUrl.protocol === "http:"
            ? "http"
            : "https";
    return `${proto}://${host}`;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (siteUrl) {
    try {
      return new URL(siteUrl).origin;
    } catch {
      // ignore invalid env
    }
  }

  return request.nextUrl.origin;
}

export function publicUrl(
  request: NextRequest,
  pathnameWithSearch: string,
): URL {
  const path = pathnameWithSearch.startsWith("/")
    ? pathnameWithSearch
    : `/${pathnameWithSearch}`;
  return new URL(path, `${publicRequestOrigin(request)}/`);
}

export function redirectPublic(
  request: NextRequest,
  pathnameWithSearch: string,
  status: 302 | 303 | 307 | 308 = 303,
): NextResponse {
  const path = pathnameWithSearch.startsWith("/")
    ? pathnameWithSearch
    : `/${pathnameWithSearch}`;
  const origin = publicRequestOrigin(request);

  let hostname = "";
  try {
    hostname = new URL(origin).hostname;
  } catch {
    hostname = "";
  }

  // Si on n’a que le host interne du conteneur, Location relative :
  // le navigateur résout contre l’URL publique qu’il a appelée.
  if (isLoopbackHost(hostname)) {
    return new NextResponse(null, {
      status,
      headers: { Location: path },
    });
  }

  return NextResponse.redirect(new URL(path, `${origin}/`), status);
}
