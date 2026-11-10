import { redirect } from "next/navigation";
import { chartFromCode } from "@/lib/chart-code";
import { libraryPath } from "@/lib/library";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const chart = chartFromCode((await params).code);
  if (!chart) redirect(libraryPath("charts", "anime"));

  redirect(`${libraryPath("charts", chart.type, chart.week)}#discussion`);
}
