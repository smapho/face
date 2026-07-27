export default function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  const { password } = req.body || {};

  if (password && password === process.env.HISTORY_PASSWORD) {
    res.setHeader(
      "Set-Cookie",
      `history_auth=${encodeURIComponent(password)}; Path=/; HttpOnly; Max-Age=28800; SameSite=Lax`
    );
    res.status(200).json({ ok: true });
    return;
  }

  res.status(401).json({ ok: false, message: "パスワードが違います" });
}
