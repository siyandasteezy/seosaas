"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, EmptyState, Badge } from "@/components/ui";
import RunScanButton from "@/components/RunScanButton";

interface KeywordRow {
  id: string;
  phrase: string;
  country: string;
  device: string;
  history: { position: number | null; checkedAt: string }[];
}

function Sparkline({ history }: { history: { position: number | null }[] }) {
  const points = history.filter((h) => h.position != null) as { position: number }[];
  if (points.length < 2) return <span className="text-xs text-slate-400">—</span>;
  const max = Math.max(...points.map((p) => p.position), 10);
  const w = 80;
  const h = 24;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = ((p.position - 1) / (max - 1 || 1)) * (h - 4) + 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="text-indigo-500">
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

export default function KeywordManager({
  projectId,
  initialKeywords,
  canEdit,
}: {
  projectId: string;
  initialKeywords: KeywordRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function addKeywords(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    const form = new FormData(e.currentTarget);
    const phrases = String(form.get("phrases") || "")
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
    const res = await fetch(`/api/v1/projects/${projectId}/keywords`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phrases,
        country: form.get("country"),
        device: form.get("device"),
      }),
    });
    setAdding(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to add keywords");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function deleteKeyword(keywordId: string) {
    const res = await fetch(`/api/v1/projects/${projectId}/keywords/${keywordId}`, {
      method: "DELETE",
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <Card title="Add keywords">
          <form onSubmit={addKeywords} className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
              <textarea
                name="phrases"
                rows={3}
                required
                placeholder={"one keyword per line\ne.g. seo tools\nkeyword rank tracker"}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <div className="flex gap-3">
                <select name="country" defaultValue="us" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {["us", "gb", "za", "de", "fr", "au", "ca", "in", "nl", "es"].map((c) => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
                <select name="device" defaultValue="DESKTOP" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="DESKTOP">Desktop</option>
                  <option value="MOBILE">Mobile</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={adding}
              className="h-fit rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add keywords"}
            </button>
          </form>
        </Card>
      )}

      <Card
        title={`Tracked keywords (${initialKeywords.length})`}
        action={canEdit ? <RunScanButton projectId={projectId} type="RANKINGS" label="Check rankings now" /> : undefined}
      >
        {initialKeywords.length === 0 ? (
          <EmptyState title="No keywords tracked" body="Add keywords above, then run a ranking check." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Keyword</th>
                  <th className="py-2 pr-4">Locale</th>
                  <th className="py-2 pr-4">Position</th>
                  <th className="py-2 pr-4">Change</th>
                  <th className="py-2 pr-4">Trend</th>
                  {canEdit && <th className="py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialKeywords.map((k) => {
                  const latest = k.history[k.history.length - 1]?.position ?? null;
                  const previous = k.history[k.history.length - 2]?.position ?? null;
                  const delta = latest != null && previous != null ? previous - latest : null;
                  return (
                    <tr key={k.id}>
                      <td className="py-2.5 pr-4 font-medium text-slate-900">{k.phrase}</td>
                      <td className="py-2.5 pr-4 text-slate-500">
                        {k.country.toUpperCase()} · {k.device.toLowerCase()}
                      </td>
                      <td className="py-2.5 pr-4 font-semibold">
                        {latest != null ? `#${latest}` : <span className="text-slate-400">not ranked</span>}
                      </td>
                      <td className="py-2.5 pr-4">
                        {delta == null || delta === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : delta > 0 ? (
                          <Badge color="green">▲ {delta}</Badge>
                        ) : (
                          <Badge color="red">▼ {Math.abs(delta)}</Badge>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Sparkline history={k.history} />
                      </td>
                      {canEdit && (
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => deleteKeyword(k.id)}
                            className="text-xs text-slate-400 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
