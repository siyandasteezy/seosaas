import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState, Badge } from "@/components/ui";
import MarkAllReadButton from "@/components/MarkAllReadButton";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const session = await auth();
  const notifications = await prisma.notification.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unread > 0 && <MarkAllReadButton />}
      </div>
      <Card>
        {notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            body="You'll be notified here when rankings move significantly, backlinks change or audits find critical issues."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <li key={n.id} className="flex items-start gap-3 py-3">
                {!n.read && <Badge color="indigo">new</Badge>}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <p className="text-sm text-slate-600">{n.body}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {n.createdAt.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
