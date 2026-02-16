import Credentials from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as any).role;
      }
      // Recupera role/uid para tokens antigos/incompletos.
      if (!token.uid && token.sub) token.uid = token.sub;
      if (!token.role && token.uid) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.uid as string }, select: { role: true } });
        if (dbUser?.role) token.role = dbUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.uid ?? "";
      session.user.role = token.role;
      return session;
    },
  },
  pages: { signIn: "/login" },
};
