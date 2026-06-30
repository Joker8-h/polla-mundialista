// Match type used inline in function signature below

export function calculatePoints(
  prediction: {
    homeScore: number;
    awayScore: number;
    winner: string | null;
    goalscorer: string | null;
    totalShots: number;
    shotsOnGoal: number;
    saves: number;
    fouls: number;
    yellowCards: number;
    redCards: number;
    substitutions: number;
    accuratePass: number;
    totalCross: number;
  },
  match: {
    homeScore: number | null;
    awayScore: number | null;
    totalShots: number | null;
    shotsOnGoal: number | null;
    saves: number | null;
    fouls: number | null;
    yellowCards: number | null;
    redCards: number | null;
    substitutions: number | null;
    accuratePass: number | null;
    totalCross: number | null;
  },
  actualScorers: string[]
) {
  const pts = {
    homeScorePts: 0,
    winnerPts: 0,
    goalscorerPts: 0,
    totalShotsPts: 0,
    shotsOnGoalPts: 0,
    savesPts: 0,
    foulsPts: 0,
    yellowCardsPts: 0,
    redCardsPts: 0,
    substitutionsPts: 0,
    accuratePassPts: 0,
    totalCrossPts: 0,
    totalPoints: 0,
  };

  if (match.homeScore === null || match.awayScore === null) return pts;

  // 1. Marcador exacto (10 pts)
  if (prediction.homeScore === match.homeScore && prediction.awayScore === match.awayScore) {
    pts.homeScorePts = 10;
  }

  // 2. Ganador o empate (5 pts)
  const actualWinner = match.homeScore > match.awayScore ? "home" : match.homeScore < match.awayScore ? "away" : "draw";
  const predWinner = prediction.winner;
  if (predWinner === actualWinner) {
    pts.winnerPts = 5;
  }

  // 3. Goleador (5 pts) - solo si hay nombre escrito y coincide exactamente con algún goleador real
  const predScorer = (prediction.goalscorer || "").toLowerCase().trim();
  if (predScorer.length > 0 && actualScorers.some(s => s.toLowerCase().trim() === predScorer)) {
    pts.goalscorerPts = 5;
  }

  // Helper for statistical fields
  const range = (pred: number, actual: number | null, points: number): number => {
    if (actual === null) return 0;
    const diff = Math.abs(pred - actual);
    if (diff === 0) return points;
    if (diff <= 2) return Math.floor(points / 2);
    return 0;
  };

  // 4. Total de tiros (3 pts)
  pts.totalShotsPts = range(prediction.totalShots, match.totalShots, 3);

  // 5. Remates al arco (3 pts)
  pts.shotsOnGoalPts = range(prediction.shotsOnGoal, match.shotsOnGoal, 3);

  // 6. Atajadas (3 pts)
  pts.savesPts = range(prediction.saves, match.saves, 3);

  // 7. Faltas (2 pts)
  pts.foulsPts = range(prediction.fouls, match.fouls, 2);

  // 8. Tarjetas amarillas (2 pts)
  pts.yellowCardsPts = range(prediction.yellowCards, match.yellowCards, 2);

  // 9. Tarjetas rojas (3 pts)
  pts.redCardsPts = range(prediction.redCards, match.redCards, 3);

  // 10. Sustituciones (2 pts)
  pts.substitutionsPts = range(prediction.substitutions, match.substitutions, 2);

  // 11. Pases precisos (2 pts)
  pts.accuratePassPts = range(prediction.accuratePass, match.accuratePass, 2);

  // 12. Centros (2 pts)
  pts.totalCrossPts = range(prediction.totalCross, match.totalCross, 2);

  pts.totalPoints = 
    pts.homeScorePts + pts.winnerPts + pts.goalscorerPts +
    pts.totalShotsPts + pts.shotsOnGoalPts + pts.savesPts +
    pts.foulsPts + pts.yellowCardsPts + pts.redCardsPts +
    pts.substitutionsPts + pts.accuratePassPts + pts.totalCrossPts;

  return pts;
}

export function calculatePlayerGoalPoints(predictedGoals: number, actualGoals: number): number {
  if (predictedGoals === actualGoals) return 10;
  if (actualGoals > 0 && predictedGoals > 0) return 4;
  return 0;
}


