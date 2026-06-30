import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { colombiaDayStart, toColombiaDate } from "@/lib/colombia-time";

export async function POST(req: NextRequest) {
  try {
    const eventsKey = req.headers.get("x-events-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    if (!eventsKey || eventsKey !== process.env.WOMPI_EVENTS_KEY) {
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
      const paymentDate = toColombiaDate(payment.createdAt);
      const day = colombiaDayStart(paymentDate);
      await prisma.dayPass.upsert({
        where: { userId_date: { userId: payment.userId, date: day } },
        update: {},
        create: { userId: payment.userId, date: day, paymentId: payment.id },
      });
    }

    if (payment.type === "weekly") {
      const week = await prisma.week.findFirst({ where: { isActive: true } });
      if (week) {
        const start = new Date(week.startDate);
        const end = new Date(week.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dayUTC = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 5, 0, 0, 0));
          await prisma.dayPass.upsert({
            where: { userId_date: { userId: payment.userId, date: dayUTC } },
            update: {},
            create: { userId: payment.userId, date: dayUTC, paymentId: payment.id },
          });
        }
      } else {
        // Fallback: create 7 days from payment date
        const paymentDate = toColombiaDate(payment.createdAt);
        const [y, m, d] = paymentDate.split("-").map(Number);
        for (let i = 0; i < 7; i++) {
          const day = new Date(Date.UTC(y, m - 1, d + i, 5, 0, 0, 0));
          await prisma.dayPass.upsert({
            where: { userId_date: { userId: payment.userId, date: day } },
            update: {},
            create: { userId: payment.userId, date: day, paymentId: payment.id },
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
