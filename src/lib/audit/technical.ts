import { IssueSeverity } from "@prisma/client";
import { runPageSpeed } from "@/lib/integrations/pagespeed";

export interface FoundIssue {
  severity: IssueSeverity;
  category: string;
  message: string;
  url?: string;
  details?: string;
}

export interface TechnicalAuditResult {
  score: number;
  performance: number | null;
  seoScore: number | null;
  issues: FoundIssue[];
}

const SEVERITY_WEIGHT: Record<IssueSeverity, number> = {
  CRITICAL: 15,
  WARNING: 6,
  INFO: 1,
};

async function fetchPage(url: string) {
  const started = Date.now();
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "RankLensBot/1.0 (+https://ranklens.local)" },
    signal: AbortSignal.timeout(30_000),
  });
  const html = await res.text();
  return { res, html, responseMs: Date.now() - started };
}

function extract(html: string, regex: RegExp): string | null {
  const m = html.match(regex);
  return m ? m[1].trim() : null;
}

/**
 * Crawls the site's homepage plus robots.txt/sitemap.xml and runs a set of
 * on-page and infrastructure checks, then folds in PageSpeed Insights scores.
 */
export async function runTechnicalAudit(domain: string): Promise<TechnicalAuditResult> {
  const issues: FoundIssue[] = [];
  const bare = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const httpsUrl = `https://${bare}/`;

  let html = "";
  let finalUrl = httpsUrl;
  try {
    const page = await fetchPage(httpsUrl);
    html = page.html;
    finalUrl = page.res.url;

    if (!page.res.ok) {
      issues.push({
        severity: "CRITICAL",
        category: "Availability",
        message: `Homepage returned HTTP ${page.res.status}`,
        url: httpsUrl,
      });
    }
    if (page.responseMs > 3000) {
      issues.push({
        severity: "WARNING",
        category: "Performance",
        message: `Slow server response (${page.responseMs} ms)`,
        url: httpsUrl,
        details: "Aim for under 600 ms time-to-first-byte.",
      });
    }
    if (!page.res.url.startsWith("https://")) {
      issues.push({
        severity: "CRITICAL",
        category: "Security",
        message: "Site does not resolve to HTTPS",
        url: page.res.url,
      });
    }
    if (Buffer.byteLength(html, "utf8") > 3_000_000) {
      issues.push({
        severity: "WARNING",
        category: "Performance",
        message: "Homepage HTML exceeds 3 MB",
        url: finalUrl,
      });
    }
  } catch (err) {
    return {
      score: 0,
      performance: null,
      seoScore: null,
      issues: [
        {
          severity: "CRITICAL",
          category: "Availability",
          message: `Could not reach ${httpsUrl}`,
          details: err instanceof Error ? err.message : String(err),
        },
      ],
    };
  }

  // --- On-page checks ---
  const title = extract(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!title) {
    issues.push({ severity: "CRITICAL", category: "On-page", message: "Missing <title> tag", url: finalUrl });
  } else if (title.length < 15 || title.length > 65) {
    issues.push({
      severity: "WARNING",
      category: "On-page",
      message: `Title length ${title.length} chars (recommended 15–65)`,
      url: finalUrl,
      details: title.slice(0, 120),
    });
  }

  const metaDesc = extract(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    ?? extract(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  if (!metaDesc) {
    issues.push({ severity: "WARNING", category: "On-page", message: "Missing meta description", url: finalUrl });
  } else if (metaDesc.length < 50 || metaDesc.length > 165) {
    issues.push({
      severity: "INFO",
      category: "On-page",
      message: `Meta description length ${metaDesc.length} chars (recommended 50–165)`,
      url: finalUrl,
    });
  }

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count === 0) {
    issues.push({ severity: "WARNING", category: "On-page", message: "No <h1> heading found", url: finalUrl });
  } else if (h1Count > 1) {
    issues.push({ severity: "INFO", category: "On-page", message: `${h1Count} <h1> headings found (recommended 1)`, url: finalUrl });
  }

  if (!/<link[^>]+rel=["']canonical["']/i.test(html)) {
    issues.push({ severity: "INFO", category: "On-page", message: "Missing canonical link tag", url: finalUrl });
  }
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
    issues.push({ severity: "WARNING", category: "Mobile", message: "Missing viewport meta tag", url: finalUrl });
  }
  if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) {
    issues.push({ severity: "CRITICAL", category: "Indexing", message: "Homepage has a noindex robots meta tag", url: finalUrl });
  }
  if (!/<meta[^>]+property=["']og:/i.test(html)) {
    issues.push({ severity: "INFO", category: "Social", message: "Missing Open Graph tags", url: finalUrl });
  }

  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const missingAlt = imgTags.filter((t) => !/alt=["'][^"']+["']/i.test(t)).length;
  if (missingAlt > 0) {
    issues.push({
      severity: "INFO",
      category: "Accessibility",
      message: `${missingAlt} of ${imgTags.length} images missing alt text`,
      url: finalUrl,
    });
  }

  // --- robots.txt & sitemap ---
  try {
    const robots = await fetch(`https://${bare}/robots.txt`, { signal: AbortSignal.timeout(15_000) });
    if (!robots.ok) {
      issues.push({ severity: "INFO", category: "Indexing", message: "No robots.txt found" });
    } else {
      const body = await robots.text();
      if (/^\s*User-agent:\s*\*\s*[\r\n]+\s*Disallow:\s*\/\s*$/im.test(body)) {
        issues.push({ severity: "CRITICAL", category: "Indexing", message: "robots.txt blocks the entire site (Disallow: /)" });
      }
      if (!/sitemap:/i.test(body)) {
        const sm = await fetch(`https://${bare}/sitemap.xml`, {
          method: "HEAD",
          signal: AbortSignal.timeout(15_000),
        }).catch(() => null);
        if (!sm || !sm.ok) {
          issues.push({ severity: "WARNING", category: "Indexing", message: "No sitemap.xml found or declared in robots.txt" });
        }
      }
    }
  } catch {
    issues.push({ severity: "INFO", category: "Indexing", message: "Could not fetch robots.txt" });
  }

  // --- PageSpeed Insights ---
  let performance: number | null = null;
  let seoScore: number | null = null;
  try {
    const psi = await runPageSpeed(finalUrl);
    if (psi) {
      performance = psi.performance;
      seoScore = psi.seo;
      if (psi.performance != null && psi.performance < 50) {
        issues.push({
          severity: "WARNING",
          category: "Performance",
          message: `Low PageSpeed performance score (${psi.performance}/100)`,
          url: finalUrl,
        });
      }
      if (psi.lcpMs != null && psi.lcpMs > 4000) {
        issues.push({
          severity: "WARNING",
          category: "Core Web Vitals",
          message: `LCP is ${(psi.lcpMs / 1000).toFixed(1)}s (should be under 2.5s)`,
          url: finalUrl,
        });
      }
      if (psi.cls != null && psi.cls > 0.25) {
        issues.push({
          severity: "WARNING",
          category: "Core Web Vitals",
          message: `CLS is ${psi.cls.toFixed(2)} (should be under 0.1)`,
          url: finalUrl,
        });
      }
    }
  } catch (err) {
    console.error("[audit] PageSpeed check failed:", err);
  }

  const penalty = issues.reduce((sum, i) => sum + SEVERITY_WEIGHT[i.severity], 0);
  const score = Math.max(0, 100 - penalty);
  return { score, performance, seoScore, issues };
}
