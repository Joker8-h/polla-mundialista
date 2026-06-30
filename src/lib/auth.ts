import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { getToken } from "next-auth/jwt";

// Extended User type to include custom fields returned from authorize()
interface AuthorizedUser {
  id: string;
  name: string | null;
  whatsapp: string;
  city: string | null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        whatsapp: { label: "WhatsApp", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.whatsapp || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { whatsapp: credentials.whatsapp as string },
        });
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;

        return { id: user.id, name: user.name, whatsapp: user.whatsapp, city: user.city };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as AuthorizedUser;
        token.id = u.id ?? "";
        token.whatsapp = u.whatsapp;
        token.city = u.city ?? undefined;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.whatsapp = token.whatsapp as string | undefined;
      session.user.city = token.city as string | undefined;
      return session;
    },
  },
  pages: { signIn: "/" },
  session: { strategy: "jwt" },
  trustHost: true,
});

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "polla-mundialista-secret-key-2026";
if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === "development") {
  console.warn("AUTH_SECRET no configurado. Usando default. Define AUTH_SECRET o NEXTAUTH_SECRET en producción.");
}

export async function getAdminFromReq(req: Request): Promise<string | null> {
  const userId = await getUserIdFromReq(req);
  if (!userId) return null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    return user?.isAdmin ? userId : null;
  } catch {
    return null;
  }
}

export async function getUserIdFromReq(req: Request): Promise<string | null> {
  if (!AUTH_SECRET) return null;

  const cookieHeader = req.headers.get("cookie") || "";
  const url = req.url || "";
  const isSecure = url.startsWith("https") || cookieHeader.includes("__Secure-");

  const cookieNames = isSecure
    ? ["__Secure-authjs.session-token", "authjs.session-token"]
    : ["authjs.session-token", "__Secure-authjs.session-token"];

  const foundCookie = cookieNames.find((name) => cookieHeader.includes(name + "="));

  if (process.env.NODE_ENV === "development") {
    console.log("[auth] debug:", {
      hasCookie: !!cookieHeader,
      isSecure,
      foundCookie: foundCookie || "none",
      cookieKeys: cookieHeader.split(";").map((c) => c.trim().split("=")[0]),
    });
  }

  if (!foundCookie) {
    if (process.env.NODE_ENV === "development") {
      console.log("[auth] no session cookie found, trying auth() fallback");
    }
    try {
      const session = await auth();
      if (session?.user?.id) {
        console.log("[auth] auth() fallback succeeded");
        return session.user.id;
      }
    } catch (e) {
      console.error("[auth] auth() fallback error:", e);
    }
    return null;
  }

  try {
    const token = await getToken({
      req: req as any,
      secret: AUTH_SECRET,
      secureCookie: isSecure,
    });
    console.log("[auth] getToken result:", token ? { id: token.id, whatsapp: token.whatsapp } : "null");
    if (token?.id) return token.id as string;
  } catch (e) {
    console.error("[auth] getToken error:", e);
  }

  return null;
}
