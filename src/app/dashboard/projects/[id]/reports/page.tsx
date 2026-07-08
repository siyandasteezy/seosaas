import { prisma } from "@/lib/prisma";
import { getProjectOr404 } from "@/lib/projects";
import { Card, EmptyState, Badge } from "@/components/ui";
import GenerateReportButtons from "@/components/GenerateReportButtons";

export const metadata = { title: "Reports" };

export default async function ReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await getProjectOr404(id);

  const reports = await prisma.report.findMany({
    where: { projectId: id },
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <Card
        title="Reports"
        action={role !== "VIEWER" ? <GenerateReportButtons projectId={id} /> : undefined}
      >
        {reports.length === 0 ? (
          <EmptyState
            title="No reports yet"
            body="Generate a PDF summary or CSV keyword export to share with your team or clients."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Report</th>
                  <th className="py-2 pr-4">Format</th>
                  <th className="py-2 pr-4">Created by</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{r.title}</td>
                    <td className="py-2.5 pr-4">
                      <Badge color={r.format === "PDF" ? "indigo" : "green"}>{r.format}</Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">
                      {r.createdBy?.name ?? r.createdBy?.email ?? "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">{r.createdAt.toLocaleString()}</td>
                    <td className="py-2.5 text-right">
                      <a
                        href={`/api/v1/projects/${id}/reports/${r.id}/download`}
                        className="text-sm font-medium text-indigo-600 hover:underline"
                      >
                        Download
                      </a>
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
