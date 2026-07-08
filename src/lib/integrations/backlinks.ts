export interface BacklinkRow {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  domainRating: number;
}

interface BacklinkProvider {
  fetchBacklinks(domain: string): Promise<BacklinkRow[]>;
}

/**
 * Demo provider that generates a stable, plausible backlink profile per
 * domain. Swap in a real provider (DataForSEO, Ahrefs API, Majestic) by
 * implementing BacklinkProvider and wiring it in getBacklinkProvider().
 */
const mockProvider: BacklinkProvider = {
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
      domainRating: Math.round((((hash >> (i % 16)) % 70) + 10) * 10) / 10,
    }));
  },
};

export function getBacklinkProvider(): BacklinkProvider {
  // BACKLINK_PROVIDER reserved for future real providers (e.g. "dataforseo").
  return mockProvider;
}
