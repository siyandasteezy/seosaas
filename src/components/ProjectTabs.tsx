"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { path: "", label: "Overview" },
  { path: "/keywords", label: "Keywords" },
  { path: "/backlinks", label: "Backlinks" },
  { path: "/audits", label: "Audits" },
  { path: "/reports", label: "Reports" },
  { path: "/settings", label: "Settings" },
];

export default function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/projects/${projectId}`;
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((tab) => {
        const href = base + tab.path;
        const active = tab.path === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={tab.label}
            href={href}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              active
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
