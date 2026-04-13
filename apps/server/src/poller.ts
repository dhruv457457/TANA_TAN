import cron from "node-cron";
import { Strategy, Delegation } from "./models.js";
import { executeStrategy } from "./executor.js";

const BACKEND_ADDRESS = process.env.NEXT_PUBLIC_BACKEND_RELAYER_ADDRESS ?? "";

/**
 * Core poll logic:
 *
 * A delegation is "pending execution" only if:
 *   - The strategy has been triggered (lastTriggeredAt is set), AND
 *   - The delegation has never run (lastExecutedAt is null), OR
 *   - The delegation last ran BEFORE the strategy was last triggered
 *
 * This means each follower executes exactly once per alpha trigger cycle.
 * No re-execution until the alpha triggers again.
 */
async function runPoll() {
  const runId = Date.now();
  console.log(`[${new Date().toISOString()}] [Poller:${runId}] Starting poll...`);

  try {
    const now = Math.floor(Date.now() / 1000);

    // Only strategies that have been triggered at least once
    const strategies = await Strategy.find({
      isActive: true,
      lastTriggeredAt: { $ne: null },
    }).lean();

    let totalExecuted = 0;
    let totalSkipped = 0;

    for (const strategy of strategies) {
      const lastTriggeredAt = strategy.lastTriggeredAt as Date;

      // Count followers due for execution:
      // never executed OR executed before the last trigger
      const pendingCount = await Delegation.countDocuments({
        strategyId: strategy._id,
        isActive: true,
        expiry: { $gt: now },
        $or: [
          { lastExecutedAt: null },
          { lastExecutedAt: { $lt: lastTriggeredAt } },
        ],
      });

      if (pendingCount === 0) {
        totalSkipped++;
        continue;
      }

      console.log(
        `[Poller:${runId}] Strategy ${strategy._id} (${strategy.protocol}) — ${pendingCount} followers pending`
      );

      try {
        const results = await executeStrategy(
          strategy._id.toString(),
          BACKEND_ADDRESS,
          lastTriggeredAt
        );
        const successes = results.filter((r) => r.status === "success").length;
        totalExecuted += successes;
        console.log(
          `[Poller:${runId}] Strategy ${strategy._id}: ${successes}/${results.length} succeeded`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        console.error(`[Poller:${runId}] Strategy ${strategy._id} failed:`, msg);
        if (stack) console.error(stack);
      }
    }

    console.log(
      `[${new Date().toISOString()}] [Poller:${runId}] Done. Executed: ${totalExecuted}, Skipped: ${totalSkipped}`
    );
  } catch (err) {
    console.error(`[Poller:${runId}] Fatal error:`, err);
  }
}

export function startPoller(): void {
  console.log("[Poller] Starting — checking every 5 minutes");
  console.log("[Poller] Running initial poll now...");
  runPoll().catch((err) => console.error("[Poller] Initial poll failed:", err));
  cron.schedule("*/5 * * * *", runPoll);
  console.log("[Poller] Cron scheduled — runs every 5 minutes");
}
