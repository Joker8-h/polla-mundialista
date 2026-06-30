import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { colombiaMidnight } from "@/lib/colombia-time";

export async function POST(req: NextRequest) {
  try {
    const eventsKey = req.headers.get("x-events-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    if (eventsKey && eventsKey !== process.env.WOMPI_EVENTS_KEY) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { transactionId, status, metadata } = body;

    if (!metadata?.paymentId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (status !== "paid" && status !== "approved") {
      return NextResponse.json({ received: true });
    }

    const payment = await prisma.payment.findUnique({ where: { id: metadata.paymentId } });
    if (!payment || payment.status === "paid") {
      return NextResponse.json({ received: true });
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "paid", paidAt: new Date(), wompiId: transactionId },
    });

    if (payment.type === "daily") {
      const today = colombiaMidnight();
      await prisma.dayPass.upsert({
        where: { userId_date: { userId: payment.userId, date: today } },
        update: {},
        create: { userId: payment.userId, date: today, paymentId: payment.id },
      });
    }

    if (payment.type === "weekly") {
      const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
      const [y, m, d] = todayStr.split("-").map(Number);
      for (let i = 0; i < 7; i++) {
        const day = new Date(Date.UTC(y, m - 1, d + i, 5, 0, 0, 0));
        await prisma.dayPass.upsert({
          where: { userId_date: { userId: payment.userId, date: day } },
          update: {},
          create: { userId: payment.userId, date: day, paymentId: payment.id },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
