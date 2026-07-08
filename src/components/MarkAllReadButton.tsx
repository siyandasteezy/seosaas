"use client";

import { useRouter } from "next/navigation";

export default function MarkAllReadButton() {
  const router = useRouter();
  async function markAllRead() {
    await fetch("/api/v1/notifications", { method: "PATCH" });
    router.refresh();
  }
  return (
    <button
      onClick={markAllRead}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
    >
      Mark all as read
    </button>
  );
}
