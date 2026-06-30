"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface ProfileUser {
  name: string;
  whatsapp: string;
  city: string | null;
  createdAt: string;
}

interface ProfilePrediction {
  id: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number | null;
  match?: { homeTeam?: string; awayTeam?: string; matchDate?: string };
}

interface ProfileWinning {
  id: string;
  rank: number;
  prizeLabel?: string;
  prizeType: string;
  claimed: boolean;
  code: string;
}

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [predictions, setPredictions] = useState<ProfilePrediction[]>([]);
  const [winnings, setWinnings] = useState<ProfileWinning[]>([]);
  const [selectedPrize, setSelectedPrize] = useState<ProfileWinning | null>(null);

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((d) => {
      setUser(d.user);
      setPredictions(d.predictions || []);
      setWinnings(d.winnings || []);
    }).catch(() => router.push("/"));
  }, [router]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{background:'#0a0008'}}>
        <div className="rounded-2xl px-6 py-5 text-center text-sm" style={{background:'rgba(18,0,13,0.95)', border:'1px solid rgba(255,0,255,0.15)', color:'rgba(255,105,180,0.5)'}}>Cargando perfil...</div>
      </div>
    );
  }

  const totalPoints = predictions.reduce((sum, p) => sum + (p.totalPoints || 0), 0);

  return (
    <div className="min-h-screen lg:flex bg-perfil">
      <Sidebar active="Perfil" />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1200px] px-4 py-5 lg:px-6">
          <header className="mb-5 flex min-h-14 items-center justify-between gap-4 pb-4" style={{borderBottom:'1px solid rgba(255,0,255,0.1)'}}>
            <div>
              <p className="text-xs uppercase lg:hidden" style={{color:'rgba(255,105,180,0.5)'}}>Fantasy Mundial</p>
              <h1 className="text-lg font-bold text-white">Perfil</h1>
              <p className="text-xs" style={{color:'rgba(255,105,180,0.5)'}}>Cuenta, puntos y premios</p>
            </div>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="rounded-lg px-3 py-2 text-xs font-bold transition-all" style={{background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5'}}>
              Cerrar sesión
            </button>
          </header>

          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <section className="rounded-2xl p-5" style={{background:'rgba(18,0,13,0.7)', border:'1px solid rgba(255,0,255,0.12)'}}>
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-black" style={{border:'2px solid rgba(255,0,255,0.2)', background:'rgba(255,20,147,0.12)', color:'#ff69b4'}}>
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
                <h2 className="mt-4 text-xl font-black text-white">{user.name}</h2>
                <p className="text-sm" style={{color:'rgba(255,105,180,0.5)'}}>{user.city || "Sin ciudad"}</p>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2">
                <Stat label="Predicciones" value={predictions.length} />
                <Stat label="Puntos" value={totalPoints} accent />
                <Stat label="Premios" value={winnings.length} />
              </div>
              <div className="mt-6 space-y-3">
                <Info label="Nombre" value={user.name} />
                <Info label="WhatsApp" value={user.whatsapp} />
                <Info label="Ciudad" value={user.city || "-"} />
                <Info label="Registro" value={new Date(user.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })} />
              </div>
            </section>

            <section className="space-y-5">
              <div className="rounded-2xl p-4" style={{background:'rgba(18,0,13,0.7)', border:'1px solid rgba(255,0,255,0.12)'}}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">Mis predicciones</h2>
                  <span className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{background:'rgba(255,0,255,0.05)', color:'rgba(255,105,180,0.6)'}}>{predictions.length} total</span>
                </div>
                <div className="space-y-2">
                  {predictions.slice(0, 12).map((prediction) => (
                    <div key={prediction.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl px-3 py-3" style={{background:'rgba(255,0,255,0.025)', border:'1px solid rgba(255,0,255,0.08)'}}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{prediction.match?.homeTeam} vs {prediction.match?.awayTeam}</p>
                        <p className="text-xs" style={{color:'rgba(255,105,180,0.4)'}}>{prediction.match?.matchDate ? new Date(prediction.match.matchDate).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short" }) : ""}</p>
                      </div>
                      <span className="text-sm font-black tabular-nums text-white">{prediction.homeScore} - {prediction.awayScore}</span>
                      <span className="rounded-lg px-2 py-1 text-xs font-black" style={{background:'rgba(255,20,147,0.15)', color:'#ff69b4'}}>{prediction.totalPoints || 0} pts</span>
                    </div>
                  ))}
                  {predictions.length === 0 && <p className="py-10 text-center text-sm" style={{color:'rgba(255,105,180,0.4)'}}>Aún no tienes predicciones</p>}
                </div>
              </div>

              <div className="rounded-2xl p-4" style={{background:'rgba(18,0,13,0.7)', border:'1px solid rgba(255,0,255,0.12)'}}>
                <h2 className="mb-4 text-base font-bold text-white">Mis premios</h2>
                <div className="space-y-3">
                  {winnings.map((w) => (
                    <div key={w.id} className="relative rounded-2xl overflow-hidden" style={w.claimed ? {background:'rgba(34,197,94,0.05)', border:'1px solid rgba(34,197,94,0.2)'} : {background:'rgba(255,20,147,0.1)', border:'1px solid rgba(255,0,255,0.25)'}}>
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-white">#{w.rank} - {w.prizeLabel || formatPrize(w.prizeType)}</p>
                          <code className="mt-1 block text-lg font-black tracking-widest" style={{color: w.claimed ? '#4ade80' : '#ff69b4'}}>{w.code}</code>
                        </div>
                        <div className="text-right">
                          <span className="block text-xs font-bold mb-2" style={w.claimed ? {color:'#4ade80'} : {color:'#ff69b4'}}>{w.claimed ? "Redimido" : "Pendiente por canjear"}</span>
                          {!w.claimed && (
                            <button onClick={() => setSelectedPrize(w)} className="w-full sm:w-auto px-6 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105" style={{background:'linear-gradient(135deg, #ff1493, #c500ff)', boxShadow:'0 4px 15px rgba(255,20,147,0.4)'}}>
                              Canjear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {winnings.length === 0 && <p className="py-10 text-center text-sm" style={{color:'rgba(255,105,180,0.4)'}}>Aún no tienes premios registrados</p>}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Modal Canjear */}
      {selectedPrize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl overflow-hidden relative" style={{background:'linear-gradient(160deg, #1a0013 0%, #0a0008 100%)', border:'1px solid rgba(255,0,255,0.3)', boxShadow:'0 20px 50px rgba(255,20,147,0.3)'}}>
            {/* Header del Ticket */}
            <div className="p-6 text-center border-b" style={{borderColor:'rgba(255,0,255,0.1)'}}>
              <h2 className="text-2xl font-black text-white">🏆 ¡Ganaste!</h2>
              <p className="text-sm mt-1" style={{color:'rgba(255,105,180,0.7)'}}>Muestra este código en la tienda física</p>
            </div>
            
            {/* Body del Ticket */}
            <div className="p-8 text-center bg-white/5 relative">
              <div className="absolute -left-4 top-1/2 w-8 h-8 rounded-full bg-black border-r border-pink-500/30 transform -translate-y-1/2"></div>
              <div className="absolute -right-4 top-1/2 w-8 h-8 rounded-full bg-black border-l border-pink-500/30 transform -translate-y-1/2"></div>
              
              <h3 className="text-3xl font-black mb-4" style={{color:'#ff69b4'}}>{selectedPrize.prizeLabel || formatPrize(selectedPrize.prizeType)}</h3>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Código Único</p>
              <div className="bg-black/50 p-4 rounded-xl border border-pink-500/30">
                <code className="text-3xl font-mono text-white tracking-widest">{selectedPrize.code}</code>
              </div>
              <p className="text-xs text-gray-400 mt-4">Solo se puede usar una vez. Al verificarlo, se invalidará automáticamente.</p>
            </div>

            {/* Footer */}
            <div className="p-6 flex flex-col gap-3">
              <button onClick={() => window.print()} className="w-full py-3 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 transition-all border border-white/20">
                Descargar / Imprimir
              </button>
              <button onClick={() => setSelectedPrize(null)} className="w-full py-3 rounded-xl font-bold text-white bg-pink-600 hover:bg-pink-700 transition-all">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function Sidebar({ active }: { active: string }) {
  const router = useRouter();
  const nav = [
    { label: "Inicio", path: "/dashboard", icon: "🏠" },
    { label: "Partidos", path: "/dashboard", icon: "⚽" },
    { label: "Clasificación", path: "/ranking", icon: "🏆" },
    { label: "Perfil", path: "/perfil", icon: "👤" },
  ];
  return (
    <aside className="hidden w-[244px] shrink-0 lg:flex lg:flex-col" style={{borderRight:'1px solid rgba(255,0,255,0.1)', background:'rgba(10,0,8,0.9)', backdropFilter:'blur(20px)'}}>
      <div className="flex h-16 items-center gap-3 px-5" style={{borderBottom:'1px solid rgba(255,0,255,0.1)'}}>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black text-white" style={{background:'linear-gradient(135deg, #ff1493, #c500ff)'}}>⚽</div>
        <div className="text-lg font-black" style={{background:'linear-gradient(90deg, #fff, #ff69b4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Fantasy Mundial</div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map((item) => (
          <button key={item.label} onClick={() => router.push(item.path)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition"
            style={active === item.label ? {background:'rgba(255,20,147,0.2)', color:'#ff69b4', borderLeft:'2px solid #ff1493'} : {color:'rgba(255,105,180,0.5)'}}>
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{background:'rgba(255,0,255,0.03)', border:'1px solid rgba(255,0,255,0.08)'}}>
      <p className="text-lg font-black" style={accent ? {color:'#ff69b4'} : {color:'#fff'}}>{value}</p>
      <p className="mt-1 text-[11px]" style={{color:'rgba(255,105,180,0.5)'}}>{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between pb-3 text-sm last:border-b-0 last:pb-0" style={{borderBottom:'1px solid rgba(255,0,255,0.08)'}}>
      <span style={{color:'rgba(255,105,180,0.5)'}}>{label}</span>
      <span className="max-w-[190px] truncate font-semibold text-white">{value}</span>
    </div>
  );
}

function formatPrize(type: string) {
  if (type === "toy") return "Juguete";
  if (type === "bonus_100k") return "Bono $100.000";
  if (type === "bonus_50k") return "Bono $50.000";
  if (type === "bonus_20k") return "Bono $20.000";
  return "10% descuento";
}
