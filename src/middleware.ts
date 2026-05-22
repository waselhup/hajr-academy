import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// All NextAuth session-token cookie names across configs (secure + plain).
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

/**
 * Middleware: next-intl locale routing, plus stale-session cleanup.
 *
 * After AUTH_SECRET is rotated, JWT cookies signed with the old secret can
 * no longer be decoded. If a session cookie is present but `getToken`
 * cannot decode it, we strip the cookie from the response so the browser
 * stops sending the dead token (which otherwise spams JWTSessionError).
 */
export default async function middleware(req: NextRequest) {
  const res = intlMiddleware(req);

  const hasSessionCookie = SESSION_COOKIES.some(
    (name) => req.cookies.get(name)?.value
  );

  if (hasSessionCookie && authSecret) {
    let stale = false;
    try {
      const token = await getToken({ req, secret: authSecret });
      // Cookie present but undecodable → signed with an old secret.
      if (!token) stale = true;
    } catch {
      // Decode threw — treat as stale.
      stale = true;
    }
    if (stale) {
      for (const name of SESSION_COOKIES) {
        if (req.cookies.get(name)?.value) {
          res.cookies.delete(name);
        }
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
