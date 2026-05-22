import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const ACCESS_TTL_MS = 14 * 60 * 1000; // 14 min (1 min before 15m expiry)

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const res = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
        });

        if (!res.ok) return null;

        const { accessToken, user } = await res.json();
        // Store cookie header so refresh works server-side
        const setCookie = res.headers.get("set-cookie") ?? "";
        return { id: user.id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId, accessToken, refreshCookie: setCookie };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign-in
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.refreshCookie = (user as any).refreshCookie;
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
        token.accessTokenExpiresAt = Date.now() + ACCESS_TTL_MS;
        return token;
      }

      // Access token still valid
      if (Date.now() < (token.accessTokenExpiresAt as number)) return token;

      // Already failed — don't retry, force re-login
      if (token.error === "RefreshTokenExpired") return token;

      // Refresh access token
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { Cookie: token.refreshCookie as string },
        });

        if (!res.ok) throw new Error("Refresh failed");

        const { accessToken } = await res.json();
        const newCookie = res.headers.get("set-cookie");

        token.accessToken = accessToken;
        token.accessTokenExpiresAt = Date.now() + ACCESS_TTL_MS;
        if (newCookie) token.refreshCookie = newCookie;
      } catch {
        token.error = "RefreshTokenExpired";
      }

      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).error = token.error;
      (session.user as any).role = token.role;
      (session.user as any).organizationId = token.organizationId;
      return session;
    },
  },
});
