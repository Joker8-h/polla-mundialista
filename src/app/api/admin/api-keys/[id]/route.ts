import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.apiKey.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ success: true });
}
