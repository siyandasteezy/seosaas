export interface BacklinkRow {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  domainRating: number;
}

export interface BacklinkProvider {
  readonly name: string;
  fetchBacklinks(domain: string): Promise<BacklinkRow[]>;
}

/**
 * Real backlink data via DataForSEO (https://dataforseo.com) — pay-as-you-go,
 * roughly $0.02 per request. Set BACKLINK_PROVIDER=dataforseo and
 * DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD.
 */
const dataForSeoProvider: BacklinkProvider = {
  name: "dataforseo",
  async fetchBacklinks(domain) {
    const bare = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const auth = Buffer.from(
      `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
    ).toString("base64");

    const res = await fetch("https://api.dataforseo.com/v3/backlinks/backlinks/live", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        { target: bare, mode: "as_is", limit: 100, order_by: ["rank,desc"] },
      ]),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`DataForSEO error ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const items = data.tasks?.[0]?.result?.[0]?.items ?? [];
    return items.map(
      (it: {
        url_from?: string;
        url_to?: string;
        anchor?: string;
        domain_from_rank?: number;
        rank?: number;
      }) => ({
        sourceUrl: it.url_from ?? "",
        targetUrl: it.url_to ?? `https://${bare}/`,
        anchorText: it.anchor ?? "",
        // DataForSEO ranks are 0–1000; normalise to a 0–100 domain rating.
        domainRating: Math.round(((it.domain_from_rank ?? it.rank ?? 0) / 10) * 10) / 10,
      })
    );
  },
};

/**
 * Deterministic demo data for showcasing the UI without a paid provider.
 * Opt in explicitly with BACKLINK_PROVIDER=demo — it is NOT used by default,
 * so production never shows fabricated backlinks as if they were real.
 */
const demoProvider: BacklinkProvider = {
  name: "demo",
  async fetchBacklinks(domain) {
    const bare = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    let hash = 0;
    for (const c of bare) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    const sources = [
      "techblog.example.com",
      "news.example.org",
      "directory.example.net",
      "reviews.example.io",
      "forum.example.dev",
      "medium.example.com",
      "partners.example.co",
      "resources.example.info",
    ];
    const anchors = [bare, `visit ${bare}`, "read more", "official site", "this guide", "source"];
    const count = 4 + (hash % 5);
    return Array.from({ length: count }, (_, i) => ({
      sourceUrl: `https://${sources[(hash + i) % sources.length]}/post-${(hash % 900) + i}`,
      targetUrl: `https://${bare}/${i % 3 === 0 ? "" : `page-${i}`}`,
      anchorText: anchors[(hash + i) % anchors.length],
      // Unsigned shift (>>>) keeps this in 0–79; `>>` produced negatives.
      domainRating: Math.round(((hash >>> (i % 16)) % 70) + 10),
    }));
  },
};

/**
 * Returns the configured backlink provider, or null when none is set up.
 * A null result means "backlink tracking isn't connected" — the scan records
 * that and the UI shows a connect-a-provider empty state, rather than
 * inventing data.
 */
export function getBacklinkProvider(): BacklinkProvider | null {
  switch (process.env.BACKLINK_PROVIDER) {
    case "dataforseo":
      if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
        console.warn("[backlinks] BACKLINK_PROVIDER=dataforseo but credentials missing");
        return null;
      }
      return dataForSeoProvider;
    case "demo":
      return demoProvider;
    default:
      return null;
  }
}
