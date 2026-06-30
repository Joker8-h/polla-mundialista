import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const adminId = await getAdminFromReq(req);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, name: true, whatsapp: true, city: true, isAdmin: true, createdAt: true },
  });
  return NextResponse.json({ users });
}
