"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePageLoader } from "@/lib/navigation-loading";

interface RankingEntry {
  rank: number;
  userId: string;
  name: string;
  city: string;
  points: number;
}

export default function RankingPage() {
  const router = useRouter();
  const { showLoader, hideLoader } = usePageLoader();
  const initialLoad = useRef(true);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekId, setCurrentWeekId] = useState<string | null>(null);
  const [previousWeekId, setPreviousWeekId] = useState<string | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);

  async function fetchData() {
    try {
      const currentRes = await fetch("/api/weeks/current");
      const currentData = await currentRes.json();

      const historyRes = await fetch("/api/weeks/history");
      const historyData = await historyRes.json();
      const closedWeeks = (historyData.weeks || []) as { id: string; number: number; startDate: string; endDate: string; isClosed: boolean }[];

      const curId = currentData.week?.id || null;
      const prevId = closedWeeks.length > 0 ? closedWeeks[0].id : null;

      setCurrentWeekId(curId);
      setPreviousWeekId(prevId);

      if (!selectedWeekId) {
        setSelectedWeekId(curId || prevId);
      }
    } catch {}
  }

  async function fetchRankings(weekId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/ranking/week/${weekId}`);
      const data = await res.json();
      setRankings(data.rankings || []);
    } catch {
      setRankings([]);
    }
    setLoading(false);
    if (initialLoad.current) { initialLoad.current = false; hideLoader(); }
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedWeekId) fetchRankings(selectedWeekId);
  }, [selectedWeekId]);

  const topThree = rankings.slice(0, 3);
  const isLiveWeek = selectedWeekId === currentWeekId;

  return (
    <div className="min-h-screen lg:flex bg-ranking">
      <Sidebar active="Clasificacion" />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1200px] px-4 py-5 lg:px-6">
          <header className="mb-5 flex min-h-14 items-center justify-between gap-4 pb-4" style={{borderBottom:'1px solid rgba(255,0,255,0.1)'}}>
            <div>
              <p className="text-xs uppercase lg:hidden" style={{color:'rgba(255,105,180,0.5)'}}>Fantasy Mundial</p>
              <h1 className="text-lg font-bold text-white">Clasificación</h1>
              <p className="text-xs" style={{color:'rgba(255,105,180,0.5)'}}>{isLiveWeek ? "Semana actual en vivo" : "Semana anterior"}</p>
            </div>
            <button onClick={() => { showLoader(); router.push("/dashboard"); }} className="rounded-lg px-3 py-2 text-xs font-bold transition-opacity hover:opacity-80" style={{border:'1px solid rgba(255,0,255,0.2)', color:'#ff69b4'}}>
              Partidos
            </button>
          </header>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {currentWeekId && (
              <button
                onClick={() => setSelectedWeekId(currentWeekId)}
                className="shrink-0 rounded-xl px-5 py-2 text-xs font-bold whitespace-nowrap transition-all"
                style={isLiveWeek
                  ? { background: 'linear-gradient(135deg,#ff1493,#c500ff)', color: '#fff', boxShadow: '0 4px 12px rgba(255,20,147,0.4)' }
                  : { background: 'rgba(255,0,255,0.05)', border: '1px solid rgba(255,0,255,0.15)', color: '#ff69b4' }}
              >
                🔴 Semana actual
              </button>
            )}
            {previousWeekId && (
              <button
                onClick={() => setSelectedWeekId(previousWeekId)}
                className="shrink-0 rounded-xl px-5 py-2 text-xs font-bold whitespace-nowrap transition-all"
                style={!isLiveWeek && selectedWeekId === previousWeekId
                  ? { background: 'linear-gradient(135deg,#ff1493,#c500ff)', color: '#fff', boxShadow: '0 4px 12px rgba(255,20,147,0.4)' }
                  : { background: 'rgba(255,0,255,0.05)', border: '1px solid rgba(255,0,255,0.15)', color: 'rgba(255,105,180,0.5)' }}
              >
                Semana anterior
              </button>
            )}
          </div>

          {loading ? (
            <div className="rounded-2xl p-10 text-center text-sm" style={{background:'rgba(18,0,13,0.7)', border:'1px solid rgba(255,0,255,0.1)', color:'rgba(255,105,180,0.5)'}}>Cargando tabla...</div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
              <section className="rounded-2xl p-5" style={{background:'rgba(18,0,13,0.7)', border:'1px solid rgba(255,0,255,0.12)'}}>
                <h2 className="mb-5 text-base font-bold text-white">Podio {isLiveWeek ? "semana actual" : "semana anterior"}</h2>
                {topThree.length > 0 ? (
                  <div className="space-y-3">
                    {topThree.map((entry, index) => (
                      <PodiumRow key={entry.userId} entry={entry} index={index} />
                    ))}
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm" style={{color:'rgba(255,105,180,0.4)'}}>Aún no hay predicciones esta semana</p>
                )}
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <MiniStat label="Jugadores" value={rankings.length} />
                  <MiniStat label="Líder" value={rankings[0]?.points || 0} />
                  <MiniStat label="Top 3" value={topThree.length} />
                </div>
              </section>

              <section className="rounded-2xl p-4" style={{background:'rgba(18,0,13,0.7)', border:'1px solid rgba(255,0,255,0.12)'}}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">Todos los participantes</h2>
                  <span className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{background:'rgba(255,0,255,0.05)', color:'rgba(255,105,180,0.6)'}}>{rankings.length} total</span>
                </div>
                <div className="space-y-2">
                  {rankings.map((entry, index) => (
                    <div key={entry.userId} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-3"
                      style={index === 0 ? {background:'rgba(255,20,147,0.12)', border:'1px solid rgba(255,0,255,0.2)'} : index === 1 ? {background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,0,255,0.12)'} : index === 2 ? {background:'rgba(197,0,255,0.08)', border:'1px solid rgba(255,0,255,0.12)'} : {background:'rgba(255,0,255,0.025)', border:'1px solid rgba(255,0,255,0.08)'}}>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black" style={index === 0 ? {background:'linear-gradient(135deg,#ff1493,#c500ff)', color:'#fff'} : index === 1 ? {background:'rgba(255,255,255,0.1)', color:'#fff'} : index === 2 ? {background:'rgba(197,0,255,0.2)', color:'#c4b5fd'} : {background:'rgba(255,255,255,0.06)', color:'#fff'}}>
                        {entry.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{entry.name}</p>
                        {entry.city && <p className="text-xs" style={{color:'rgba(255,105,180,0.5)'}}>{entry.city}</p>}
                      </div>
                      <p className="text-sm font-black tabular-nums text-white">{entry.points} pts</p>
                    </div>
                  ))}
                  {rankings.length === 0 && <p className="py-12 text-center text-sm" style={{color:'rgba(255,105,180,0.4)'}}>Sin datos aún</p>}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Sidebar({ active }: { active: string }) {
  const router = useRouter();
  const { showLoader } = usePageLoader();
  const nav = [
    { label: "Inicio", path: "/dashboard", icon: "🏠" },
    { label: "Partidos", path: "/dashboard", icon: "⚽" },
    { label: "Clasificación", path: "/ranking", icon: "🏆" },
    { label: "Mis Premios", path: "/mis-premios", icon: "🎁" },
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
          <button key={item.label} onClick={() => { showLoader(); router.push(item.path); }}
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

function PodiumRow({ entry, index }: { entry: RankingEntry; index: number }) {
  const styles = [
    {background:'rgba(255,20,147,0.12)', border:'1px solid rgba(255,0,255,0.25)'},
    {background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,0,255,0.12)'},
    {background:'rgba(197,0,255,0.08)', border:'1px solid rgba(255,0,255,0.12)'},
  ];
  return (
    <div className="rounded-xl p-4" style={styles[index]}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black" style={index === 0 ? {background:'linear-gradient(135deg,#ff1493,#c500ff)', color:'#fff'} : {background:'rgba(255,255,255,0.08)', color:'#fff'}}>
          {entry.rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-white">{entry.name}</p>
          <p className="text-xs" style={{color:'rgba(255,105,180,0.5)'}}>{entry.city || "Participante"}</p>
        </div>
        <p className="text-lg font-black tabular-nums text-white">{entry.points}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{background:'rgba(255,0,255,0.03)', border:'1px solid rgba(255,0,255,0.08)'}}>
      <p className="text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[11px]" style={{color:'rgba(255,105,180,0.5)'}}>{label}</p>
    </div>
  );
}
