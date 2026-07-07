import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

function typeLabel(type: string): string {
  if (type === "discount") return "Descuento";
  if (type === "bono") return "Bono";
  if (type === "toy") return "Juguete / Accesorio";
  if (type === "free_ticket") return "Ticket";
  return type;
}

function valueDisplay(p: { type: string; value?: number | null; unit?: string | null; minPurchase?: number | null }): string | null {
  if (p.type === "discount" && p.value) return `${p.value}% OFF`;
  if (p.type === "bono" && p.value) return `$${p.value.toLocaleString("es-CO")}`;
  if (p.type === "toy" && p.value) return `Desde $${p.value.toLocaleString("es-CO")}`;
  return null;
}

export default async function PremiosPage() {
  const currentWeek = await prisma.week.findFirst({
    where: { isActive: true, isClosed: false },
    orderBy: { number: "desc" },
  });

  if (!currentWeek) {
    return (
      <div className="min-h-screen text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-black mb-2 text-center" style={{background:'linear-gradient(90deg, #fff, #ff69b4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>Premios de la Semana</h1>
        <p className="text-gray-400">No hay una semana activa en este momento. Vuelve pronto.</p>
        <Link href="/dashboard" className="mt-6 px-6 py-3 rounded-xl font-bold text-white pink-button">Volver</Link>
      </div>
    );
  }

  const prizes = await prisma.weekPrize.findMany({
    where: { weekId: currentWeek.id },
    orderBy: { rank: "asc" },
  });

  const weekStart = currentWeek.startDate.toLocaleDateString("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" });
  const weekEnd = currentWeek.endDate.toLocaleDateString("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen pb-20 text-white" style={{background:'linear-gradient(160deg, #0a0008 0%, #12000d 50%, #080005 100%)'}}>
      <div className="max-w-xl mx-auto p-4 space-y-6 pt-8">
        <div className="text-center">
          <h1 className="text-3xl font-black mb-2" style={{background:'linear-gradient(90deg, #fff, #ff69b4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>Premios Semana {currentWeek.number}</h1>
          <p className="text-sm" style={{color:'rgba(255,105,180,0.5)'}}>
            {weekStart} — {weekEnd}
          </p>
          <p className="text-sm mt-1" style={{color:'rgba(255,105,180,0.7)'}}>¡Acumula puntos y llévate estos espectaculares premios!</p>
        </div>

        <div className="space-y-4 mt-8">
          {prizes.map((p) => (
            <div key={p.id} className="relative rounded-2xl overflow-hidden" style={{background:'rgba(18,0,13,0.7)', border:'1px solid rgba(255,0,255,0.15)'}}>
              <div className="absolute top-0 left-0 w-2 h-full" style={{background: p.rank === 1 ? 'linear-gradient(to bottom, #ffd700, #daa520)' : p.rank === 2 ? 'linear-gradient(to bottom, #e3e4e5, #9ca3af)' : p.rank === 3 ? 'linear-gradient(to bottom, #cd7f32, #8b4513)' : '#ff1493'}} />

              <div className="p-4 pl-6">
                <div className="flex items-start gap-4">
                  {p.imageUrl && (
                    <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,0,255,0.2)'}}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.imageUrl} alt={p.label} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-black" style={{color: p.rank === 1 ? '#ffd700' : p.rank === 2 ? '#e3e4e5' : p.rank === 3 ? '#cd7f32' : '#ff69b4'}}>#{p.rank}</span>
                      <h3 className="font-bold text-lg truncate">{p.label}</h3>
                    </div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold" style={{color:'rgba(255,105,180,0.5)'}}>{typeLabel(p.type)}</p>
                    {valueDisplay(p) && (
                      <p className="text-sm font-bold mt-1" style={{color:'#4ade80'}}>
                        {valueDisplay(p)}
                        {p.minPurchase ? ` (min. $${p.minPurchase.toLocaleString("es-CO")})` : ''}
                      </p>
                    )}
                    {p.description && (
                      <p className="text-xs mt-1 leading-relaxed" style={{color:'rgba(255,255,255,0.6)'}}>{p.description}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {prizes.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              Aún no se han definido los premios de esta semana.
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4" style={{background:'linear-gradient(to top, rgba(10,0,8,1) 0%, rgba(10,0,8,0) 100%)'}}>
        <div className="max-w-md mx-auto">
          <Link href="/dashboard" className="flex items-center justify-center w-full py-4 rounded-2xl font-black text-lg transition-all pink-button">
            Ver todos los partidos
          </Link>
        </div>
      </div>
    </div>
  );
}
