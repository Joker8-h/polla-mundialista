"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { getFlagUrl } from "@/lib/flags";

interface MatchDetail {
  id: string; apiMatchId: number; homeTeam: string; awayTeam: string;
  homeTeamId: number; awayTeamId: number; matchDate: string;
  status: string; groupName: string | null; roundNumber: number | null;
  homeScore: number | null; awayScore: number | null;
  homeTeamImageUrl: string; awayTeamImageUrl: string;
  totalShots: number | null; shotsOnGoal: number | null; fouls: number | null;
  yellowCards: number | null; redCards: number | null; saves: number | null;
  accuratePass: number | null; totalCross: number | null; substitutions: number | null;
  currentMinute: number | null;
}

interface LiveStats {
  home: { totalShots: number; shotsOnGoal: number; fouls: number; yellowCards: number; redCards: number; saves: number; accuratePass: number; totalCross: number; substitutions: number };
  away: { totalShots: number; shotsOnGoal: number; fouls: number; yellowCards: number; redCards: number; saves: number; accuratePass: number; totalCross: number; substitutions: number };
}

interface PredictionPoints {
  homeScorePts: number; winnerPts: number; goalscorerPts: number;
  totalShotsPts: number; shotsOnGoalPts: number; savesPts: number;
  foulsPts: number; yellowCardsPts: number; redCardsPts: number;
  substitutionsPts: number; accuratePassPts: number; totalCrossPts: number;
  totalPoints: number;
}

interface Prediction {
  id: string; homeScore: number; awayScore: number; winner: string | null;
  goalscorer: string | null; totalShots: number; shotsOnGoal: number; saves: number;
  fouls: number; yellowCards: number; redCards: number; substitutions: number;
  accuratePass: number; totalCross: number;
  points?: PredictionPoints;
}

interface PublicPrediction {
  name: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number;
}

interface Incident {
  type: string; minute: number; player?: string; player_id?: number; is_home?: boolean;
  card_type?: string; goal_type?: string;
}

interface LineupPlayer {
  id: number; name: string; short_name: string; position: string; jersey_number: number;
}

interface Lineups {
  lineup_status: string;
  lineups: {
    home: { team_id: number; team_name: string; formation: string; players: LineupPlayer[]; substitutes: LineupPlayer[] };
    away: { team_id: number; team_name: string; formation: string; players: LineupPlayer[]; substitutes: LineupPlayer[] };
  };
}

interface RankingEntry {
  name: string;
  totalPoints: number;
}

interface UpcomingMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}

interface TeamPlayers { teamName: string; players: { id: number; name: string }[] }
interface PlayersData { home: TeamPlayers; away: TeamPlayers }

interface GoalScorer {
  player: string;
  count: number;
}

export default function MatchPage() {
  return <Suspense fallback={<Loading />}><MatchContent /></Suspense>;
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="text-center space-y-4">
        <div className="text-5xl animate-bounce">⚽</div>
        <p className="text-sm" style={{color:'rgba(255,105,180,0.7)'}}>Cargando partido...</p>
      </div>
    </div>
  );
}

