import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

  return (
    <div className="min-h-screen pb-20 text-white" style={{background:'linear-gradient(160deg, #0a0008 0%, #12000d 50%, #080005 100%)'}}>
      <div className="max-w-xl mx-auto p-4 space-y-6 pt-8">
        <div className="text-center">
          <h1 className="text-3xl font-black mb-2" style={{background:'linear-gradient(90deg, #fff, #ff69b4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>Premios Semana {currentWeek.number}</h1>
          <p className="text-sm" style={{color:'rgba(255,105,180,0.7)'}}>¡Acumula puntos y llévate estos espectaculares premios!</p>
        </div>

        <div className="space-y-4 mt-8">
          {prizes.map((p) => (
            <div key={p.id} className="relative rounded-2xl p-4 flex gap-4 items-center overflow-hidden" style={{background:'rgba(18,0,13,0.7)', border:'1px solid rgba(255,0,255,0.15)'}}>
              <div className="absolute top-0 left-0 w-2 h-full" style={{background: p.rank === 1 ? 'linear-gradient(to bottom, #ffd700, #daa520)' : p.rank === 2 ? 'linear-gradient(to bottom, #e3e4e5, #9ca3af)' : p.rank === 3 ? 'linear-gradient(to bottom, #cd7f32, #8b4513)' : '#ff1493'}} />
              
              <div className="w-12 text-center shrink-0 pl-2">
                <span className="text-2xl font-black block" style={{color: p.rank === 1 ? '#ffd700' : p.rank === 2 ? '#e3e4e5' : p.rank === 3 ? '#cd7f32' : '#ff69b4'}}>#{p.rank}</span>
              </div>
              
              <div className="flex-1 flex gap-4 items-center">
                {p.imageUrl && (
                  <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-pink-500/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt={p.label} className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg">{p.label}</h3>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    {p.type === 'cash' ? 'Efectivo' : p.type === 'toy' ? 'Juguete / Accesorio' : p.type === 'discount' ? 'Descuento' : 'Ticket'}
                  </p>
                  {p.value && (
                    <p className="text-sm font-semibold mt-1" style={{color:'#4ade80'}}>
                      {p.unit === 'percent' ? `${p.value}% OFF` : `$${p.value.toLocaleString("es-CO")}`}
                      {p.minPurchase ? ` (min. $${p.minPurchase.toLocaleString("es-CO")})` : ''}
                    </p>
                  )}
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
      
      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 p-4" style={{background:'linear-gradient(to top, rgba(10,0,8,1) 0%, rgba(10,0,8,0) 100%)'}}>
        <div className="max-w-md mx-auto">
          <Link href="/dashboard" className="flex items-center justify-center w-full py-4 rounded-2xl font-black text-lg transition-all pink-button">
            Volver al Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
