import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { getAllowedUsers, getOrg } from "@/lib/config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      authorization: {
        params: {
          // repo: read private repos' Actions & PRs; read:org: verify org membership
          scope: "read:user user:email repo read:org",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ account, profile }) {
      const org = getOrg();
      const allowedUsers = getAllowedUsers();
      if (!org && allowedUsers.length === 0) return true; // no restriction configured

      const login = (profile as { login?: string } | null)?.login;
      const token = account?.access_token;
      if (!login || !token) return false;

      // Explicit allowlist — for outside collaborators who aren't org members
      if (allowedUsers.includes(login.toLowerCase())) return true;
      if (!org) return false;

      // 204 if the authenticated user is a member of the org
      const res = await fetch(
        `https://api.github.com/orgs/${org}/members/${login}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      return res.status === 204;
    },
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.userId = token.sub ?? "";
      return session;
    },
  },
});
