import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      accountType: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    accountType?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    accountType?: string;
    role?: string;
  }
}
