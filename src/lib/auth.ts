import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { findUserByEmail } from "@/repositories/userRepository";
import { assertProductionEnvSafety, assertStrongSecret } from "@/lib/env";
import { trackEventServer } from "@/lib/analytics/server";

assertProductionEnvSafety(["NEXTAUTH_SECRET", "NEXTAUTH_URL"]);
assertStrongSecret("NEXTAUTH_SECRET");

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: { email: { label: "Email" }, password: { label: "Password" } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await findUserByEmail(credentials.email);
        if (!user?.passwordHash) return null;
        const ok = await compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          isAdmin: user.isAdmin,
          airlineCode: user.airline?.code,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = !!(user as { isAdmin?: boolean }).isAdmin;
        token.airlineCode = (user as { airlineCode?: string }).airlineCode;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { isAdmin?: boolean }).isAdmin = !!token.isAdmin;
        // Undefined on JWTs issued before this claim existed; consumers fall back to SV.
        (session.user as { airlineCode?: string }).airlineCode = token.airlineCode;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      await trackEventServer({
        eventName: "user_logged_in",
        userId: user.id,
        path: "/login",
      }).catch(() => {});
    },
  },
  pages: { signIn: "/login" },
};
