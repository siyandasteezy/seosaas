import cron from "node-cron";
import { runDueScheduledScans } from "../src/lib/scans";

async function tick() {
  const summary = await runDueScheduledScans();
  if (summary.due > 0) {
    for (const r of summary.results) {
      console.log(`[worker] ${r.ok ? "✓" : "✗"} ${r.project}`);
    }
  }
}

console.log("[worker] RankLens scan worker started — checking every 15 minutes");
cron.schedule("*/15 * * * *", () => {
  tick().catch((err) => console.error("[worker] tick failed:", err));
});

// Also run once at startup so a fresh deployment scans immediately.
tick().catch((err) => console.error("[worker] initial run failed:", err));
