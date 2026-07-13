"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ScanType = "RANKINGS" | "BACKLINKS" | "AUDIT";

const PHASE_LABELS: Record<ScanType, string> = {
  RANKINGS: "Checking rankings…",
  BACKLINKS: "Scanning backlinks…",
  AUDIT: "Running audit…",
};

export default function RunScanButton({
  projectId,
  type = "FULL",
  label = "Run full scan",
}: {
  projectId: string;
  type?: ScanType | "FULL";
  label?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A FULL scan is issued as three separate requests so each one stays
  // within serverless function time limits.
  const phases: ScanType[] = type === "FULL" ? ["RANKINGS", "BACKLINKS", "AUDIT"] : [type];

  async function run() {
    setError(null);
    for (const p of phases) {
      setPhase(PHASE_LABELS[p]);
      try {
        const res = await fetch(`/api/v1/projects/${projectId}/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: p }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(`${p.toLowerCase()} scan failed${data.error ? `: ${data.error}` : ""}`);
          setPhase(null);
          router.refresh();
          return;
        }
      } catch {
        setError(`${p.toLowerCase()} scan failed: network error`);
        setPhase(null);
        router.refresh();
        return;
      }
      router.refresh();
    }
    setPhase(null);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={run}
        disabled={phase !== null}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {phase ?? label}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </span>
  );
}
