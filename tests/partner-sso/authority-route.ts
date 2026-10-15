export const runtime = "nodejs";

export async function GET(request: Request) {
  if (process.env.GITHUB_ACTIONS !== "true") return new Response(null, { status: 404 });
  const url = new URL(request.url);
  return Response.json({
    urlHost: url.host,
    headerHost: request.headers.get("host"),
    protocol: url.protocol,
  }, { headers: { "Cache-Control": "no-store" } });
}
