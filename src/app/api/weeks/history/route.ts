import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const weeks = await prisma.week.findMany({
    orderBy: { number: "desc" },
    take: 20,
  });
  return NextResponse.json({ weeks });
}
