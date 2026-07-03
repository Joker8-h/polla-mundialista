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
      parseEventDate,
    } = await import("@/lib/bzzoiro");
    const { calculatePoints, calculatePlayerGoalPoints } = await import("@/lib/scoring");
    const { toColombiaDate, getWeekForColombiaDate, nowColombia } = await import("@/lib/colombia-time");

    function mapStatus(bzStatus: string): string {
      if (bzStatus === "finished" || bzStatus === "ended") return "finished";
      if (["live","inprogress","halftime","HT","1H","2H","1st_half","2nd_half","extra_time","extratime","penalty","penalties","penalty_shootout","shootout"].includes(bzStatus)) return "live";
      return "scheduled";
    }

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

    async function ensureWeekForDate(colDateStr: string) {
      const { startDate, endDate } = getWeekForColombiaDate(colDateStr);
      let week = await prisma.week.findFirst({
        where: { startDate, endDate },
      });
      if (!week) {
        const lastWeek = await prisma.week.findFirst({ orderBy: { number: "desc" } });
        week = await prisma.week.create({
          data: {
            number: (lastWeek?.number || 0) + 1,
            startDate,
            endDate,
          },
        });
        console.log(`[Sync] Semana ${week.number} creada para ${colDateStr}`);
      }
      return week;
    }

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

          const scoreHome = match.homeScore90 ?? match.homeScore;
          const scoreAway = match.awayScore90 ?? match.awayScore;
          if (p.homeScore === scoreHome && p.awayScore === scoreAway) { homeScorePts = 10; totalPoints += 10; }

          const predictedWinner = p.homeScore > p.awayScore ? "home" : p.homeScore < p.awayScore ? "away" : "draw";
          const actualWinner = match.winnerTeam
            ? match.winnerTeam
            : scoreHome > scoreAway ? "home" : scoreHome < scoreAway ? "away" : "draw";
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

    async function syncAll() {
      try {
        const now = nowColombia();
        const daysToSync = [-1, 0, 1, 2, 3];
        const allEvents = await fetchAllSeasonMatches();

        for (const offset of daysToSync) {
          const date = new Date(now);
          date.setDate(date.getDate() + offset);
          const dateStr = toColombiaDate(date);
          const events = allEvents.filter((e) => {
            const colDate = toColombiaDate(parseEventDate(e.event_date));
            return colDate === dateStr;
          });

          const week = await ensureWeekForDate(dateStr);

          for (const event of events) {
            if (!isValidTeam(event.home_team) || !isValidTeam(event.away_team)) continue;

            const status = mapStatus(event.status);
            const matchDate = parseEventDate(event.event_date);
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
              const currentScoreHome = status !== "scheduled" ? (event.home_score ?? null) : existing.homeScore;
              const currentScoreAway = status !== "scheduled" ? (event.away_score ?? null) : existing.awayScore;
              const updateData: Record<string, unknown> = {
                status,
                homeTeam: event.home_team,
                awayTeam: event.away_team,
                homeTeamId: event.home_team_id,
                awayTeamId: event.away_team_id,
                homeScore: currentScoreHome,
                awayScore: currentScoreAway,
                currentMinute: event.current_minute ?? existing.currentMinute,
              };

              // Freeze 90' score when extra time or penalties begin
              const rawStatus = event.status;
              if (existing.homeScore90 === null && (rawStatus === "extra_time" || rawStatus === "extratime" || rawStatus === "penalty" || rawStatus === "penalties" || rawStatus === "penalty_shootout")) {
                if (currentScoreHome !== null && currentScoreAway !== null) {
                  updateData.homeScore90 = currentScoreHome;
                  updateData.awayScore90 = currentScoreAway;
                }
              }

              if (existing.weekId !== week.id) {
                updateData.weekId = week.id;
              }

              if (status === "finished" && existing.status !== "finished") {
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

                  // Determine winnerTeam and decidedBy
                  const finalH = currentScoreHome as number | null;
                  const finalA = currentScoreAway as number | null;
                  if (finalH !== null && finalA !== null) {
                    const has90 = existing.homeScore90 !== null || updateData.homeScore90 !== undefined;
                    let decidedBy = "regular";
                    let winnerTeam: string | null = null;

                    if (finalH !== finalA) {
                      decidedBy = has90 ? "extra_time" : "regular";
                      winnerTeam = finalH > finalA ? "home" : "away";
                    } else if (has90) {
                      decidedBy = "penalties";
                      // Fetch penalty shootout score from event detail
                      try {
                        const detail = await (await import("@/lib/bzzoiro")).fetchMatchDetail(event.id) as any;
                        if (detail?.penalty_shootout) {
                          const pensHome = detail.penalty_shootout.home ?? 0;
                          const pensAway = detail.penalty_shootout.away ?? 0;
                          if (pensHome > 0 || pensAway > 0) {
                            updateData.penaltyHome = pensHome;
                            updateData.penaltyAway = pensAway;
                            if (pensHome !== pensAway) {
                              winnerTeam = pensHome > pensAway ? "home" : "away";
                            }
                          }
                        }
                      } catch {}
                    }

                    if (winnerTeam || decidedBy !== "regular") {
                      Object.assign(updateData, { decidedBy, winnerTeam });
                    }
                  }
                } catch {}

                await prisma.match.update({ where: { id: existing.id }, data: updateData });

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
