import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const matches = await prisma.match.findMany({
    orderBy: { matchDate: "desc" },
    take: 50,
  });
  return NextResponse.json({ matches });
}
