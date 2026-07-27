export default function middleware(request) {
  const url = new URL(request.url);
  if (url.pathname !== "/history" && url.pathname !== "/history.html") {
    return;
  }

  const expectedPassword = process.env.HISTORY_PASSWORD;
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice(6));
    const password = decoded.split(":")[1] ?? "";
    if (password === expectedPassword) {
      return;
    }
  }

  return new Response("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Attendance Admin"' },
  });
}

export const config = {
  matcher: ["/history", "/history.html"],
};
