import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getProjectOr404 } from "@/lib/projects";
import { StatCard, Card, Badge } from "@/components/ui";
import { PositionDistributionChart, RankTrendChart, ScoreRing } from "@/components/charts";
import GoogleAnalyticsPanel from "@/components/GoogleAnalyticsPanel";

export const metadata = { title: "Project overview" };

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getProjectOr404(id);

  const [keywords, backlinkActive, backlinkLost, latestAudit, recentScans] = await Promise.all([
    prisma.keyword.findMany({
      where: { projectId: id },
      include: { rankings: { orderBy: { checkedAt: "desc" }, take: 30 } },
    }),
    prisma.backlink.count({ where: { projectId: id, status: "ACTIVE" } }),
    prisma.backlink.count({ where: { projectId: id, status: "LOST" } }),
    prisma.audit.findFirst({
      where: { projectId: id, status: "COMPLETED" },
      orderBy: { startedAt: "desc" },
      include: { issues: true },
    }),
    prisma.scan.findMany({ where: { projectId: id }, orderBy: { startedAt: "desc" }, take: 5 }),
  ]);

  const latest = keywords
    .map((k) => ({ phrase: k.phrase, position: k.rankings[0]?.position ?? null }))
    .filter((k) => k.position != null) as { phrase: string; position: number }[];
  const avgPosition =
    latest.length > 0
      ? (latest.reduce((s, k) => s + k.position, 0) / latest.length).toFixed(1)
      : "—";

  const buckets = [
    { bucket: "1–3", min: 1, max: 3 },
    { bucket: "4–10", min: 4, max: 10 },
    { bucket: "11–20", min: 11, max: 20 },
    { bucket: "21–50", min: 21, max: 50 },
    { bucket: "51–100", min: 51, max: 100 },
  ].map((b) => ({
    bucket: b.bucket,
    count: latest.filter((k) => k.position >= b.min && k.position <= b.max).length,
  }));

  // Rank trend for the 5 keywords with the most history.
  const trendKeywords = [...keywords]
    .sort((a, b) => b.rankings.length - a.rankings.length)
    .slice(0, 5);
  const dates = [
    ...new Set(
      trendKeywords.flatMap((k) => k.rankings.map((r) => r.checkedAt.toISOString().slice(0, 10)))
    ),
  ].sort();
  const trendData = dates.map((date) => {
    const row: { date: string; [k: string]: string | number | null } = { date };
    for (const k of trendKeywords) {
      const snap = k.rankings.find((r) => r.checkedAt.toISOString().slice(0, 10) === date);
      row[k.phrase] = snap?.position ?? null;
    }
    return row;
  });

  const criticalCount = latestAudit?.issues.filter((i) => i.severity === "CRITICAL").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tracked keywords" value={keywords.length} hint={`avg position ${avgPosition}`} />
        <StatCard label="Top 10 rankings" value={latest.filter((k) => k.position <= 10).length} />
        <StatCard label="Active backlinks" value={backlinkActive} hint={`${backlinkLost} lost`} />
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Site health</p>
            <p className="mt-1 text-xs text-slate-500">
              {latestAudit ? `${criticalCount} critical issue(s)` : "no audit yet"}
            </p>
          </div>
          <ScoreRing score={latestAudit?.score ?? null} size={72} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Keyword position trend">
          {trendData.length > 1 ? (
            <RankTrendChart data={trendData} />
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">
              Run at least two ranking scans to see trends.
            </p>
          )}
        </Card>
        <Card title="Position distribution">
          {latest.length > 0 ? (
            <PositionDistributionChart data={buckets} />
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">
              No ranking data yet — add keywords and run a scan.
            </p>
          )}
        </Card>
      </div>

      <GoogleAnalyticsPanel projectId={id} />

      <Card
        title="Recent scans"
        action={
          <Link href={`/dashboard/projects/${id}/audits`} className="text-sm text-indigo-600 hover:underline">
            View audits
          </Link>
        }
      >
        {recentScans.length === 0 ? (
          <p className="text-sm text-slate-500">No scans yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {recentScans.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2.5">
                <span className="font-medium text-slate-700">{s.type.toLowerCase()} scan</span>
                <span className="text-slate-500">{s.startedAt.toLocaleString()}</span>
                <Badge
                  color={s.status === "COMPLETED" ? "green" : s.status === "FAILED" ? "red" : "yellow"}
                >
                  {s.status.toLowerCase()}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
