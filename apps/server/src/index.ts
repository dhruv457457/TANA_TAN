import path from "path";
import fs from "fs";
import http from "http";

// Load env: server .env first, then web .env as fallback
const serverEnv = path.join(process.cwd(), ".env");
const webEnv = path.join(process.cwd(), "..", "web", ".env");
const envPath = fs.existsSync(serverEnv) ? serverEnv : webEnv;
if (fs.existsSync(envPath)) {
  const { config } = await import("dotenv");
  config({ path: envPath });
}

import { createPublicClient, http as viemHttp, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { connectDB } from "./mongoose.js";
import { startPoller } from "./poller.js";

const PORT = Number(process.env.PORT ?? 3001);

async function checkRelayerBalance() {
  const pk = process.env.BACKEND_PRIVATE_KEY as `0x${string}`;
  if (!pk) return;
  try {
    const account = privateKeyToAccount(pk);
    const client = createPublicClient({ chain: base, transport: viemHttp("https://mainnet.base.org") });
    const balance = await client.getBalance({ address: account.address });
    const eth = formatEther(balance);
    const warn = balance === 0n ? " ⚠️  ZERO — fund this address!" : balance < 100000000000000n ? " ⚠️  LOW (<0.0001 ETH)" : " ✓";
    console.log(`  - RELAYER ADDRESS: ${account.address}`);
    console.log(`  - RELAYER ETH (Base): ${eth} ETH${warn}`);
  } catch (err) {
    console.log(`  - RELAYER BALANCE: could not fetch (${err})`);
  }
}

async function main() {
  console.log("=".repeat(50));
  console.log("TANA-TAN Server Starting...");
  console.log("=".repeat(50));

  await connectDB();

  console.log(`[Server] Env check:`);
  console.log(`  - BACKEND_PRIVATE_KEY: ${process.env.BACKEND_PRIVATE_KEY ? "✓ set" : "✗ MISSING"}`);
  console.log(`  - TANA_AUTO_DEPOSIT: ${process.env.TANA_AUTO_DEPOSIT ? "✓ set" : "✗ MISSING"}`);
  console.log(`  - MONGODB_URI: ${process.env.MONGODB_URI ? "✓ set" : "✗ MISSING"}`);
  console.log(`  - TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? "✓ set" : "✗ not configured"}`);
  console.log(`  - TELEGRAM_CHAT_ID: ${process.env.TELEGRAM_CHAT_ID ? "✓ set" : "✗ not configured"}`);
  console.log(`  - LIFI_API_KEY: ${process.env.LIFI_API_KEY ? "✓ set" : "✗ not configured"}`);
  await checkRelayerBalance();
  console.log("=".repeat(50));

  // ── HTTP server (required by Railway for health checks) ──────────────────
  const server = http.createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(PORT, () => {
    console.log(`[Server] HTTP health endpoint listening on port ${PORT}`);
  });

  // ── Start the 5-minute cron poller ───────────────────────────────────────
  startPoller();

  console.log(`[Server] Ready — polling every 5 minutes`);
  console.log(`[Server] Logic: execute followers only when alpha triggers (lastTriggeredAt updated)`);

  process.on("SIGINT", () => {
    console.log("\n[Server] Shutting down...");
    server.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n[Server] SIGTERM received, shutting down...");
    server.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[Server] Fatal error:", err);
  process.exit(1);
});
