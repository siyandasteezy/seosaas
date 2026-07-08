import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api";
import { requireProjectRole } from "@/lib/rbac";
import { fetchGscDailyStats, fetchGscTopQueries } from "@/lib/integrations/searchConsole";
import { fetchGa4DailyStats } from "@/lib/integrations/analytics";

type Ctx = { params: Promise<{ id: string }> };

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Aggregated Google Search Console + GA4 data for the project dashboard.
 * Each section degrades gracefully (null + reason) when not connected.
 */
export const GET = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const { user } = await requireProjectRole(id, "VIEWER");
  const project = await prisma.project.findUniqueOrThrow({ where: { id } });
  const days = Math.min(90, Number(req.nextUrl.searchParams.get("days")) || 28);
  const startDate = isoDaysAgo(days);
  const endDate = isoDaysAgo(1);

  const [gsc, gscQueries, ga4] = await Promise.all([
    project.gscSiteUrl
      ? fetchGscDailyStats(user.id, project.gscSiteUrl, startDate, endDate).catch((e) => ({
          error: e instanceof Error ? e.message : "Search Console request failed",
        }))
      : { error: "Search Console property not configured for this project" },
    project.gscSiteUrl
      ? fetchGscTopQueries(user.id, project.gscSiteUrl, startDate, endDate).catch(() => [])
      : [],
    project.ga4PropertyId
      ? fetchGa4DailyStats(user.id, project.ga4PropertyId, startDate, endDate).catch((e) => ({
          error: e instanceof Error ? e.message : "GA4 request failed",
        }))
      : { error: "GA4 property not configured for this project" },
  ]);

  return NextResponse.json({ gsc, gscQueries, ga4, startDate, endDate });
});
