"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface PrizeWon {
  id: string;
  rank: number;
  code: string;
  claimed: boolean;
  claimedAt: string | null;
  expiresAt: string | null;
  weekPrize?: { label: string; type: string; value?: number; imageUrl?: string } | null;
  week?: { number: number };
}

export default function MisPremiosPage() {
  const router = useRouter();
  const [prizes, setPrizes] = useState<PrizeWon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PrizeWon | null>(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => {
      setPrizes(d.winnings || []);
      setUserName(d.user?.name || "");
    }).catch(() => router.push("/")).finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0a0008'}}>
      <p className="text-sm" style={{color:'rgba(255,105,180,0.5)'}}>Cargando...</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{background:'#0a0008'}}>
      <div className="mx-auto max-w-[800px] px-4 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">🎁 Mis Premios</h1>
            <p className="text-sm mt-1" style={{color:'rgba(255,105,180,0.5)'}}>Tus códigos ganados en Fantasy Mundial</p>
          </div>
          <button onClick={() => router.push("/dashboard")} className="rounded-lg px-4 py-2 text-xs font-bold" style={{border:'1px solid rgba(255,0,255,0.2)', color:'#ff69b4'}}>
            Volver
          </button>
        </header>

        {prizes.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{background:'rgba(18,0,13,0.7)', border:'1px solid rgba(255,0,255,0.1)'}}>
            <p className="text-lg font-bold text-white">Aún no tienes premios</p>
            <p className="mt-2 text-sm" style={{color:'rgba(255,105,180,0.4)'}}>Participa cada semana para ganar premios increíbles.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {prizes.map((p) => (
              <div key={p.id} className="rounded-2xl overflow-hidden transition-all hover:scale-[1.01]" style={p.claimed ? {background:'rgba(34,197,94,0.05)', border:'1px solid rgba(34,197,94,0.2)'} : {background:'rgba(18,0,13,0.8)', border:'1px solid rgba(255,0,255,0.2)', boxShadow:'0 4px 20px rgba(255,20,147,0.15)'}}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {p.weekPrize?.imageUrl && <img src={p.weekPrize.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" style={{border:'1px solid rgba(255,0,255,0.2)'}} />}
                        <div>
                          <p className="text-lg font-bold text-white">#{p.rank} - {p.weekPrize?.label || "Premio"}</p>
                          <p className="text-xs" style={{color:'rgba(255,105,180,0.4)'}}>Semana {p.week?.number || "-"}</p>
                        </div>
                      </div>
                      <div className="mt-3 bg-black/40 rounded-xl p-3 border border-pink-500/20 inline-block">
                        <code className="text-2xl font-mono font-black tracking-[0.2em]" style={{color: p.claimed ? '#4ade80' : '#ff69b4'}}>{p.code}</code>
                      </div>
                      <p className="text-xs mt-2" style={{color:'rgba(255,105,180,0.4)'}}>Vence: {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString("es-CO") : "-"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-sm font-bold" style={p.claimed ? {color:'#4ade80'} : {color:'#ff69b4'}}>
                        {p.claimed ? "✅ Redimido" : "⏳ Pendiente"}
                      </span>
                      {!p.claimed && (
                        <button onClick={() => setSelected(p)} className="mt-3 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105" style={{background:'linear-gradient(135deg, #ff1493, #c500ff)'}}>
                          Ver Ticket
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{background:'linear-gradient(160deg, #1a0013 0%, #0a0008 100%)', border:'1px solid rgba(255,0,255,0.3)', boxShadow:'0 20px 50px rgba(255,20,147,0.3)'}} onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center border-b" style={{borderColor:'rgba(255,0,255,0.1)'}}>
              <h2 className="text-2xl font-black text-white">🏆 ¡Ganaste!</h2>
              <p className="text-sm mt-1" style={{color:'rgba(255,105,180,0.7)'}}>Muestra este código en la tienda física</p>
            </div>
            <div className="p-8 text-center bg-white/5 relative">
              <div className="absolute -left-4 top-1/2 w-8 h-8 rounded-full bg-black border-r border-pink-500/30 -translate-y-1/2"></div>
              <div className="absolute -right-4 top-1/2 w-8 h-8 rounded-full bg-black border-l border-pink-500/30 -translate-y-1/2"></div>
              <h3 className="text-3xl font-black mb-2" style={{color:'#ff69b4'}}>{selected.weekPrize?.label || "Premio"}</h3>
              {selected.weekPrize?.value && <p className="text-lg text-white font-bold mb-4">${selected.weekPrize.value.toLocaleString("es-CO")}</p>}
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Ticket de Canje</p>
              <div className="bg-black/50 p-4 rounded-xl border border-pink-500/30 mb-3">
                <code className="text-3xl font-mono text-white tracking-widest">{selected.code}</code>
              </div>
              <p className="text-sm text-white font-semibold">Jugador: {userName}</p>
              <p className="text-xs text-gray-400 mt-1">Vence: {selected.expiresAt ? new Date(selected.expiresAt).toLocaleDateString("es-CO") : "-"}</p>
              <p className="text-xs text-gray-400 mt-4">Solo se puede usar una vez.</p>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <button onClick={() => window.print()} className="w-full py-3 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 transition-all border border-white/20">
                Descargar / Imprimir
              </button>
              <button onClick={() => setSelected(null)} className="w-full py-3 rounded-xl font-bold text-white pink-button">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
