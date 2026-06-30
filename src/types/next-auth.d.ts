import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      whatsapp?: string;
      city?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    whatsapp?: string;
    city?: string;
  }
}
