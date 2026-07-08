import type { Config } from "@netlify/functions";

// Netlify scheduled function: replaces the long-running node-cron worker on
// serverless deployments. It calls the app's own cron endpoint so the scan
// logic runs inside the Next.js server bundle (Prisma, path aliases, env).
export default async () => {
  const siteUrl = process.env.URL || process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.CRON_SECRET;
  if (!siteUrl || !secret) {
    console.error("[scheduled-scans] URL or CRON_SECRET missing — skipping");
    return;
  }

  const res = await fetch(`${siteUrl}/api/v1/cron`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log(`[scheduled-scans] ${res.status}: ${body}`);
};

export const config: Config = {
  // Every 6 hours; per-project DAILY/WEEKLY/MONTHLY due-ness is decided
  // by the app, this just provides the heartbeat.
  schedule: "0 */6 * * *",
};
