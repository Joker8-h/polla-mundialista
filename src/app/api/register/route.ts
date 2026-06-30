import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    let body;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

    const { name, whatsapp, city, password } = body;
    if (!whatsapp || !password) {
      return NextResponse.json({ error: "WhatsApp y contraseña requeridos" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    if (!/^\d{10}$/.test(whatsapp)) {
      return NextResponse.json({ error: "WhatsApp inválido. Debe ser un número de 10 dígitos." }, { status: 400 });
    }
    if (name && name.length > 100) {
      return NextResponse.json({ error: "Nombre muy largo (máximo 100 caracteres)" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { whatsapp } });

    if (existing) {
      return NextResponse.json({ error: "Este WhatsApp ya está registrado. Inicia sesión." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { name: name || "Usuario", whatsapp, city: city || "Sin ciudad", password: hashedPassword, verified: true },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Registro error:", err);
    return NextResponse.json({ error: "Error al crear cuenta" }, { status: 500 });
  }
}
