export default function handler(req, res) {
  const config = {
    SUPABASE_URL: process.env.SUPABASE_URL || "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
    MATCH_THRESHOLD: Number(process.env.MATCH_THRESHOLD) || 0.55,
  };

  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(`window.APP_CONFIG = ${JSON.stringify(config)};`);
}
