import { getChangelog } from "@/lib/changelog-files";

export function GET() {
  return Response.json(
    { days: getChangelog().slice(0, 14) },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
