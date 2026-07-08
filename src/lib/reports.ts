import { promises as fs } from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";

function storageDir() {
  return path.resolve(process.env.REPORT_STORAGE_DIR || "./storage/reports");
}

/** Legacy fallback for reports created before content was stored in the DB. */
export async function readLegacyReportFile(filePath: string) {
  return fs.readFile(path.join(storageDir(), filePath)).catch(() => null);
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

async function collectProjectData(projectId: string) {
  return prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      keywords: {
        include: { rankings: { orderBy: { checkedAt: "desc" }, take: 2 } },
        orderBy: { phrase: "asc" },
      },
      backlinks: { orderBy: { domainRating: "desc" } },
      audits: {
        where: { status: "COMPLETED" },
        orderBy: { startedAt: "desc" },
        take: 1,
        include: { issues: true },
      },
    },
  });
}

export async function generateCsvReport(projectId: string, createdById: string) {
  const project = await collectProjectData(projectId);
  const rows = project.keywords.map((k) => {
    const [latest, previous] = k.rankings;
    return [
      k.phrase,
      k.country,
      k.device,
      latest?.position ?? "not ranked",
      previous?.position ?? "",
      latest?.url ?? "",
      latest?.checkedAt.toISOString() ?? "",
    ];
  });
  const csv = toCsv(
    ["Keyword", "Country", "Device", "Position", "Previous position", "Ranking URL", "Checked at"],
    rows
  );
  return prisma.report.create({
    data: {
      projectId,
      createdById,
      title: `${project.name} — keyword rankings`,
      format: "CSV",
      content: Buffer.from(csv, "utf8"),
    },
  });
}

export async function generatePdfReport(projectId: string, createdById: string) {
  const project = await collectProjectData(projectId);
  const audit = project.audits[0];

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const indigo = rgb(0.31, 0.27, 0.9);
  const gray = rgb(0.35, 0.38, 0.45);
  const dark = rgb(0.07, 0.09, 0.15);

  let page = doc.addPage([595, 842]); // A4
  let y = 780;
  const margin = 50;

  const newPageIfNeeded = (needed = 40) => {
    if (y < margin + needed) {
      page = doc.addPage([595, 842]);
      y = 780;
    }
  };
  const text = (s: string, size: number, opts: { bold?: boolean; color?: ReturnType<typeof rgb>; x?: number } = {}) => {
    newPageIfNeeded(size + 10);
    page.drawText(s.slice(0, 110), {
      x: opts.x ?? margin,
      y,
      size,
      font: opts.bold ? bold : font,
      color: opts.color ?? dark,
    });
    y -= size + 8;
  };

  // Header
  page.drawRectangle({ x: 0, y: 800, width: 595, height: 42, color: indigo });
  page.drawText("RankLens SEO Report", { x: margin, y: 814, size: 16, font: bold, color: rgb(1, 1, 1) });
  y = 760;

  text(project.name, 22, { bold: true });
  text(project.domain, 12, { color: gray });
  text(`Generated ${new Date().toUTCString()}`, 10, { color: gray });
  y -= 12;

  // Summary
  text("Overview", 14, { bold: true, color: indigo });
  const ranked = project.keywords.filter((k) => k.rankings[0]?.position != null);
  const top10 = ranked.filter((k) => (k.rankings[0].position ?? 101) <= 10);
  const avg =
    ranked.length > 0
      ? (ranked.reduce((s, k) => s + (k.rankings[0].position ?? 0), 0) / ranked.length).toFixed(1)
      : "—";
  text(`Tracked keywords: ${project.keywords.length}   ·   Ranking: ${ranked.length}   ·   Top 10: ${top10.length}   ·   Avg position: ${avg}`, 11);
  text(`Active backlinks: ${project.backlinks.filter((b) => b.status === "ACTIVE").length}   ·   Lost: ${project.backlinks.filter((b) => b.status === "LOST").length}`, 11);
  if (audit) {
    text(`Site health score: ${audit.score}/100   ·   PageSpeed performance: ${audit.performance ?? "—"}   ·   PageSpeed SEO: ${audit.seoScore ?? "—"}`, 11);
  }
  y -= 12;

  // Keywords
  text("Keyword rankings", 14, { bold: true, color: indigo });
  for (const k of project.keywords.slice(0, 40)) {
    const [latest, previous] = k.rankings;
    const delta =
      latest?.position != null && previous?.position != null
        ? previous.position - latest.position
        : null;
    const deltaStr = delta == null ? "" : delta > 0 ? `  (+${delta})` : delta < 0 ? `  (${delta})` : "  (=)";
    text(
      `#${latest?.position ?? "—"}${deltaStr}   ${k.phrase}   [${k.country}/${k.device.toLowerCase()}]`,
      10
    );
  }
  y -= 12;

  // Audit issues
  if (audit) {
    text("Top audit issues", 14, { bold: true, color: indigo });
    const order = { CRITICAL: 0, WARNING: 1, INFO: 2 } as const;
    const sorted = [...audit.issues].sort((a, b) => order[a.severity] - order[b.severity]);
    for (const issue of sorted.slice(0, 25)) {
      text(`[${issue.severity}] ${issue.category}: ${issue.message}`, 10);
    }
  }

  return prisma.report.create({
    data: {
      projectId,
      createdById,
      title: `${project.name} — SEO report`,
      format: "PDF",
      content: Buffer.from(await doc.save()),
    },
  });
}
