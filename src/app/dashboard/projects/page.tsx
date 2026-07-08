import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState, Badge, scoreColor } from "@/components/ui";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const session = await auth();
  const projects = await prisma.project.findMany({
    where: { memberships: { some: { userId: session!.user.id } } },
    include: {
      _count: { select: { keywords: true, backlinks: true } },
      audits: { where: { status: "COMPLETED" }, orderBy: { startedAt: "desc" }, take: 1 },
      memberships: { where: { userId: session!.user.id } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link
          href="/dashboard/projects/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="Add your first website to start tracking rankings, backlinks and site health."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/projects/${p.id}`}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{p.name}</h3>
                  <p className="text-sm text-slate-500">{p.domain}</p>
                </div>
                <Badge color="gray">{p.memberships[0]?.role.toLowerCase()}</Badge>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
                <span>{p._count.keywords} kw</span>
                <span>{p._count.backlinks} links</span>
                <span className={`ml-auto font-semibold ${scoreColor(p.audits[0]?.score)}`}>
                  {p.audits[0]?.score != null ? `${p.audits[0].score}/100` : "—"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
