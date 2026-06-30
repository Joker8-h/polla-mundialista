"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getFlagUrl } from "@/lib/flags";

interface MatchData {
  id: string;
  apiMatchId: number;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  matchDate: string;
  status: string;
  groupName: string | null;
  roundNumber: number | null;
  homeScore: number | null;
  awayScore: number | null;
  currentMinute: number | null;
}

interface RankingEntry {
  rank: number;
  userId: string;
  name: string;
  city: string;
  points: number;
}

interface WeekInfo {
  id: string;
  number: number;
  startDate: string;
  endDate: string;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Cargando partidos..." />}>
      <DashboardContent />
    </Suspense>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{background:'#0a0008'}}>
      <div className="rounded-2xl px-6 py-5 text-center" style={{background:'rgba(18,0,13,0.95)', border:'1px solid rgba(255,0,255,0.15)'}}>
        <div className="mx-auto mb-3 h-8 w-8 rounded-lg" style={{background:'linear-gradient(135deg, #ff1493, #c500ff)'}} />
        <p className="text-sm" style={{color:'rgba(255,255,255,0.6)'}}>{label}</p>
      </div>
    </div>
  );
}

function getWeekDays(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(d));
  }
  return days;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paidParam = searchParams.get("paid") === "true";
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [paidDays, setPaidDays] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paidMsg, setPaidMsg] = useState(paidParam);
  const [week, setWeek] = useState<WeekInfo | null>(null);

  async function fetchData() {
    try {
      const weekRes = await fetch("/api/weeks/current");
      const weekData = await weekRes.json();
      if (!weekData.week?.id) { setLoading(false); return; }
      const w = weekData.week as WeekInfo;
      setWeek(w);

      const [matchRes, rankRes] = await Promise.all([
        fetch(`/api/matches/week/${w.id}`),
        fetch(`/api/ranking/week/${w.id}`)
      ]);
      const matchData = await matchRes.json();
      const rankData = await rankRes.json();
      setMatches(matchData.matches || []);
      setRankings(rankData.rankings || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (matches.length > 0 && !selectedDay) {
      const todayCol = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
      setSelectedDay(todayCol);
    }
  }, [matches, selectedDay]);

  useEffect(() => {
    if (!paidMsg) return;
    const timeout = window.setTimeout(() => setPaidMsg(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [paidMsg]);

  const groupedMatches = useMemo(() => {
    const groups: Record<string, MatchData[]> = {};
    for (const match of matches) {
      const key = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(match.matchDate));
      if (!groups[key]) groups[key] = [];
      groups[key].push(match);
    }
    return groups;
  }, [matches]);

  const weekDays = week ? getWeekDays(week.startDate, week.endDate) : [];
  const dayKeys = weekDays.filter(d => groupedMatches[d]);
  const activeDayKey = selectedDay && dayKeys.includes(selectedDay) ? selectedDay : (dayKeys[0] ?? null);
  const visibleMatches = activeDayKey ? (groupedMatches[activeDayKey] ?? []) : [];
  const isDayPaid = activeDayKey ? paidDays.includes(activeDayKey) : false;

  const featuredMatch = visibleMatches[0];
  const liveCount = visibleMatches.filter((m) => m.status === "live" || m.status === "inprogress").length;
  const finishedCount = visibleMatches.filter((m) => m.status === "finished").length;

  const handlePay = async (type: "daily" | "weekly") => {
    setPaying(true);
    try {
      const res = await fetch("/api/payments/create-checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setPaying(false);
    }
  };

  if (loading) return <LoadingScreen label="Cargando partidos..." />;

  return (
    <AppShell active="Partidos">
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1500px] px-4 py-5 lg:px-6">
          <HeaderBar title="Fantasy Mundial" subtitle="Predice y gana premios semanales" />

          {paidMsg && (
            <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{background:'rgba(255,20,147,0.15)', border:'1px solid rgba(255,20,147,0.3)', color:'#ff69b4'}}>
              ✅ Pago confirmado. Ya puedes predecir los partidos del día.
            </div>
          )}

          {dayKeys.length > 1 && (
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
              {dayKeys.map((dk) => {
                const d = new Date(dk + "T12:00:00-05:00");
                const label = d.toLocaleDateString("es-CO", { timeZone: "America/Bogota", weekday: "short", day: "numeric", month: "short" });
                const paid = paidDays.includes(dk);
                const isActive = dk === activeDayKey;
                return (
                  <button
                    key={dk}
                    onClick={() => setSelectedDay(dk)}
                    className="shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all"
                    style={isActive
                      ? { background: 'linear-gradient(135deg,#ff1493,#c500ff)', color: '#fff', boxShadow: '0 4px 12px rgba(255,20,147,0.4)' }
                      : { background: 'rgba(255,0,255,0.05)', border: '1px solid rgba(255,0,255,0.15)', color: paid ? '#ff69b4' : 'rgba(255,105,180,0.5)' }}
                  >
                    {label} {paid ? "✓" : "🔒"}
                  </button>
                );
              })}
            </div>
          )}

          {!week && (
            <div className="rounded-2xl p-10 text-center" style={{background:'rgba(18,0,13,0.7)', border:'1px solid rgba(255,0,255,0.1)'}}>
              <p className="text-lg font-bold text-white">No hay semana activa</p>
              <p className="mt-2 text-sm" style={{color:'rgba(255,105,180,0.4)'}}>La semana se creará automáticamente cuando comience el Mundial.</p>
            </div>
          )}

          {week && <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0 space-y-5">
              {featuredMatch ? (
                <FeaturedMatch match={featuredMatch} onOpen={() => router.push(`/match/${featuredMatch.id}`)} />
              ) : (
                <EmptyPanel title="No hay partidos hoy" text="Los partidos se sincronizan automáticamente." />
              )}

              {!isDayPaid && visibleMatches.length > 0 && (
                <div className="rounded-2xl p-4" style={{background:'rgba(255,20,147,0.1)', border:'1px solid rgba(255,20,147,0.25)'}}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-bold" style={{color:'#ff69b4'}}>🔒 Desbloquea tus predicciones</p>
                      <p className="mt-1 text-sm" style={{color:'rgba(255,105,180,0.6)'}}>Paga por el día o por toda la semana y compite por puntos.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:w-[320px]">
                      <button onClick={() => handlePay("daily")} disabled={paying}
                        className="rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-50 transition-all pink-button">
                        Día $2.000
                      </button>
                      <button onClick={() => handlePay("weekly")} disabled={paying}
                        className="rounded-xl px-4 py-3 text-sm font-black disabled:opacity-50 transition-all"
                        style={{background:'rgba(255,0,255,0.1)', border:'1px solid rgba(255,0,255,0.25)', color:'#ff69b4'}}>
                        Semana $14.000
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <MetricCard label="Partidos" value={visibleMatches.length} />
                <MetricCard label="En vivo" value={liveCount} accent="live" />
                <MetricCard label="Finalizados" value={finishedCount} accent="done" />
              </div>

              <section className="rounded-2xl p-4" style={{background:'rgba(18,0,13,0.7)', border:'1px solid rgba(255,0,255,0.1)'}}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white">Calendario de la semana</h2>
                    <p className="text-xs" style={{color:'rgba(255,105,180,0.5)'}}>{weekDays[0] ? new Date(weekDays[0]+"T12:00:00-05:00").toLocaleDateString("es-CO",{day:"numeric",month:"short"}) : ""} - {weekDays[weekDays.length-1] ? new Date(weekDays[weekDays.length-1]+"T12:00:00-05:00").toLocaleDateString("es-CO",{day:"numeric",month:"short"}) : ""}</p>
                  </div>
                  <span className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{background:'rgba(255,0,255,0.05)', color: isDayPaid ? '#ff69b4' : 'rgba(255,105,180,0.5)'}}>
                    {isDayPaid ? "✓ Activo" : "🔒 Bloqueado"}
                  </span>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {visibleMatches.map((match) => (
                    <MatchCard key={match.id} match={match} locked={!isDayPaid} onOpen={() => router.push(`/match/${match.id}`)} />
                  ))}
                </div>
              </section>
            </section>

            <aside className="space-y-5">
              <RankingPanel rankings={rankings} onOpen={() => router.push("/ranking")} />
              <UpcomingPanel matches={matches.slice(0, 5)} onOpen={(id) => router.push(`/match/${id}`)} />
              <InfoPanel />
            </aside>
          </div>}
        </div>
      </main>
    </AppShell>
  );
}

function AppShell({ active, children }: { active: string; children: React.ReactNode }) {
  const router = useRouter();
  const nav = [
    { label: "Inicio", path: "/dashboard", icon: "🏠" },
    { label: "Partidos", path: "/dashboard", icon: "⚽" },
    { label: "Clasificación", path: "/ranking", icon: "🏆" },
    { label: "Mis Premios", path: "/mis-premios", icon: "🎁" },
    { label: "Perfil", path: "/perfil", icon: "👤" },
  ];

  return (
    <div className="min-h-screen lg:flex relative bg-dashboard">
      <aside className="hidden w-[244px] shrink-0 lg:flex lg:flex-col relative z-10" style={{borderRight:'1px solid rgba(255,0,255,0.1)', background:'rgba(10,0,8,0.9)', backdropFilter:'blur(20px)'}}>
        <div className="flex h-16 items-center gap-3 px-5" style={{borderBottom:'1px solid rgba(255,0,255,0.1)'}}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black text-white" style={{background:'linear-gradient(135deg, #ff1493, #c500ff)'}}>⚽</div>
          <div className="text-lg font-black" style={{background:'linear-gradient(90deg, #fff, #ff69b4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Fantasy Mundial</div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition"
              style={active === item.label || (active === "Partidos" && item.label === "Inicio")
                ? { background: 'rgba(255,20,147,0.2)', color: '#ff69b4', borderLeft: '2px solid #ff1493' }
                : { color: 'rgba(255,105,180,0.5)' }}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="m-3 rounded-xl p-4" style={{border:'1px solid rgba(255,0,255,0.12)', background:'rgba(255,20,147,0.08)'}}>
          <p className="text-sm font-bold text-white">Fantasy Mundial</p>
          <p className="mt-2 text-xs" style={{color:'rgba(255,105,180,0.5)'}}>Copa Mundial FIFA 2026</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => router.push("/ranking")} className="flex-1 rounded-lg px-3 py-2 text-xs font-bold text-white hover:opacity-80 transition-opacity" style={{border:'1px solid rgba(255,255,255,0.15)'}}>
              Ranking
            </button>
            <button onClick={() => router.push("/mis-premios")} className="flex-1 rounded-lg px-3 py-2 text-xs font-bold text-white hover:opacity-80 transition-opacity" style={{border:'1px solid rgba(255,20,147,0.3)', background:'rgba(255,20,147,0.15)'}}>
              Premios
            </button>
          </div>
        </div>
      </aside>
      {children}
    </div>
  );
}

function HeaderBar({ title, subtitle }: { title: string; subtitle: string }) {
  const router = useRouter();
  return (
    <header className="mb-5 flex min-h-14 items-center justify-between gap-4 pb-4" style={{borderBottom:'1px solid rgba(255,0,255,0.1)'}}>
      <div>
        <p className="text-xs uppercase lg:hidden" style={{color:'rgba(255,105,180,0.5)'}}>Fantasy Mundial</p>
        <h1 className="text-lg font-bold text-white">{title}</h1>
        <p className="text-xs" style={{color:'rgba(255,105,180,0.5)'}}>{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => router.push("/mis-premios")} className="rounded-lg px-3 py-2 text-xs font-bold transition-opacity hover:opacity-80" style={{border:'1px solid rgba(255,0,255,0.2)', color:'#ff69b4'}}>
          Premios
        </button>
        <button onClick={() => router.push("/ranking")} className="rounded-lg px-3 py-2 text-xs font-bold transition-opacity hover:opacity-80" style={{border:'1px solid rgba(255,0,255,0.2)', color:'#ff69b4'}}>
          Ranking
        </button>
        <button onClick={() => router.push("/perfil")} className="rounded-lg px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-80 pink-button">
          Perfil
        </button>
      </div>
    </header>
  );
}

function FeaturedMatch({ match, onOpen }: { match: MatchData; onOpen: () => void }) {
  const isFinished = match.status === "finished";
  const isLive = match.status === "live" || match.status === "inprogress";
  const date = new Date(match.matchDate);
  return (
    <button onClick={onOpen} className="w-full rounded-2xl p-5 text-left transition-all hover:scale-[1.01]" style={{background:'rgba(18,0,13,0.8)', border:'1px solid rgba(255,0,255,0.15)', boxShadow:'0 8px 32px rgba(255,20,147,0.1)'}}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs" style={{color:'rgba(255,105,180,0.5)'}}>Partido destacado</p>
          <p className="mt-1 text-sm" style={{color:'rgba(255,105,180,0.4)'}}>{match.groupName || `Jornada ${match.roundNumber || "-"}`} · {date.toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}</p>
        </div>
        <StatusBadge status={match.status} time={date} minute={match.currentMinute} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-8">
        <TeamBlock name={match.homeTeam} align="right" />
        <div className="text-center">
          {isFinished || isLive ? (
            <div className="flex items-center gap-3 text-4xl font-black tabular-nums text-white md:text-6xl">
              <span>{match.homeScore ?? "-"}</span>
              <span style={{color:'rgba(255,0,255,0.4)'}}>-</span>
              <span>{match.awayScore ?? "-"}</span>
            </div>
          ) : (
            <div className="rounded-xl px-6 py-3 text-xl font-black" style={{background:'rgba(255,20,147,0.15)', border:'1px solid rgba(255,0,255,0.2)', color:'#ff69b4'}}>VS</div>
          )}
          <p className="mt-2 text-xs" style={{color:'rgba(255,105,180,0.4)'}}>{date.toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <TeamBlock name={match.awayTeam} align="left" />
      </div>
    </button>
  );
}

function TeamBlock({ name, align }: { name: string; align: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "justify-end text-right" : "justify-start text-left"}`}>
      {align === "left" && <Flag name={name} />}
      <p className="min-w-0 truncate text-base font-black text-white md:text-2xl">{name}</p>
      {align === "right" && <Flag name={name} />}
    </div>
  );
}

function Flag({ name }: { name: string }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full" style={{border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)'}}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={getFlagUrl(name)} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

function MatchCard({ match, locked, onOpen }: { match: MatchData; locked: boolean; onOpen: () => void }) {
  const date = new Date(match.matchDate);
  const isScored = match.status === "finished" || match.status === "live" || match.status === "inprogress";
  const isPast = new Date() > date;
  const effectiveLock = locked || isPast || isScored;
  return (
    <button onClick={onOpen} className="rounded-xl p-3 text-left transition-all hover:scale-[1.01]" style={{background:'rgba(18,0,13,0.6)', border:'1px solid rgba(255,0,255,0.1)'}}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs" style={{color:'rgba(255,105,180,0.4)'}}>{match.groupName || `Ronda ${match.roundNumber || "-"}`}</span>
        <StatusBadge status={match.status} time={date} minute={match.currentMinute} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <MiniTeam name={match.homeTeam} />
        <div className="min-w-16 text-center">
          {isScored ? (
            <span className="text-lg font-black tabular-nums text-white">{match.homeScore ?? "-"} - {match.awayScore ?? "-"}</span>
          ) : (
            <span className="rounded-md px-2 py-1 text-xs font-black" style={{background:'rgba(255,20,147,0.15)', color:'#ff69b4'}}>VS</span>
          )}
        </div>
        <MiniTeam name={match.awayTeam} reverse />
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg px-3 py-2" style={{background:'rgba(255,0,255,0.04)'}}>
        <span className="text-xs font-bold" style={{color: effectiveLock ? 'rgba(255,105,180,0.5)' : '#ff69b4'}}>
          {(isPast || isScored) ? "Partido cerrado" : locked ? "🔒 Paga para predecir" : "✏️ Predecir"}
        </span>
        <span className="text-xs" style={{color:'rgba(255,105,180,0.35)'}}>Abrir →</span>
      </div>
    </button>
  );
}

function MiniTeam({ name, reverse = false }: { name: string; reverse?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${reverse ? "justify-end text-right" : ""}`}>
      {!reverse && <Flag name={name} />}
      <span className="truncate text-sm font-bold text-white">{name}</span>
      {reverse && <Flag name={name} />}
    </div>
  );
}

function StatusBadge({ status, time, minute }: { status: string; time: Date; minute?: number | null }) {
  const live = status === "live" || status === "inprogress";
  const finished = status === "finished";
  const bgStyle = live
    ? { background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }
    : finished
    ? { background: 'rgba(100,116,139,0.15)', color: '#cbd5e1' }
    : { background: 'rgba(255,20,147,0.15)', color: '#ff69b4' };
  return (
    <span className="rounded-full px-2.5 py-1 text-[11px] font-black" style={bgStyle}>
      {live ? (minute ? `🔴 EN VIVO - ${minute}'` : "🔴 EN VIVO") : finished ? "FINAL" : time.toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

function MetricCard({ label, value, accent = "pink" }: { label: string; value: number; accent?: "pink" | "live" | "done" }) {
  const color = accent === "live" ? '#fca5a5' : accent === "done" ? '#94a3b8' : '#ff69b4';
  return (
    <div className="rounded-xl p-4" style={{background:'rgba(18,0,13,0.6)', border:'1px solid rgba(255,0,255,0.1)'}}>
      <p className="text-2xl font-black" style={{color}}>{value}</p>
      <p className="mt-1 text-xs" style={{color:'rgba(255,105,180,0.5)'}}>{label}</p>
    </div>
  );
}

function RankingPanel({ rankings, onOpen }: { rankings: RankingEntry[]; onOpen: () => void }) {
  return (
    <section className="rounded-2xl p-4" style={{background:'rgba(18,0,13,0.7)', border:'1px solid rgba(255,0,255,0.1)'}}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-white">Clasificación</h2>
        <button onClick={onOpen} className="text-xs font-bold hover:opacity-80" style={{color:'#ff69b4'}}>Ver completa</button>
      </div>
      <div className="space-y-2">
        {rankings.slice(0, 5).map((entry, index) => (
          <div key={entry.userId || `rank-${index}`} className="flex items-center gap-3 rounded-xl px-3 py-2" style={index === 0 ? {background:'rgba(255,20,147,0.15)', border:'1px solid rgba(255,0,255,0.2)'} : {background:'rgba(255,0,255,0.03)'}}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black" style={index === 0 ? {background:'linear-gradient(135deg,#ff1493,#c500ff)', color:'#fff'} : index === 1 ? {background:'rgba(255,255,255,0.1)', color:'#e2e8f0'} : {background:'rgba(255,255,255,0.06)', color:'#fff'}}>{entry.rank}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{entry.name}</p>
              {entry.city && <p className="text-xs" style={{color:'rgba(255,105,180,0.5)'}}>{entry.city}</p>}
            </div>
            <span className="text-sm font-black tabular-nums" style={{color:'#ff69b4'}}>{entry.points} pts</span>
          </div>
        ))}
        {rankings.length === 0 && <p className="py-4 text-center text-sm" style={{color:'rgba(255,105,180,0.4)'}}>Sin datos aún</p>}
      </div>
    </section>
  );
}

function UpcomingPanel({ matches, onOpen }: { matches: MatchData[]; onOpen: (id: string) => void }) {
  return (
    <section className="rounded-2xl p-4" style={{background:'rgba(18,0,13,0.7)', border:'1px solid rgba(255,0,255,0.1)'}}>
      <h2 className="mb-4 text-base font-bold text-white">Próximos partidos</h2>
      <div className="space-y-2">
        {matches.map((match) => {
          const date = new Date(match.matchDate);
          return (
            <button key={match.id} onClick={() => onOpen(match.id)} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left transition-all hover:opacity-80" style={{border:'1px solid rgba(255,0,255,0.08)', background:'rgba(255,0,255,0.03)'}}>
              <span className="w-20 text-xs" style={{color:'rgba(255,105,180,0.5)'}}>{date.toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "2-digit" })} - {date.toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" })}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{match.homeTeam} vs {match.awayTeam}</span>
              <span className="text-xs" style={{color:'#ff69b4'}}>→</span>
            </button>
          );
        })}
        {matches.length === 0 && <p className="py-3 text-center text-sm" style={{color:'rgba(255,105,180,0.4)'}}>Sin próximos partidos</p>}
      </div>
    </section>
  );
}

function InfoPanel() {
  const rows = [
    ["Nombre", "Fantasy Mundial"],
    ["Edición", "2026"],
    ["Sistema", "13 campos"],
    ["Max. puntos", "42 pts"],
  ];
  return (
    <section className="rounded-2xl p-4" style={{background:'rgba(18,0,13,0.7)', border:'1px solid rgba(255,0,255,0.1)'}}>
      <h2 className="mb-4 text-base font-bold text-white">Información</h2>
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span style={{color:'rgba(255,105,180,0.5)'}}>{label}</span>
            <span className="font-semibold text-white">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl p-8 text-center" style={{background:'rgba(18,0,13,0.7)', border:'1px solid rgba(255,0,255,0.1)'}}>
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="mt-2 text-sm" style={{color:'rgba(255,105,180,0.4)'}}>{text}</p>
    </div>
  );
}
