export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prisma } = await import("@/lib/prisma");
    const {
      fetchPlayerStats,
      fetchIncidents,
      fetchAllSeasonMatches,
      getTeamAggregateStats,
      getTotalSubstitutions,
      getGoalScorers,
    } = await import("@/lib/bzzoiro");
    const { calculatePoints, calculatePlayerGoalPoints } = await import("@/lib/scoring");
    const { toColombiaDate } = await import("@/lib/colombia-time");

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /** Convierte un status de Bzzoiro a nuestro enum interno */
    function mapStatus(bzStatus: string): string {
      if (bzStatus === "finished" || bzStatus === "ended") return "finished";
      if (
        bzStatus === "live" ||
        bzStatus === "inprogress" ||
        bzStatus === "halftime" ||
        bzStatus === "HT" ||
        bzStatus === "1H" ||
        bzStatus === "2H" ||
        bzStatus === "1st_half" ||
        bzStatus === "2nd_half" ||
        bzStatus === "extra_time" ||
        bzStatus === "penalty"
      )
        return "live";
      return "scheduled";
    }

    /** Filtra equipos placeholder de rondas eliminatorias futuras */
    function isValidTeam(name: string): boolean {
      const n = (name || "").trim();
      if (!n) return false;
      if (n.includes("/")) return false;
      if (/^[WL]\d+$/i.test(n)) return false;
      if (/^(Winner|Loser|Runner-up|Runner.up)\s+(Match|Group)\s+\w+$/i.test(n)) return false;
      if (/^\d[A-Z]$/i.test(n)) return false;
      if (/^[A-Z]\d$/i.test(n)) return false;
      if (/^[A-Z0-9]{1,3}$/i.test(n)) return false;
      return true;
    }

    /** Obtiene la fecha en formato YYYY-MM-DD en zona Colombia (UTC-5) */
    function todayBogota(): string {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
    }

    /** Obtiene fecha en zona Colombia (UTC-5) */
    function nowColombia(): Date {
      const now = new Date();
      const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(now);
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(now);
      const h = parts.find(p => p.type === "hour")?.value || "00";
      const m = parts.find(p => p.type === "minute")?.value || "00";
      const s = parts.find(p => p.type === "second")?.value || "00";
      return new Date(`${dateStr}T${h}:${m}:${s}-05:00`);
    }

    /** Obtiene o crea la semana activa */
    async function getOrCreateWeek() {
      let week = await prisma.week.findFirst({ where: { isActive: true, isClosed: false } });
      if (!week) {
        const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
        const [y, m, d] = todayStr.split("-").map(Number);
        const colDayOfWeek = new Date(`${todayStr}T12:00:00-05:00`).getUTCDay();
        const weekStart = new Date(Date.UTC(y, m - 1, d - colDayOfWeek, 5, 0, 0, 0));
        const weekEnd = new Date(Date.UTC(y, m - 1, d - colDayOfWeek + 6, 4, 59, 59, 0));
        const lastWeek = await prisma.week.findFirst({ orderBy: { number: "desc" } });
        try {
          week = await prisma.week.create({
            data: {
              number: (lastWeek?.number || 0) + 1,
              startDate: weekStart,
              endDate: weekEnd,
            },
          });
        } catch {
          week = await prisma.week.findFirst({ where: { isActive: true, isClosed: false } });
        }
        if (week) console.log(`[Sync] Semana ${week.number} creada`);
      }
      return week;
    }

    async function ensureWeek() {
      const w = await getOrCreateWeek();
      if (!w) throw new Error("No se pudo crear/encontrar semana activa");
      return w;
    }

    // ─── Scoring ────────────────────────────────────────────────────────────────

    async function scoreMatch(bzzoiroEventId: number, matchId: string) {
      try {
        const [incidents, match] = await Promise.all([
          fetchIncidents(bzzoiroEventId),
          prisma.match.findUnique({ where: { id: matchId } }),
        ]);
        if (!match) return;
        const allScorers = getGoalScorers(incidents);
        const scorersNames = allScorers.map((s) => s.player);
        const predictions = await prisma.prediction.findMany({ where: { matchId } });
        const playerPredictions = await prisma.playerGoalPrediction.findMany({ where: { matchId } });

        for (const p of predictions) {
          const pts = calculatePoints(p, match, scorersNames);
          await prisma.prediction.update({ where: { id: p.id }, data: { ...pts } });
        }
        for (const pgp of playerPredictions) {
          const actualGoals = allScorers.find((s) => s.playerId === pgp.playerId)?.count || 0;
          const pts = calculatePlayerGoalPoints(pgp.goals, actualGoals);
          await prisma.playerGoalPrediction.update({ where: { id: pgp.id }, data: { points: pts } });
        }
      } catch (e) {
        console.error(`[Sync] Error en scoreMatch ${matchId}:`, e);
      }
    }

    async function scoreMatchFallback(matchId: string) {
      try {
        const match = await prisma.match.findUnique({ where: { id: matchId } });
        if (!match || match.homeScore == null || match.awayScore == null) return;
        const predictions = await prisma.prediction.findMany({ where: { matchId } });
        for (const p of predictions) {
          let totalPoints = 0;
          let homeScorePts = 0;
          let winnerPts = 0;
          if (p.homeScore === match.homeScore && p.awayScore === match.awayScore) { homeScorePts = 10; totalPoints += 10; }
          const predictedWinner =
            p.homeScore > p.awayScore ? "home" : p.homeScore < p.awayScore ? "away" : "draw";
          const h = match.homeScore ?? 0;
          const a = match.awayScore ?? 0;
          const actualWinner = h > a ? "home" : h < a ? "away" : "draw";
          if (predictedWinner === actualWinner) { winnerPts = 5; totalPoints += 5; }
          await prisma.prediction.update({
            where: { id: p.id },
            data: { homeScorePts, winnerPts, totalPoints },
          });
        }
      } catch (e) {
        console.error(`[Sync] Error en scoreMatchFallback ${matchId}:`, e);
      }
    }

    // ─── Main sync ──────────────────────────────────────────────────────────────

    async function syncAll() {
      try {
        const week = await ensureWeek();

        // Sync partidos de los próximos 3 días + hoy + ayer (para no perder finalizados)
        const now = nowColombia();
        const daysToSync = [-1, 0, 1, 2, 3];

        // Fetch all 104 WC2026 matches once, filter by date locally
        const allEvents = await fetchAllSeasonMatches();

        const dayResults = daysToSync.map((offset) => {
          const date = new Date(now);
          date.setDate(date.getDate() + offset);
          const dateStr = toColombiaDate(date);
          const events = allEvents.filter((e) => {
            const eventDate = new Date(e.event_date);
            const colDate = toColombiaDate(eventDate);
            return colDate === dateStr;
          });
          return { dateStr, events };
        });
        for (const { dateStr, events } of dayResults) {

          for (const event of events) {
            // Saltar equipos placeholder (rondas eliminatorias sin equipos definidos)
            if (!isValidTeam(event.home_team) || !isValidTeam(event.away_team)) continue;

            const status = mapStatus(event.status);
            const matchDate = new Date(event.event_date);
            const existing = await prisma.match.findUnique({ where: { apiMatchId: event.id } });

            if (!existing) {
              await prisma.match.create({
                data: {
                  weekId: week.id,
                  apiMatchId: event.id,
                  homeTeam: event.home_team,
                  awayTeam: event.away_team,
                  homeTeamId: event.home_team_id,
                  awayTeamId: event.away_team_id,
                  matchDate,
                  status,
                  groupName: event.group_name || null,
                  roundNumber: event.round_number || null,
                  homeScore: status === "finished" || status === "live" ? (event.home_score ?? null) : null,
                  awayScore: status === "finished" || status === "live" ? (event.away_score ?? null) : null,
                  currentMinute: event.current_minute ?? null,
                },
              });
              console.log(`[Sync] Creado: ${event.home_team} vs ${event.away_team} (${dateStr})`);
            } else {
              // Actualizar equipo, estado y marcador
              const updateData: Record<string, unknown> = {
                status,
                homeTeam: event.home_team,
                awayTeam: event.away_team,
                homeTeamId: event.home_team_id,
                awayTeamId: event.away_team_id,
                homeScore: status !== "scheduled" ? (event.home_score ?? null) : existing.homeScore,
                awayScore: status !== "scheduled" ? (event.away_score ?? null) : existing.awayScore,
                currentMinute: event.current_minute ?? existing.currentMinute,
              };

              if (status === "finished" && existing.status !== "finished") {
                // Intentar obtener stats de Bzzoiro
                try {
                  const [stats, incidents] = await Promise.all([
                    fetchPlayerStats(event.id).catch(() => []),
                    fetchIncidents(event.id).catch(() => []),
                  ]);
                  const homeStats = getTeamAggregateStats(stats, event.home_team_id);
                  const awayStats = getTeamAggregateStats(stats, event.away_team_id);
                  Object.assign(updateData, {
                    totalShots: homeStats.totalShots + awayStats.totalShots,
                    shotsOnGoal: homeStats.shotsOnGoal + awayStats.shotsOnGoal,
                    fouls: homeStats.fouls + awayStats.fouls,
                    yellowCards: homeStats.yellowCards + awayStats.yellowCards,
                    redCards: homeStats.redCards + awayStats.redCards,
                    saves: homeStats.saves + awayStats.saves,
                    accuratePass: homeStats.accuratePass + awayStats.accuratePass,
                    totalCross: homeStats.totalCross + awayStats.totalCross,
                    substitutions: getTotalSubstitutions(incidents),
                  });
                } catch { /* no stats */ }

                await prisma.match.update({ where: { id: existing.id }, data: updateData });

                // Calcular puntos de predicciones
                try {
                  await scoreMatch(event.id, existing.id);
                } catch {
                  await scoreMatchFallback(existing.id);
                }
                console.log(`[Sync] Finalizado: ${event.home_team} ${event.home_score}-${event.away_score} ${event.away_team}`);
              } else {
                await prisma.match.update({ where: { id: existing.id }, data: updateData });
              }
            }
          }
        }

        // Cerrar semana si ya pasó su fecha de fin
        if (now >= week.endDate && !week.isClosed) {
          const rankings = await prisma.prediction.groupBy({
            by: ["userId"],
            where: { match: { weekId: week.id } },
            _sum: { totalPoints: true },
            orderBy: { _sum: { totalPoints: "desc" } },
          });
          await prisma.week.update({ where: { id: week.id }, data: { isClosed: true } });
          console.log(`[Sync] Semana ${week.number} cerrada con ${rankings.length} participantes`);
        }
      } catch (err) {
        console.error("[Sync] Error en sync:", err);
      }
    }

    console.log("[Sync] Iniciado - sync cada 3 minutos");
    async function scheduleSync() {
      await syncAll();
      setTimeout(scheduleSync, 3 * 60 * 1000);
    }
    scheduleSync();
  }
}
