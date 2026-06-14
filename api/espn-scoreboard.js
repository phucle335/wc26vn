const ESPN_SCOREBOARD_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

export default async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  const dates = String(request.query.dates || "").trim();
  const limit = String(request.query.limit || "200").trim();
  const query = new URLSearchParams({ limit });

  if (dates) {
    query.set("dates", dates);
  }

  try {
    const upstream = await fetch(`${ESPN_SCOREBOARD_BASE}?${query.toString()}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WC26Wallpaper/1.0)"
      }
    });

    if (!upstream.ok) {
      response.status(upstream.status).json({ error: `ESPN returned ${upstream.status}` });
      return;
    }

    const payload = await upstream.json();
    response.status(200).json(payload);
  } catch (error) {
    response.status(502).json({ error: error.message || "ESPN proxy failed" });
  }
}