function MatchContent() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [lineups, setLineups] = useState<Lineups | null>(null);
  const [goalScorers, setGoalScorers] = useState<GoalScorer[]>([]);
  const [userPrediction, setUserPrediction] = useState<Prediction | null>(null);
  const [allPredictions, setAllPredictions] = useState<PublicPrediction[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [weekRanking, setWeekRanking] = useState<RankingEntry[]>([]);
  const [players, setPlayers] = useState<PlayersData | null>(null);
  const [activeTab, setActiveTab] = useState("resumen");
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [showPredictionForm, setShowPredictionForm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}/detail`, { credentials: "include" });
      if (res.status === 401) { setAuthRequired(true); setLoading(false); return; }
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      setMatch(data.match);
      setLiveStats(data.liveStats);
      setIncidents(data.incidents || []);
      setLineups(data.lineups);
      setGoalScorers(data.goalScorers || []);
      setUserPrediction(data.userPrediction);
      setAllPredictions(data.allPredictions || []);
      setUpcomingMatches(data.upcomingMatches || []);
      setWeekRanking(data.weekRanking || []);
      setPlayers(data.players || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [matchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!match) return;
    if (match.status !== "live" && match.status !== "inprogress") return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [match, fetchData]);

  if (authRequired) {
    return (
      <div className="min-h-screen px-4 py-6 flex items-center justify-center bg-transparent">
        <div className="mx-auto max-w-md rounded-2xl p-6 text-center" style={{background:'rgba(18,0,13,0.95)', border:'1px solid rgba(255,0,255,0.15)'}}>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-sm font-black text-white" style={{background:'linear-gradient(135deg,#ff1493,#c500ff)'}}>⚽</div>
          <h1 className="text-xl font-black text-white">Inicia sesión para ver el detalle</h1>
          <p className="mt-2 text-sm" style={{color:'rgba(255,105,180,0.6)'}}>Tu sesión no quedó activa o expiró.</p>
          <button onClick={() => router.push("/")} className="mt-5 w-full rounded-xl px-4 py-3 text-sm font-black text-white pink-button">
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  if (loading || !match) return <Loading />;

  const isFinished = match.status === "finished";
  const isLive = match.status === "live" || match.status === "inprogress";
  const isScheduled = (match.status === "scheduled" || match.status === "notstarted") && new Date(match.matchDate) > new Date();
  const matchTime = new Date(match.matchDate);
  const timeStr = matchTime.toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" });
  const dateStr = matchTime.toLocaleDateString("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const tabs = [
    { id: "resumen", label: "Resumen", icon: "📋" },
    { id: "estadisticas", label: "Estadísticas", icon: "📊" },
    { id: "alineaciones", label: "Alineaciones", icon: "👥" },
    { id: "eventos", label: "Eventos", icon: "⏱️" },
    { id: "predicciones", label: "Predicciones", icon: "🎯" },
  ];

  return (
    <div className="min-h-screen lg:flex relative bg-match pb-24 lg:pb-0">

      
      <aside className="hidden w-[244px] shrink-0 lg:flex lg:flex-col relative z-10" style={{borderRight:'1px solid rgba(255,0,255,0.1)', background:'rgba(10,0,8,0.9)', backdropFilter:'blur(20px)'}}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 transition-colors" style={{color:'rgba(255,105,180,0.6)'}}>
            <span className="text-lg">←</span>
            <span className="text-xs font-semibold">Volver</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚽</span>
            <span className="font-black text-xs tracking-wider uppercase" style={{background:'linear-gradient(90deg, #fff, #ff69b4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Fantasy Mundial</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/ranking")} className="px-2 py-1 text-[10px] font-semibold rounded-lg transition-all" style={{color:'rgba(255,105,180,0.6)'}}>Ranking</button>
            <button onClick={() => router.push("/perfil")} className="px-2 py-1 text-[10px] font-semibold rounded-lg transition-all" style={{color:'rgba(255,105,180,0.6)'}}>Perfil</button>
          </div>
        </div>
      </aside>

      <div className="relative z-10 flex-1">
      <nav className="sticky top-0 z-50 backdrop-blur-xl lg:hidden" style={{background:'rgba(10,0,8,0.9)', borderBottom:'1px solid rgba(255,0,255,0.1)'}}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 transition-colors" style={{color:'rgba(255,105,180,0.6)'}}>
            <span className="text-lg">←</span>
            <span className="text-xs font-semibold">Volver</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚽</span>
            <span className="font-black text-xs tracking-wider uppercase" style={{background:'linear-gradient(90deg, #fff, #ff69b4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Fantasy Mundial</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/ranking")} className="px-2 py-1 text-[10px] font-semibold rounded-lg transition-all" style={{color:'rgba(255,105,180,0.6)'}}>Ranking</button>
            <button onClick={() => router.push("/perfil")} className="px-2 py-1 text-[10px] font-semibold rounded-lg transition-all" style={{color:'rgba(255,105,180,0.6)'}}>Perfil</button>
          </div>
        </div>
      </nav>

      {/* MATCH HEADER */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{background:'radial-gradient(ellipse at 50% 0%, rgba(255,0,255,0.08) 0%, transparent 60%)'}} />
        <div className="relative max-w-6xl mx-auto px-4 py-8">
          <div className="text-center mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{color:'rgba(255,105,180,0.4)'}}>
              {match.groupName || `Jornada ${match.roundNumber}`}
            </span>
          </div>
          <div className="flex items-center justify-center gap-6 md:gap-12">
            <div className="flex-1 flex flex-col items-center gap-3">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center relative overflow-hidden" style={{border:'2px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)'}}>
                <img src={match.homeTeamImageUrl || getFlagUrl(match.homeTeam)} alt={match.homeTeam} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = getFlagUrl(match.homeTeam); }} />
              </div>
              <div className="text-center">
                <p className="font-black text-lg md:text-xl text-white">{match.homeTeam}</p>
                <p className="text-[10px] uppercase" style={{color:'rgba(255,105,180,0.4)'}}>Local</p>
              </div>
            </div>
            <div className="flex-shrink-0 text-center">
              {isFinished || isLive ? (
                <div className="flex items-center gap-3">
                  <span className="text-5xl md:text-7xl font-black text-white tabular-nums">{match.homeScore ?? "?"}</span>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold" style={{color:'rgba(255,0,255,0.4)'}}>:</span>
                    {isLive && <span className="mt-1 text-[9px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full animate-pulse">{match.currentMinute ? `${match.currentMinute}' EN VIVO` : "EN VIVO"}</span>}
                    {isFinished && <span className="mt-1 text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded-full" style={{color:'rgba(255,105,180,0.6)'}}>FINAL</span>}
                  </div>
                  <span className="text-5xl md:text-7xl font-black text-white tabular-nums">{match.awayScore ?? "?"}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl font-bold px-6 py-2 rounded-xl" style={{background:'rgba(255,0,255,0.1)', color:'rgba(255,105,180,0.5)'}}>VS</span>
                  <span className="text-sm font-bold" style={{color:'#ff69b4'}}>{timeStr}</span>
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col items-center gap-3">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center relative overflow-hidden" style={{border:'2px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)'}}>
                <img src={match.awayTeamImageUrl || getFlagUrl(match.awayTeam)} alt={match.awayTeam} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = getFlagUrl(match.awayTeam); }} />
              </div>
              <div className="text-center">
                <p className="font-black text-lg md:text-xl text-white">{match.awayTeam}</p>
                <p className="text-[10px] uppercase" style={{color:'rgba(255,105,180,0.4)'}}>Visitante</p>
              </div>
            </div>
          </div>
          <p className="text-center text-xs mt-4" style={{color:'rgba(255,105,180,0.4)'}}>{dateStr}</p>
        </div>
      </div>

      {/* PREDICTION CTA */}
      {isScheduled && !userPrediction && (
        <div className="max-w-6xl mx-auto px-4 mb-4">
          <button onClick={() => setShowPredictionForm(!showPredictionForm)} className="w-full py-3 text-white font-bold text-sm rounded-2xl transition-all active:scale-[0.98] pink-button">
            📝 PREDECIR ESTE PARTIDO
          </button>
        </div>
      )}

      {/* PREDICTION FORM */}
      {showPredictionForm && (
        <div className="max-w-6xl mx-auto px-4 mb-4">
          <div className="rounded-3xl p-5" style={{background:'rgba(18,0,13,0.9)', border:'1px solid rgba(255,0,255,0.15)'}}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest" style={{color:'#ff69b4'}}>Tu predicción</p>
              <button onClick={() => setShowPredictionForm(false)} className="text-xs" style={{color:'rgba(255,105,180,0.5)'}}>✕ Cerrar</button>
            </div>
            <PredictionForm matchId={matchId} homeTeam={match.homeTeam} awayTeam={match.awayTeam} players={players} onSuccess={() => { setShowPredictionForm(false); fetchData(); }} />
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 pb-24">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex gap-1 mb-4 overflow-x-auto pb-2 scrollbar-hide">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                  style={activeTab === tab.id
                    ? { background:'rgba(255,20,147,0.15)', color:'#ff69b4', border:'1px solid rgba(255,0,255,0.2)' }
                    : { color:'rgba(255,105,180,0.5)', border:'1px solid transparent' }}>
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* TAB: Resumen */}
            {activeTab === "resumen" && (
              <div className="space-y-4">
                {liveStats && <StatComparison match={match} liveStats={liveStats} />}
                {!liveStats && !isFinished && (
                  <div className="rounded-2xl p-6 text-center" style={{background:'rgba(18,0,13,0.6)', border:'1px solid rgba(255,0,255,0.1)'}}>
                    <p className="text-sm" style={{color:'rgba(255,105,180,0.5)'}}>Las estadísticas estarán disponibles cuando el partido comience</p>
                  </div>
                )}
                {goalScorers.length > 0 && (
                  <div className="rounded-2xl p-4" style={{background:'rgba(18,0,13,0.6)', border:'1px solid rgba(255,0,255,0.1)'}}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{color:'rgba(255,105,180,0.4)'}}>Goleadores</p>
                    <div className="space-y-2">
                      {goalScorers.map((g, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span style={{color:'#ff69b4'}}>⚽</span>
                          <span className="text-white font-semibold">{g.player}</span>
                          {g.count > 1 && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{background:'rgba(255,20,147,0.2)', color:'#ff69b4'}}>x{g.count}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {userPrediction && (
                  <div className="rounded-2xl p-4" style={{background:'rgba(18,0,13,0.9)', border:'1px solid rgba(255,0,255,0.15)'}}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{color:'#ff69b4'}}>Tu predicción</p>
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-3xl font-black text-white">{userPrediction.homeScore}</p>
                        <p className="text-[10px]" style={{color:'rgba(255,105,180,0.4)'}}>{match.homeTeam}</p>
                      </div>
                      <span className="text-xl" style={{color:'rgba(255,0,255,0.4)'}}>-</span>
                      <div className="text-center">
                        <p className="text-3xl font-black text-white">{userPrediction.awayScore}</p>
                        <p className="text-[10px]" style={{color:'rgba(255,105,180,0.4)'}}>{match.awayTeam}</p>
                      </div>
                    </div>
                    {userPrediction.points && (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Marcador", pts: userPrediction.points.homeScorePts, max: 10 },
                          { label: "Ganador", pts: userPrediction.points.winnerPts, max: 5 },
                          { label: "Goleador", pts: userPrediction.points.goalscorerPts, max: 5 },
                          { label: "Tiros", pts: userPrediction.points.totalShotsPts, max: 3 },
                          { label: "Al arco", pts: userPrediction.points.shotsOnGoalPts, max: 3 },
                          { label: "Atajadas", pts: userPrediction.points.savesPts, max: 3 },
                          { label: "Faltas", pts: userPrediction.points.foulsPts, max: 2 },
                          { label: "Amarillas", pts: userPrediction.points.yellowCardsPts, max: 2 },
                          { label: "Rojas", pts: userPrediction.points.redCardsPts, max: 3 },
                        ].map((s) => (
                          <div key={s.label} className="text-center p-2 rounded-xl" style={s.pts === s.max ? {background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)'} : s.pts > 0 ? {background:'rgba(255,20,147,0.1)', border:'1px solid rgba(255,0,255,0.2)'} : {background:'rgba(255,0,255,0.04)', border:'1px solid rgba(255,0,255,0.08)'}}>
                            <p className={`text-lg font-black ${s.pts === s.max ? "text-green-400" : s.pts > 0 ? "text-pink-400" : ""}`} style={s.pts === 0 ? {color:'rgba(255,105,180,0.4)'} : undefined}>{s.pts}/{s.max}</p>
                            <p className="text-[9px] uppercase" style={{color:'rgba(255,105,180,0.4)'}}>{s.label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!userPrediction && isFinished && (
                  <div className="rounded-2xl p-6 text-center" style={{background:'rgba(18,0,13,0.6)', border:'1px solid rgba(255,0,255,0.1)'}}>
                    <p className="text-sm" style={{color:'rgba(255,105,180,0.4)'}}>No predijiste este partido</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Estadísticas */}
            {activeTab === "estadisticas" && (
              <div className="space-y-3">
                {liveStats ? <DetailedStats match={match} liveStats={liveStats} /> : (
                  <div className="rounded-2xl p-6 text-center" style={{background:'rgba(18,0,13,0.6)', border:'1px solid rgba(255,0,255,0.1)'}}>
                    <p className="text-sm" style={{color:'rgba(255,105,180,0.5)'}}>Estadísticas disponibles cuando el partido comience</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Alineaciones */}
            {activeTab === "alineaciones" && (
              <div className="space-y-4">
                {lineups ? <LineupView lineups={lineups} /> : (
                  <div className="rounded-2xl p-6 text-center" style={{background:'rgba(18,0,13,0.6)', border:'1px solid rgba(255,0,255,0.1)'}}>
                    <p className="text-sm" style={{color:'rgba(255,105,180,0.5)'}}>Las alineaciones se publicarán antes del partido</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Eventos */}
            {activeTab === "eventos" && (
              <div className="space-y-3">
                {incidents.length > 0 ? <EventTimeline incidents={incidents} homeTeam={match.homeTeam} awayTeam={match.awayTeam} /> : (
                  <div className="rounded-2xl p-6 text-center" style={{background:'rgba(18,0,13,0.6)', border:'1px solid rgba(255,0,255,0.1)'}}>
                    <p className="text-sm" style={{color:'rgba(255,105,180,0.5)'}}>Los eventos aparecerán cuando el partido comience</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Predicciones */}
            {activeTab === "predicciones" && (
              <div className="space-y-3">
                {allPredictions.length > 0 ? <AllPredictions predictions={allPredictions} /> : (
                  <div className="rounded-2xl p-6 text-center" style={{background:'rgba(18,0,13,0.6)', border:'1px solid rgba(255,0,255,0.1)'}}>
                    <p className="text-sm" style={{color:'rgba(255,105,180,0.5)'}}>Aún no hay predicciones para este partido</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Sidebar */}
          <div className="w-full lg:w-72 space-y-4">
            <div className="rounded-2xl p-4" style={{background:'rgba(18,0,13,0.9)', border:'1px solid rgba(255,0,255,0.12)'}}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest" style={{color:'#ff69b4'}}>🏆 Ranking Semanal</p>
                <button onClick={() => router.push("/ranking")} className="text-[10px] transition-colors" style={{color:'rgba(255,105,180,0.5)'}}>Ver todo</button>
              </div>
              <div className="space-y-2">
                {weekRanking.length === 0 && <p className="text-xs text-center py-2" style={{color:'rgba(255,105,180,0.4)'}}>Sin datos aún</p>}
                {weekRanking.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-xl" style={i === 0 ? {background:'rgba(255,20,147,0.12)', border:'1px solid rgba(255,0,255,0.2)'} : {background:'rgba(255,0,255,0.03)'}}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black" style={i === 0 ? {background:'linear-gradient(135deg,#ff1493,#c500ff)', color:'#fff'} : {background:'rgba(255,255,255,0.06)', color:'#fff'}}>{i + 1}</span>
                    <span className="text-xs text-white font-semibold flex-1 truncate">{r.name}</span>
                    <span className="text-xs font-bold" style={{color:'#ff69b4'}}>{r.totalPoints} pts</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{background:'rgba(18,0,13,0.9)', border:'1px solid rgba(255,0,255,0.12)'}}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{color:'rgba(255,105,180,0.4)'}}>Próximos partidos</p>
              <div className="space-y-2">
                {upcomingMatches.map((m) => {
                  const d = new Date(m.matchDate);
                  return (
                    <button key={m.id} onClick={() => router.push(`/match/${m.id}`)}
                      className="w-full flex items-center gap-2 p-2 rounded-xl transition-all text-left" style={{background:'rgba(255,0,255,0.025)'}}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px]" style={{color:'rgba(255,105,180,0.4)'}}>{d.toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short" })} - {d.toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" })}</p>
                        <p className="text-xs text-white font-semibold truncate">{m.homeTeam} vs {m.awayTeam}</p>
                      </div>
                      <span className="text-xs" style={{color:'#ff69b4'}}>→</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{background:'rgba(18,0,13,0.9)', border:'1px solid rgba(255,0,255,0.12)'}}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{color:'rgba(255,105,180,0.4)'}}>Información de la polla</p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span style={{color:'rgba(255,105,180,0.5)'}}>Nombre</span><span className="text-white font-semibold">Fantasy Mundial</span></div>
                <div className="flex justify-between"><span style={{color:'rgba(255,105,180,0.5)'}}>Sistema</span><span className="text-white font-semibold">13 campos</span></div>
                <div className="flex justify-between"><span style={{color:'rgba(255,105,180,0.5)'}}>Máx. puntos</span><span className="font-semibold" style={{color:'#ff69b4'}}>42 pts/partido</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

function StatComparison({ match, liveStats }: { match: MatchDetail; liveStats: LiveStats }) {
  const stats = [
    { label: "Tiros totales", home: liveStats.home.totalShots, away: liveStats.away.totalShots, icon: "🎯" },
    { label: "Tiros al arco", home: liveStats.home.shotsOnGoal, away: liveStats.away.shotsOnGoal, icon: "🥅" },
    { label: "Atajadas", home: liveStats.home.saves, away: liveStats.away.saves, icon: "🧤" },
    { label: "Faltas", home: liveStats.home.fouls, away: liveStats.away.fouls, icon: "⚠️" },
    { label: "T. Amarillas", home: liveStats.home.yellowCards, away: liveStats.away.yellowCards, icon: "🟨" },
    { label: "T. Rojas", home: liveStats.home.redCards, away: liveStats.away.redCards, icon: "🟥" },
    { label: "Pases precisos", home: liveStats.home.accuratePass, away: liveStats.away.accuratePass, icon: "👟" },
    { label: "Centros", home: liveStats.home.totalCross, away: liveStats.away.totalCross, icon: "🔄" },
  ];
  void match;
  return (
    <div className="rounded-2xl p-4 space-y-3" style={{background:'rgba(18,0,13,0.6)', border:'1px solid rgba(255,0,255,0.1)'}}>
      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{color:'rgba(255,105,180,0.4)'}}>Comparación</p>
      {stats.map((s) => {
        const total = s.home + s.away || 1;
        const homePct = (s.home / total) * 100;
        const awayPct = (s.away / total) * 100;
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-white tabular-nums w-8 text-left">{s.home}</span>
              <span className="text-[10px] uppercase" style={{color:'rgba(255,105,180,0.4)'}}>{s.label}</span>
              <span className="font-bold text-white tabular-nums w-8 text-right">{s.away}</span>
            </div>
            <div className="flex gap-1 h-1.5">
              <div className="flex-1 rounded-full overflow-hidden flex justify-end" style={{background:'rgba(255,0,255,0.05)'}}>
                <div className="h-full rounded-full" style={{width:`${homePct}%`, background:'linear-gradient(to right, #c500ff, #ff1493)'}} />
              </div>
              <div className="flex-1 rounded-full overflow-hidden" style={{background:'rgba(255,0,255,0.05)'}}>
                <div className="h-full rounded-full" style={{width:`${awayPct}%`, background:'linear-gradient(to right, #3b82f6, #60a5fa)'}} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DetailedStats({ match, liveStats }: { match: MatchDetail; liveStats: LiveStats }) {
  const stats = [
    { label: "Tiros totales", home: liveStats.home.totalShots, away: liveStats.away.totalShots },
    { label: "Tiros al arco", home: liveStats.home.shotsOnGoal, away: liveStats.away.shotsOnGoal },
    { label: "Precisión de tiros", home: liveStats.home.totalShots ? Math.round((liveStats.home.shotsOnGoal / liveStats.home.totalShots) * 100) : 0, away: liveStats.away.totalShots ? Math.round((liveStats.away.shotsOnGoal / liveStats.away.totalShots) * 100) : 0, isPercent: true },
    { label: "Atajadas", home: liveStats.home.saves, away: liveStats.away.saves },
    { label: "Faltas", home: liveStats.home.fouls, away: liveStats.away.fouls },
    { label: "Tarjetas amarillas", home: liveStats.home.yellowCards, away: liveStats.away.yellowCards },
    { label: "Tarjetas rojas", home: liveStats.home.redCards, away: liveStats.away.redCards },
    { label: "Pases precisos", home: liveStats.home.accuratePass, away: liveStats.away.accuratePass },
    { label: "Centros", home: liveStats.home.totalCross, away: liveStats.away.totalCross },
    { label: "Sustituciones", home: liveStats.home.substitutions, away: liveStats.away.substitutions },
  ];
  void match;
  return (
    <div className="rounded-2xl p-4" style={{background:'rgba(18,0,13,0.6)', border:'1px solid rgba(255,0,255,0.1)'}}>
      <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{color:'rgba(255,105,180,0.4)'}}>Estadísticas detalladas</p>
      <div className="space-y-4">
        {stats.map((s) => {
          const total = s.home + s.away || 1;
          const homePct = (s.home / total) * 100;
          const awayPct = (s.away / total) * 100;
          return (
            <div key={s.label}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-white tabular-nums w-10 text-left">{s.isPercent ? `${s.home}%` : s.home}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{color:'rgba(255,105,180,0.5)'}}>{s.label}</span>
                <span className="font-bold text-white tabular-nums w-10 text-right">{s.isPercent ? `${s.away}%` : s.away}</span>
              </div>
              <div className="flex gap-1.5 h-2">
                <div className="flex-1 rounded-full overflow-hidden flex justify-end" style={{background:'rgba(255,0,255,0.05)'}}>
                  <div className="h-full rounded-full transition-all duration-500" style={{width:`${homePct}%`, background:'linear-gradient(to right, #c500ff, #ff1493)'}} />
                </div>
                <div className="flex-1 rounded-full overflow-hidden" style={{background:'rgba(255,0,255,0.05)'}}>
                  <div className="h-full rounded-full transition-all duration-500" style={{width:`${awayPct}%`, background:'linear-gradient(to right, #3b82f6, #60a5fa)'}} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineupView({ lineups }: { lineups: Lineups }) {
  const getPositionLabel = (pos: string) => {
    const map: Record<string, string> = { GK: "POR", DEF: "DEF", MID: "MED", FWD: "DEL", SUB: "SUP" };
    return map[pos] || pos;
  };
  return (
    <>
      {(["home", "away"] as const).map((side) => {
        const team = lineups.lineups[side];
        return (
          <div key={side} className="rounded-2xl p-4" style={{background:'rgba(18,0,13,0.6)', border:'1px solid rgba(255,0,255,0.1)'}}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{color:'#ff69b4'}}>{team.team_name}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:'rgba(255,0,255,0.1)', color:'rgba(255,105,180,0.6)'}}>{team.formation}</span>
            </div>
            <div className="space-y-1">
              {team.players.map((p, i) => (
                <div key={p.id || `player-${i}`} className="flex items-center gap-2 p-1.5 rounded-lg" style={{background:'rgba(255,0,255,0.02)'}}>
                  <span className="w-5 text-[10px] font-bold text-center" style={{color:'rgba(255,105,180,0.4)'}}>{p.jersey_number}</span>
                  <span className="w-8 text-[9px] font-bold px-1 py-0.5 rounded text-center" style={{background:'rgba(255,20,147,0.1)', color:'#ff69b4'}}>{getPositionLabel(p.position)}</span>
                  <span className="text-xs text-white font-semibold flex-1">{p.name}</span>
                </div>
              ))}
            </div>
            {team.substitutes.length > 0 && (
              <>
                <p className="text-[10px] uppercase mt-3 mb-1" style={{color:'rgba(255,105,180,0.4)'}}>Suplentes</p>
                <div className="space-y-1">
                  {team.substitutes.map((p, i) => (
                    <div key={p.id || `sub-${i}`} className="flex items-center gap-2 p-1 rounded-lg">
                      <span className="w-5 text-[10px] font-bold text-center" style={{color:'rgba(255,105,180,0.3)'}}>{p.jersey_number}</span>
                      <span className="text-xs" style={{color:'rgba(255,105,180,0.5)'}}>{p.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </>
  );
}

function EventTimeline({ incidents, homeTeam, awayTeam }: { incidents: Incident[]; homeTeam: string; awayTeam: string }) {
  const sorted = [...incidents].sort((a, b) => a.minute - b.minute);
  const getEventIcon = (type: string) => {
    if (type === "goal") return "⚽";
    if (type === "yellow_card") return "🟨";
    if (type === "red_card") return "🟥";
    if (type === "substitution") return "🔄";
    return "📋";
  };
  const getEventColor = (type: string) => {
    if (type === "goal") return { background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', color:'#4ade80' };
    if (type === "yellow_card") return { background:'rgba(234,179,8,0.1)', border:'1px solid rgba(234,179,8,0.2)', color:'#facc15' };
    if (type === "red_card") return { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171' };
    if (type === "substitution") return { background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', color:'#60a5fa' };
    return { background:'rgba(255,0,255,0.04)', border:'1px solid rgba(255,0,255,0.08)', color:'rgba(255,105,180,0.5)' };
  };
  return (
    <div className="rounded-2xl p-4" style={{background:'rgba(18,0,13,0.6)', border:'1px solid rgba(255,0,255,0.1)'}}>
      <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{color:'rgba(255,105,180,0.4)'}}>Cronología</p>
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-px" style={{background:'rgba(255,0,255,0.05)'}} />
        <div className="space-y-3">
          {sorted.map((ev, i) => (
            <div key={i} className="relative flex items-start gap-3 p-2 rounded-xl" style={getEventColor(ev.type)}>
              <span className="w-8 text-[10px] font-bold text-center mt-0.5">{ev.minute}&apos;</span>
              <span className="text-lg">{getEventIcon(ev.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{ev.player || "Jugador"}</p>
                <p className="text-[10px]" style={{color:'rgba(255,105,180,0.4)'}}>
                  {ev.type === "goal" ? "Gol" : ev.type === "yellow_card" ? "Tarjeta amarilla" : ev.type === "red_card" ? "Tarjeta roja" : "Sustitución"}
                  {ev.is_home !== undefined && ` — ${ev.is_home ? homeTeam : awayTeam}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AllPredictions({ predictions }: { predictions: PublicPrediction[] }) {
  return (
    <div className="rounded-2xl p-4" style={{background:'rgba(18,0,13,0.6)', border:'1px solid rgba(255,0,255,0.1)'}}>
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{color:'rgba(255,105,180,0.4)'}}>Predicciones ({predictions.length})</p>
      <div className="space-y-2">
        {predictions.map((p, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{background:'rgba(255,0,255,0.02)'}}>
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{background:'rgba(255,0,255,0.06)', color:'rgba(255,105,180,0.5)'}}>{i + 1}</span>
            <span className="text-xs text-white font-semibold flex-1 truncate">{p.name}</span>
            <span className="text-xs font-bold text-white tabular-nums">{p.homeScore} - {p.awayScore}</span>
            {p.totalPoints > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{background:'rgba(255,20,147,0.2)', color:'#ff69b4'}}>{p.totalPoints} pts</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

interface FormState {
  homeScore: string; awayScore: string; goalscorer: string;
  totalShots: string; shotsOnGoal: string; saves: string; fouls: string;
  yellowCards: string; redCards: string; substitutions: string; accuratePass: string; totalCross: string;
}

function PlayerSelect({ value, players, onChange }: { value: string; players: PlayersData | null; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasHome = !!players?.home?.players && players.home.players.length > 0;
  const hasAway = !!players?.away?.players && players.away.players.length > 0;
  const hasPlayers = hasHome || hasAway;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="w-full px-3 py-2.5 rounded-xl text-sm text-left flex items-center justify-between" style={{background:'rgba(255,0,255,0.05)', border:'1px solid rgba(255,0,255,0.15)', color: value ? '#fff' : 'rgba(255,105,180,0.5)'}}>
        <span className="truncate">{value || "Selecciona un jugador..."}</span>
        <svg className={`w-4 h-4 shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} style={{color:'rgba(255,105,180,0.5)'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl" style={{background:'rgba(12,0,10,0.97)', border:'1px solid rgba(255,0,255,0.25)', boxShadow:'0 8px 32px rgba(0,0,0,0.6)', backdropFilter:'blur(20px)'}}>
          <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="w-full px-3 py-2.5 text-left text-sm transition-colors" style={value === "" ? { background:'rgba(255,20,147,0.25)', color:'#ff69b4' } : { color: 'rgba(255,105,180,0.4)' }}>
            Selecciona un jugador...
          </button>
          <button type="button" onClick={() => { onChange("Ninguno"); setOpen(false); }} className="w-full px-3 py-2.5 text-left text-sm transition-colors" style={value === "Ninguno" ? { background:'rgba(255,20,147,0.25)', color:'#ff69b4' } : { color: '#fff' }}>
            Ninguno
          </button>
          {hasPlayers && <div style={{borderTop:'1px solid rgba(255,0,255,0.15)'}} />}
          {hasHome && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider sticky top-0" style={{color:'#ff69b4', background:'rgba(12,0,10,0.95)', borderBottom:'1px solid rgba(255,0,255,0.1)'}}>
                ▶ {players!.home.teamName}
              </div>
              {players!.home.players.map((p) => (
                <button key={p.id} type="button" onClick={() => { onChange(p.name); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm transition-colors" style={value === p.name ? { background:'rgba(255,20,147,0.25)', color:'#ff69b4' } : { color: '#fff' }} onMouseEnter={(e) => { if (value !== p.name) e.currentTarget.style.background = 'rgba(255,0,255,0.08)'; }} onMouseLeave={(e) => { if (value !== p.name) e.currentTarget.style.background = 'transparent'; }}>
                  {p.name}
                </button>
              ))}
            </>
          )}
          {hasHome && hasAway && <div style={{borderTop:'1px solid rgba(255,0,255,0.15)'}} />}
          {hasAway && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider sticky top-0" style={{color:'#ff69b4', background:'rgba(12,0,10,0.95)', borderBottom:'1px solid rgba(255,0,255,0.1)'}}>
                ▶ {players!.away.teamName}
              </div>
              {players!.away.players.map((p) => (
                <button key={p.id} type="button" onClick={() => { onChange(p.name); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm transition-colors" style={value === p.name ? { background:'rgba(255,20,147,0.25)', color:'#ff69b4' } : { color: '#fff' }} onMouseEnter={(e) => { if (value !== p.name) e.currentTarget.style.background = 'rgba(255,0,255,0.08)'; }} onMouseLeave={(e) => { if (value !== p.name) e.currentTarget.style.background = 'transparent'; }}>
                  {p.name}
                </button>
              ))}
            </>
          )}
          {!hasPlayers && (
            <div className="px-3 py-3 text-center text-xs" style={{color:'rgba(255,105,180,0.4)'}}>
              No hay jugadores disponibles
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PredictionForm({ matchId, homeTeam, awayTeam, players, onSuccess }: { matchId: string; homeTeam: string; awayTeam: string; players: PlayersData | null; onSuccess: () => void }) {
  const [form, setForm] = useState<FormState>({
    homeScore: "", awayScore: "", goalscorer: "",
    totalShots: "", shotsOnGoal: "", saves: "", fouls: "",
    yellowCards: "", redCards: "", substitutions: "", accuratePass: "", totalCross: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const update = (field: keyof FormState, value: string) => setForm((f) => ({ ...f, [field]: value }));
  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/predictions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchId, ...form }) });
      if (res.ok) { setSaved(true); setTimeout(() => { setSaved(false); onSuccess(); }, 1500); }
      else { const err = await res.json(); setError(err.error || "Error al guardar"); }
    } catch { setError("Error de red"); }
    setSaving(false);
  };
  const fields: { key: keyof FormState; label: string }[] = [
    { key: "totalShots", label: "Tiros totales" },
    { key: "shotsOnGoal", label: "Tiros al arco" },
    { key: "saves", label: "Atajadas" },
    { key: "fouls", label: "Faltas" },
    { key: "yellowCards", label: "T. Amarillas" },
    { key: "redCards", label: "T. Rojas" },
    { key: "substitutions", label: "Cambios" },
    { key: "accuratePass", label: "Pases precisos" },
    { key: "totalCross", label: "Centros" },
  ];
  const hasPlayers = players && ((!!players.home?.players && players.home.players.length > 0) || (!!players.away?.players && players.away.players.length > 0));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
        <div>
          <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{color:'rgba(255,105,180,0.4)'}}>Goles {homeTeam}</label>
          <input type="number" min="0" className="w-full px-3 py-2.5 rounded-xl text-sm text-center font-bold text-white outline-none" style={{background:'rgba(255,0,255,0.05)', border:'1px solid rgba(255,0,255,0.15)'}} placeholder="0" value={form.homeScore} onChange={(e) => update("homeScore", e.target.value)} />
        </div>
        <span className="font-bold mt-5" style={{color:'rgba(255,0,255,0.3)'}}>:</span>
        <div>
          <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{color:'rgba(255,105,180,0.4)'}}>Goles {awayTeam}</label>
          <input type="number" min="0" className="w-full px-3 py-2.5 rounded-xl text-sm text-center font-bold text-white outline-none" style={{background:'rgba(255,0,255,0.05)', border:'1px solid rgba(255,0,255,0.15)'}} placeholder="0" value={form.awayScore} onChange={(e) => update("awayScore", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{color:'rgba(255,105,180,0.4)'}}>Goleador del partido</label>
        {hasPlayers ? (
          <PlayerSelect value={form.goalscorer} players={players} onChange={(v) => update("goalscorer", v)} />
        ) : (
          <input className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none" style={{background:'rgba(255,0,255,0.05)', border:'1px solid rgba(255,0,255,0.15)'}} placeholder="Nombre del jugador" value={form.goalscorer} onChange={(e) => update("goalscorer", e.target.value)} />
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{color:'rgba(255,105,180,0.4)'}}>{f.label}</label>
            <input type="number" min="0" className="w-full px-2 py-2 rounded-xl text-sm text-center text-white outline-none" style={{background:'rgba(255,0,255,0.05)', border:'1px solid rgba(255,0,255,0.15)'}} placeholder="0" value={form[f.key]} onChange={(e) => update(f.key, e.target.value)} />
          </div>
        ))}
      </div>
      {error && <div className="rounded-xl p-3 text-center text-sm font-medium" style={{background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5'}}>{error}</div>}
      <button onClick={handleSubmit} disabled={saving || saved}
        className="w-full py-3 font-bold rounded-xl text-sm transition-all active:scale-[0.98]"
        style={saved ? {background:'rgba(34,197,94,0.2)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.2)'} : {}}>
        {saving ? "Guardando..." : saved ? "✅ Predicción guardada" : "GUARDAR PREDICCIÓN"}
      </button>
    </div>
  );
}
