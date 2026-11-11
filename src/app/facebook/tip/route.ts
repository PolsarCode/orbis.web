import { weeklyTip } from "@/lib/facebook-tip";

export function GET(request: Request) {
  const tip = weeklyTip(new URL(request.url).searchParams.get("week") ?? "");
  if (!tip) return new Response("Pick a week like 2026-W46.", { status: 404 });

  return Response.json(
    { id: tip.id, title: tip.title, body: tip.body, href: tip.action?.href ?? null },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } },
  );
}
