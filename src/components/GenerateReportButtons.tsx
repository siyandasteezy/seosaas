"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateReportButtons({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(format: "PDF" | "CSV") {
    setBusy(format);
    setError(null);
    const res = await fetch(`/api/v1/projects/${projectId}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to generate report");
      return;
    }
    router.refresh();
  }

  return (
    <span className="flex items-center gap-2">
      {error && <span className="text-sm text-red-600">{error}</span>}
      <button
        onClick={() => generate("PDF")}
        disabled={busy !== null}
        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy === "PDF" ? "Generating…" : "Generate PDF"}
      </button>
      <button
        onClick={() => generate("CSV")}
        disabled={busy !== null}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {busy === "CSV" ? "Generating…" : "Export CSV"}
      </button>
    </span>
  );
}
