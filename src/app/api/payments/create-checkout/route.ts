import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromReq } from "@/lib/auth";

const WOMPI_API_URL = "https://api.wompi.co/v1/payment_links";
const WOMPI_API_KEY = process.env.WOMPI_API_KEY || "";

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromReq(req);
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const { type, matchId } = body;

  const amounts: Record<string, number> = { daily: 2000, weekly: 14000, extra_prediction: 2000 };
  const amount = amounts[type] || 2000;
  const description = type === "weekly" ? "Semana completa - FutFantasía" :
    type === "extra_prediction" ? "Pronóstico extra" : "Día - FutFantasía";

  try {
    const payment = await prisma.payment.create({
      data: { userId, amount, type, status: "pending" },
    });

    const res = await fetch(WOMPI_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${WOMPI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: description,
        description,
        single_use: true,
        collect_shipping: false,
        currency: "COP",
        amount_in_cents: amount * 100,
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?paid=true`,
        // Store metadata in customer_data or use a custom field if Wompi supports it, but for payment links, we can rely on the webhook matching the payment link ID if Wompi sends it, but Wompi webhooks for links are tricky.
        // Actually, Wompi transactions support reference. So we should set the sku to the payment.id.
        sku: payment.id,
        metadata: JSON.stringify({ paymentId: payment.id }),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Wompi error:", err);
      return NextResponse.json({ error: "Error en pasarela de pago" }, { status: 502 });
    }

    const data = await res.json();
    if (!data?.data?.id) {
      return NextResponse.json({ error: "Respuesta inválida de Wompi" }, { status: 502 });
    }
    const checkoutUrl = `https://checkout.wompi.co/l/${data.data.id}`;
    return NextResponse.json({ url: checkoutUrl });
  } catch (err) {
    console.error("Payment error:", err);
    return NextResponse.json({ error: "Error al procesar pago" }, { status: 500 });
  }
}
