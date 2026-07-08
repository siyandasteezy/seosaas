import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard, Card, EmptyState, Badge, scoreColor } from "@/components/ui";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const projects = await prisma.project.findMany({
    where: { memberships: { some: { userId } } },
    include: {
      _count: { select: { keywords: true, backlinks: true } },
      audits: {
        where: { status: "COMPLETED" },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const [keywordCount, backlinkCount, notifications] = await Promise.all([
    prisma.keyword.count({ where: { project: { memberships: { some: { userId } } } } }),
    prisma.backlink.count({
      where: { status: "ACTIVE", project: { memberships: { some: { userId } } } },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Overview</h1>
        <Link
          href="/dashboard/projects/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New project
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Projects" value={projects.length} />
        <StatCard label="Tracked keywords" value={keywordCount} />
        <StatCard label="Active backlinks" value={backlinkCount} />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="Add your first website to start tracking keyword rankings, backlinks and site health."
          action={
            <Link
              href="/dashboard/projects/new"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Add a website
            </Link>
          }
        />
      ) : (
        <Card title="Your projects">
          <ul className="divide-y divide-slate-100">
            {projects.map((p) => {
              const audit = p.audits[0];
              return (
                <li key={p.id}>
                  <Link
                    href={`/dashboard/projects/${p.id}`}
                    className="flex items-center justify-between gap-4 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-sm text-slate-500">{p.domain}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-slate-600">
                      <span>{p._count.keywords} keywords</span>
                      <span>{p._count.backlinks} backlinks</span>
                      <span className={`font-semibold ${scoreColor(audit?.score)}`}>
                        {audit?.score != null ? `${audit.score}/100` : "no audit"}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card
        title="Recent notifications"
        action={
          <Link href="/dashboard/notifications" className="text-sm text-indigo-600 hover:underline">
            View all
          </Link>
        }
      >
        {notifications.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing yet — alerts appear here when rankings move or audits find issues.</p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li key={n.id} className="flex items-start gap-3">
                {!n.read && <Badge color="indigo">new</Badge>}
                <div>
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <p className="text-sm text-slate-500">{n.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
