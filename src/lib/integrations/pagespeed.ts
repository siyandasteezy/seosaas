export interface PageSpeedResult {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  lcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
}

/**
 * Runs Google PageSpeed Insights against a URL. Works without an API key at
 * low volume; set PAGESPEED_API_KEY for production quotas.
 */
export async function runPageSpeed(url: string, strategy: "mobile" | "desktop" = "mobile"): Promise<PageSpeedResult | null> {
  const params = new URLSearchParams({ url, strategy });
  for (const cat of ["performance", "seo", "accessibility", "best-practices"]) {
    params.append("category", cat);
  }
  if (process.env.PAGESPEED_API_KEY) params.set("key", process.env.PAGESPEED_API_KEY);

  const res = await fetch(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`,
    { signal: AbortSignal.timeout(120_000) }
  );
  if (!res.ok) {
    console.error(`[pagespeed] API error ${res.status}: ${await res.text()}`);
    return null;
  }
  const data = await res.json();
  const cats = data.lighthouseResult?.categories ?? {};
  const audits = data.lighthouseResult?.audits ?? {};
  const pct = (c?: { score?: number }) => (c?.score != null ? Math.round(c.score * 100) : null);

  return {
    performance: pct(cats.performance),
    seo: pct(cats.seo),
    accessibility: pct(cats.accessibility),
    bestPractices: pct(cats["best-practices"]),
    lcpMs: audits["largest-contentful-paint"]?.numericValue ?? null,
    cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
    inpMs: audits["interaction-to-next-paint"]?.numericValue ?? null,
  };
}
