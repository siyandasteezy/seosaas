"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/projects", label: "Projects" },
  { href: "/dashboard/notifications", label: "Notifications" },
];

export default function Sidebar({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
      <Link href="/dashboard" className="px-5 py-5 text-lg font-bold tracking-tight text-white">
        Rank<span className="text-indigo-400">Lens</span>
      </Link>
      <nav className="flex-1 space-y-1 px-3">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              {link.label}
              {link.label === "Notifications" && unreadCount > 0 && (
                <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <p className="px-5 py-4 text-xs text-slate-600">RankLens v1.0</p>
    </aside>
  );
}
