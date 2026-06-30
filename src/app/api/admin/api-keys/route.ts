import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const keys = await prisma.apiKey.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const { name, description } = await req.json();
  const key = `fan_${uuidv4().replace(/-/g, "").slice(0, 24)}`;
  const apiKey = await prisma.apiKey.create({
    data: { key, name: name || "Sin nombre", description },
  });
  return NextResponse.json({ key: apiKey });
}
