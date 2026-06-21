const allowedOrigins = (Deno.env.get("CORS_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const appOrigins = [
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "https://ahsan753.github.io",
  "https://ashah.github.io",
];

export function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const configuredOrigins = [...allowedOrigins, ...appOrigins];
  const allowOrigin =
    origin && (allowedOrigins.length === 0 || configuredOrigins.includes(origin))
      ? origin
      : configuredOrigins[0] ?? "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function jsonResponse(req: Request, body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      ...corsHeaders(req),
      ...(init?.headers ?? {}),
    },
  });
}
