import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, whatsapp, city, password } = await req.json();
    if (!whatsapp || !password) {
      return NextResponse.json({ error: "WhatsApp y contraseña requeridos" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { whatsapp } });

    if (existing) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { whatsapp },
        data: { name: name || undefined, city: city || undefined, password: hashedPassword, verified: true },
      });
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: { name: name || "Usuario", whatsapp, city: city || "Sin ciudad", password: hashedPassword, verified: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Registro error:", err);
    return NextResponse.json({ error: "Error al crear cuenta" }, { status: 500 });
  }
}
