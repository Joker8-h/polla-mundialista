import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { getAdminFromReq } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const adminId = await getAdminFromReq(req);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const keys = await prisma.apiKey.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const adminId = await getAdminFromReq(req);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const { name, description } = body;
  const key = `fan_${uuidv4().replace(/-/g, "").slice(0, 24)}`;
  const apiKey = await prisma.apiKey.create({
    data: { key, name: name || "Sin nombre", description },
  });
  return NextResponse.json({ key: apiKey });
}
