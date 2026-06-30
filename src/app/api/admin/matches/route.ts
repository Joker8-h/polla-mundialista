import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const adminId = await getAdminFromReq(req);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const matches = await prisma.match.findMany({
    orderBy: { matchDate: "desc" },
    take: 50,
  });
  return NextResponse.json({ matches });
}
