"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { TrafficChart } from "@/components/charts";

type DailyRow = { date: string } & Record<string, string | number>;

interface AnalyticsResponse {
  gsc: DailyRow[] | { error: string };
  gscQueries: { query: string; clicks: number; impressions: number; position: number }[];
  ga4: DailyRow[] | { error: string };
}

/** Search Console + GA4 charts, fetched client-side so slow Google APIs don't block the page. */
export default function GoogleAnalyticsPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/projects/${projectId}/analytics?days=28`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setFailed(true));
  }, [projectId]);

  if (failed) return null;

  const gscError = data && !Array.isArray(data.gsc) ? data.gsc.error : null;
  const ga4Error = data && !Array.isArray(data.ga4) ? data.ga4.error : null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Search Console — clicks & impressions (28 days)">
        {!data ? (
          <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
        ) : gscError ? (
          <p className="py-10 text-center text-sm text-slate-500">{gscError}</p>
        ) : (
          <TrafficChart
            data={data.gsc as DailyRow[]}
            series={[
              { key: "clicks", label: "Clicks", color: "#4f46e5" },
              { key: "impressions", label: "Impressions", color: "#0891b2" },
            ]}
          />
        )}
      </Card>
      <Card title="GA4 — sessions & users (28 days)">
        {!data ? (
          <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
        ) : ga4Error ? (
          <p className="py-10 text-center text-sm text-slate-500">{ga4Error}</p>
        ) : (
          <TrafficChart
            data={data.ga4 as DailyRow[]}
            series={[
              { key: "sessions", label: "Sessions", color: "#059669" },
              { key: "totalUsers", label: "Users", color: "#d97706" },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
