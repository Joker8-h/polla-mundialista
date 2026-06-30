import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const { password } = body;
  const adminPassword = process.env.ADMIN_PASSWORD || "admin2026";
  if (password === adminPassword) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
}
