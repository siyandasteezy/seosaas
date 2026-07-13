import { ScanFrequency, ScanType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSerpProvider } from "@/lib/integrations/serp";
import { getBacklinkProvider } from "@/lib/integrations/backlinks";
import { runTechnicalAudit } from "@/lib/audit/technical";
import { sendMail, alertEmailHtml } from "@/lib/mail";

/** Notifies all project members (in-app + optional email). */
async function notifyProject(projectId: string, title: string, body: string, email: boolean) {
  const memberships = await prisma.membership.findMany({
    where: { projectId },
    include: { user: true },
  });
  await prisma.notification.createMany({
    data: memberships.map((m) => ({ userId: m.userId, title, body })),
  });
  if (email) {
    await Promise.all(
      memberships.map((m) =>
        sendMail(m.user.email, title, alertEmailHtml(title, [body], `/dashboard/projects/${projectId}`))
      )
    );
  }
}

export async function runRankingScan(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { keywords: true },
  });
  const provider = getSerpProvider();
  const bigMoves: string[] = [];

  // Keywords are checked in parallel (bounded) so large projects finish
  // within serverless function time limits. 5 keeps us inside SerpAPI's
  // free-plan rate limits.
  const CONCURRENCY = 5;
  const queue = [...project.keywords];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let keyword = queue.shift(); keyword; keyword = queue.shift()) {
      try {
        const [previous, result] = await Promise.all([
          prisma.rankSnapshot.findFirst({
            where: { keywordId: keyword.id },
            orderBy: { checkedAt: "desc" },
          }),
          provider.checkRank(keyword.phrase, project.domain, keyword.country, keyword.device),
        ]);
        await prisma.rankSnapshot.create({
          data: { keywordId: keyword.id, position: result.position, url: result.url },
        });
        if (previous?.position && result.position && Math.abs(previous.position - result.position) >= 5) {
          const dir = result.position < previous.position ? "▲ up" : "▼ down";
          bigMoves.push(
            `"${keyword.phrase}" moved ${dir} from #${previous.position} to #${result.position}`
          );
        }
      } catch (err) {
        console.error(`[scan] rank check failed for "${keyword.phrase}":`, err);
      }
    }
  });
  await Promise.all(workers);

  if (bigMoves.length > 0) {
    await notifyProject(
      projectId,
      `Ranking changes for ${project.name}`,
      bigMoves.join(" · "),
      project.emailAlerts
    );
  }
  return { keywordsChecked: project.keywords.length, bigMoves: bigMoves.length };
}

export async function runBacklinkScan(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const rows = await getBacklinkProvider().fetchBacklinks(project.domain);
  const seenKeys = new Set<string>();
  let newLinks = 0;

  for (const row of rows) {
    seenKeys.add(`${row.sourceUrl}|${row.targetUrl}`);
    const existing = await prisma.backlink.findUnique({
      where: {
        projectId_sourceUrl_targetUrl: {
          projectId,
          sourceUrl: row.sourceUrl,
          targetUrl: row.targetUrl,
        },
      },
    });
    if (existing) {
      await prisma.backlink.update({
        where: { id: existing.id },
        data: { lastSeen: new Date(), status: "ACTIVE", domainRating: row.domainRating },
      });
    } else {
      newLinks++;
      await prisma.backlink.create({
        data: {
          projectId,
          sourceUrl: row.sourceUrl,
          targetUrl: row.targetUrl,
          anchorText: row.anchorText,
          domainRating: row.domainRating,
        },
      });
    }
  }

  // Mark links that disappeared from the provider as lost.
  const active = await prisma.backlink.findMany({ where: { projectId, status: "ACTIVE" } });
  const lost = active.filter((b) => !seenKeys.has(`${b.sourceUrl}|${b.targetUrl}`));
  if (lost.length > 0) {
    await prisma.backlink.updateMany({
      where: { id: { in: lost.map((b) => b.id) } },
      data: { status: "LOST" },
    });
  }

  if (newLinks > 0 || lost.length > 0) {
    await notifyProject(
      projectId,
      `Backlink changes for ${project.name}`,
      `${newLinks} new backlink(s), ${lost.length} lost.`,
      project.emailAlerts
    );
  }
  return { total: rows.length, new: newLinks, lost: lost.length };
}

export async function runAuditScan(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const audit = await prisma.audit.create({ data: { projectId, status: "RUNNING" } });
  try {
    const result = await runTechnicalAudit(project.domain);
    await prisma.audit.update({
      where: { id: audit.id },
      data: {
        status: "COMPLETED",
        score: result.score,
        performance: result.performance,
        seoScore: result.seoScore,
        completedAt: new Date(),
        issues: { createMany: { data: result.issues } },
      },
    });
    const critical = result.issues.filter((i) => i.severity === "CRITICAL").length;
    if (critical > 0) {
      await notifyProject(
        projectId,
        `Audit found ${critical} critical issue(s) on ${project.name}`,
        `Site health score: ${result.score}/100.`,
        project.emailAlerts
      );
    }
    return { auditId: audit.id, score: result.score, issues: result.issues.length };
  } catch (err) {
    await prisma.audit.update({
      where: { id: audit.id },
      data: { status: "FAILED", completedAt: new Date() },
    });
    throw err;
  }
}

const FREQUENCY_MS: Record<Exclude<ScanFrequency, "MANUAL">, number> = {
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
  MONTHLY: 30 * 24 * 60 * 60 * 1000,
};

/** Projects whose scheduled scan is due right now. */
export async function listDueProjects() {
  const projects = await prisma.project.findMany({
    where: { scanFrequency: { not: "MANUAL" } },
  });
  const now = Date.now();
  return projects.filter((p) => {
    const interval = FREQUENCY_MS[p.scanFrequency as Exclude<ScanFrequency, "MANUAL">];
    return !p.lastScanAt || now - p.lastScanAt.getTime() >= interval;
  });
}

/**
 * Runs a FULL scan for every due project in one process. Used by the
 * long-running node-cron worker; serverless schedulers should instead call
 * the /api/v1/cron endpoint per project+type to stay inside time limits.
 */
export async function runDueScheduledScans() {
  const due = await listDueProjects();
  const checked = await prisma.project.count({ where: { scanFrequency: { not: "MANUAL" } } });

  const results: { project: string; ok: boolean }[] = [];
  for (const project of due) {
    try {
      await runScan(project.id, "FULL");
      results.push({ project: project.name, ok: true });
    } catch (err) {
      console.error(`[scans] scheduled scan failed for ${project.name}:`, err);
      results.push({ project: project.name, ok: false });
    }
  }
  return { checked, due: due.length, results };
}

/**
 * Runs a scan of the given type, recording progress in the Scan table.
 * Used by both the REST API (manual trigger) and the cron worker.
 */
export async function runScan(projectId: string, type: ScanType) {
  const scan = await prisma.scan.create({ data: { projectId, type, status: "RUNNING" } });
  try {
    if (type === "RANKINGS" || type === "FULL") await runRankingScan(projectId);
    if (type === "BACKLINKS" || type === "FULL") await runBacklinkScan(projectId);
    if (type === "AUDIT" || type === "FULL") await runAuditScan(projectId);
    await prisma.scan.update({
      where: { id: scan.id },
      data: { status: "COMPLETED", finishedAt: new Date() },
    });
    await prisma.project.update({ where: { id: projectId }, data: { lastScanAt: new Date() } });
  } catch (err) {
    await prisma.scan.update({
      where: { id: scan.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
  return scan.id;
}
