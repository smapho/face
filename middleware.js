function getCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export default function middleware(request) {
  const url = new URL(request.url);
  if (url.pathname !== "/history" && url.pathname !== "/history.html") {
    return;
  }

  const token = getCookie(request, "history_auth");
  if (token && token === process.env.HISTORY_PASSWORD) {
    return;
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", "/history");
  return Response.redirect(loginUrl, 302);
}

export const config = {
  matcher: ["/history", "/history.html"],
};
