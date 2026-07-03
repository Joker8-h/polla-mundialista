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
    homeScore90: number | null;
    awayScore90: number | null;
    winnerTeam: string | null;
    decidedBy: string | null;
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

  const scoreHome = match.homeScore90 ?? match.homeScore;
  const scoreAway = match.awayScore90 ?? match.awayScore;
  if (scoreHome === null || scoreAway === null) return pts;

  if (prediction.homeScore === scoreHome && prediction.awayScore === scoreAway) {
    pts.homeScorePts = 10;
  }

  const finalHome = match.homeScore ?? scoreHome;
  const finalAway = match.awayScore ?? scoreAway;
  const actualWinner = match.winnerTeam
    ? match.winnerTeam
    : finalHome > finalAway ? "home" : finalHome < finalAway ? "away" : "draw";

  const predWinner = prediction.winner;
  if (predWinner === actualWinner) {
    pts.winnerPts = 5;
  }

  const predScorer = (prediction.goalscorer || "").toLowerCase().trim();
  if (predScorer.length > 0 && actualScorers.some(s => s.toLowerCase().trim() === predScorer)) {
    pts.goalscorerPts = 5;
  }

  const range = (pred: number, actual: number | null, points: number): number => {
    if (actual === null) return 0;
    const diff = Math.abs(pred - actual);
    if (diff === 0) return points;
    if (diff <= 2) return Math.floor(points / 2);
    return 0;
  };

  pts.totalShotsPts = range(prediction.totalShots, match.totalShots, 3);
  pts.shotsOnGoalPts = range(prediction.shotsOnGoal, match.shotsOnGoal, 3);
  pts.savesPts = range(prediction.saves, match.saves, 3);
  pts.foulsPts = range(prediction.fouls, match.fouls, 2);
  pts.yellowCardsPts = range(prediction.yellowCards, match.yellowCards, 2);
  pts.redCardsPts = range(prediction.redCards, match.redCards, 3);
  pts.substitutionsPts = range(prediction.substitutions, match.substitutions, 2);
  pts.accuratePassPts = range(prediction.accuratePass, match.accuratePass, 2);
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
