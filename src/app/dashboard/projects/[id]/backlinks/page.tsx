import { prisma } from "@/lib/prisma";
import { getProjectOr404 } from "@/lib/projects";
import { Card, EmptyState, Badge, StatCard } from "@/components/ui";
import RunScanButton from "@/components/RunScanButton";

export const metadata = { title: "Backlinks" };

export default async function BacklinksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await getProjectOr404(id);

  const backlinks = await prisma.backlink.findMany({
    where: { projectId: id },
    orderBy: [{ status: "asc" }, { domainRating: "desc" }],
  });
  const providerConfigured = !!process.env.BACKLINK_PROVIDER;
  const active = backlinks.filter((b) => b.status === "ACTIVE");
  const avgDr =
    active.length > 0
      ? (active.reduce((s, b) => s + (b.domainRating ?? 0), 0) / active.length).toFixed(1)
      : "—";
  const referringDomains = new Set(
    active.map((b) => {
      try {
        return new URL(b.sourceUrl).hostname;
      } catch {
        return b.sourceUrl;
      }
    })
  ).size;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active backlinks" value={active.length} />
        <StatCard label="Referring domains" value={referringDomains} />
        <StatCard label="Avg domain rating" value={avgDr} />
      </div>

      <Card
        title="Backlinks"
        action={role !== "VIEWER" ? <RunScanButton projectId={id} type="BACKLINKS" label="Refresh backlinks" /> : undefined}
      >
        {backlinks.length === 0 ? (
          providerConfigured ? (
            <EmptyState
              title="No backlinks found yet"
              body="Run a backlink scan to discover links pointing at this domain."
            />
          ) : (
            <EmptyState
              title="Backlink tracking not connected"
              body="Backlink discovery needs a data provider (there's no free source). Set BACKLINK_PROVIDER=dataforseo with your DataForSEO credentials to pull real backlinks, or =demo to preview the UI with sample data."
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Target</th>
                  <th className="py-2 pr-4">Anchor</th>
                  <th className="py-2 pr-4">DR</th>
                  <th className="py-2 pr-4">Last seen</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backlinks.map((b) => (
                  <tr key={b.id} className={b.status === "LOST" ? "opacity-50" : ""}>
                    <td className="max-w-60 truncate py-2.5 pr-4">
                      <a href={b.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                        {b.sourceUrl.replace(/^https?:\/\//, "")}
                      </a>
                    </td>
                    <td className="max-w-52 truncate py-2.5 pr-4 text-slate-600">
                      {b.targetUrl.replace(/^https?:\/\//, "")}
                    </td>
                    <td className="max-w-40 truncate py-2.5 pr-4 text-slate-600">{b.anchorText ?? "—"}</td>
                    <td className="py-2.5 pr-4 font-medium">{b.domainRating ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{b.lastSeen.toLocaleDateString()}</td>
                    <td className="py-2.5">
                      <Badge color={b.status === "ACTIVE" ? "green" : "red"}>{b.status.toLowerCase()}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
