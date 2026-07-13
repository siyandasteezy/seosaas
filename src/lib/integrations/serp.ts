export interface SerpResult {
  position: number | null; // 1-100, null = not in top 100
  url: string | null;
}

interface SerpProvider {
  checkRank(phrase: string, domain: string, country: string, device: string): Promise<SerpResult>;
}

/**
 * Real provider backed by serpapi.com. Requires SERPAPI_KEY.
 *
 * Google dropped support for num=100 (Sept 2025), so results come ~10 per
 * page and we paginate up to SERP_DEPTH (default 20). Each page of 10 costs
 * one SerpAPI search credit; we stop early once the domain is found.
 */
const serpApiProvider: SerpProvider = {
  async checkRank(phrase, domain, country, device) {
    const depth = Math.min(100, Math.max(10, Number(process.env.SERP_DEPTH) || 20));
    const bare = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");

    for (let start = 0; start < depth; start += 10) {
      const params = new URLSearchParams({
        engine: "google",
        q: phrase,
        gl: country,
        device: device.toLowerCase(),
        api_key: process.env.SERPAPI_KEY || "",
      });
      if (start > 0) params.set("start", String(start));

      const res = await fetch(`https://serpapi.com/search.json?${params}`, {
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`SerpAPI error ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const organic: { position: number; link: string }[] = data.organic_results ?? [];
      if (organic.length === 0) break; // no more results

      const idx = organic.findIndex((r) => {
        try {
          return new URL(r.link).hostname.replace(/^www\./, "").endsWith(bare);
        } catch {
          return false;
        }
      });
      if (idx >= 0) {
        // SerpAPI's position field restarts on each page — compute absolute.
        return { position: start + idx + 1, url: organic[idx].link };
      }
      if (organic.length < 10) break; // last page
    }
    return { position: null, url: null };
  },
};

/**
 * Deterministic demo provider: produces a plausible, slowly-drifting rank per
 * keyword so the app is fully usable without a paid SERP API key.
 */
const mockProvider: SerpProvider = {
  async checkRank(phrase, domain) {
    let hash = 0;
    for (const c of phrase + domain) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    const base = (hash % 40) + 1; // stable base position 1-40
    const dayDrift = Math.floor(Date.now() / 86_400_000) % 7;
    const jitter = ((hash >> 8) % 5) - 2;
    const position = Math.min(100, Math.max(1, base + ((dayDrift + jitter) % 5) - 2));
    return {
      position,
      url: `https://${domain.replace(/^https?:\/\//, "")}/`,
    };
  },
};

export function getSerpProvider(): SerpProvider {
  const name = process.env.SERP_PROVIDER || "mock";
  if (name === "serpapi") {
    if (!process.env.SERPAPI_KEY) {
      console.warn("[serp] SERP_PROVIDER=serpapi but SERPAPI_KEY missing — using mock");
      return mockProvider;
    }
    return serpApiProvider;
  }
  return mockProvider;
}
