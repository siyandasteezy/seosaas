"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RunScanButton({
  projectId,
  type = "FULL",
  label = "Run full scan",
}: {
  projectId: string;
  type?: "RANKINGS" | "BACKLINKS" | "AUDIT" | "FULL";
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/v1/projects/${projectId}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Scan failed");
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={run}
        disabled={loading}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Scanning…" : label}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </span>
  );
}
