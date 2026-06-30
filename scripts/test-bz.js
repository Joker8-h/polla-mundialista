const API_KEY = "261c45543020e4f0919e2796417bf27744005aef";
const API_URL = "https://sports.bzzoiro.com/api/v2";
const headers = { Authorization: `Token ${API_KEY}` };

async function run() {
  const today = new Date().toISOString().split("T")[0];
  const eventsRes = await fetch(`${API_URL}/events/?league_id=27&date=${today}`, { headers });
  const eventsData = await eventsRes.json();
  const events = eventsData.results || [];
  
  if (events.length === 0) {
    console.log("No events today");
    return;
  }
  
  const event = events[0]; // Just take the first one or find Ecuador
  const ecaGer = events.find(e => e.home_team.includes("Ecuador") || e.away_team.includes("Ecuador")) || event;
  console.log(`Testing event ${ecaGer.id}: ${ecaGer.home_team} vs ${ecaGer.away_team}`);

  // Test statistics
  const statsRes = await fetch(`${API_URL}/events/${ecaGer.id}/statistics/`, { headers });
  console.log("Statistics status:", statsRes.status);
  if (statsRes.ok) {
    console.log("Statistics data:", JSON.stringify(await statsRes.json(), null, 2));
  } else {
    console.log("Statistics error");
  }

  // Test player stats
  const pStatsRes = await fetch(`${API_URL}/events/${ecaGer.id}/player-stats/`, { headers });
  console.log("Player stats status:", pStatsRes.status);
  if (pStatsRes.ok) {
    const data = await pStatsRes.json();
    console.log("Player stats length:", data.player_stats?.length || data.length || 0);
    if (data.player_stats?.length > 0) console.log("Sample player stat:", data.player_stats[0]);
  }
}

run();
