import { prisma } from "@/lib/prisma";
import { getProjectOr404 } from "@/lib/projects";
import { Card, EmptyState, Badge, severityBadgeColor } from "@/components/ui";
import { ScoreRing } from "@/components/charts";
import RunScanButton from "@/components/RunScanButton";

export const metadata = { title: "Audits" };

export default async function AuditsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await getProjectOr404(id);

  const audits = await prisma.audit.findMany({
    where: { projectId: id },
    include: { issues: true },
    orderBy: { startedAt: "desc" },
    take: 10,
  });
  const latest = audits.find((a) => a.status === "COMPLETED");
  const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 } as const;
  const issues = latest ? [...latest.issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]) : [];

  return (
    <div className="space-y-6">
      {latest ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Site health</p>
            <ScoreRing score={latest.score} size={72} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">PageSpeed performance</p>
            <ScoreRing score={latest.performance} size={72} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">PageSpeed SEO</p>
            <ScoreRing score={latest.seoScore} size={72} />
          </div>
        </div>
      ) : (
        <EmptyState
          title="No audits yet"
          body="Run a technical audit to check titles, meta tags, indexability, sitemaps and Core Web Vitals."
          action={role !== "VIEWER" ? <RunScanButton projectId={id} type="AUDIT" label="Run audit now" /> : undefined}
        />
      )}

      {latest && (
        <Card
          title={`Issues from latest audit (${new Date(latest.startedAt).toLocaleString()})`}
          action={role !== "VIEWER" ? <RunScanButton projectId={id} type="AUDIT" label="Re-run audit" /> : undefined}
        >
          {issues.length === 0 ? (
            <p className="text-sm text-emerald-600">No issues found — nice work!</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {issues.map((issue) => (
                <li key={issue.id} className="flex items-start gap-3 py-3">
                  <Badge color={severityBadgeColor(issue.severity)}>{issue.severity.toLowerCase()}</Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      <span className="text-slate-400">{issue.category} · </span>
                      {issue.message}
                    </p>
                    {issue.details && <p className="mt-0.5 truncate text-xs text-slate-500">{issue.details}</p>}
                    {issue.url && <p className="mt-0.5 truncate text-xs text-slate-400">{issue.url}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {audits.length > 0 && (
        <Card title="Audit history">
          <ul className="divide-y divide-slate-100 text-sm">
            {audits.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">{a.startedAt.toLocaleString()}</span>
                <span className="text-slate-500">
                  {a.issues.length} issue(s)
                </span>
                <span className="font-semibold">
                  {a.score != null ? `${a.score}/100` : "—"}
                </span>
                <Badge color={a.status === "COMPLETED" ? "green" : a.status === "FAILED" ? "red" : "yellow"}>
                  {a.status.toLowerCase()}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
