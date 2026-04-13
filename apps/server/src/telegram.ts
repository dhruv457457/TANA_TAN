const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";

export interface TelegramAlertParams {
  follower: string;
  vaultName: string;
  protocol: string;
  amount: number;
  apy: number;
  txHash: string;
  sweepHash: string;
  chainName: string;
  status: "success" | "failed";
  error?: string;
}

export async function sendTelegramAlert(
  params: TelegramAlertParams
): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("[Telegram] BOT_TOKEN or CHAT_ID not configured — skipping alert");
    return;
  }

  const { follower, vaultName, protocol, amount, apy, sweepHash, chainName, status, error } =
    params;

  const statusEmoji = status === "success" ? "✅" : "❌";
  const followerShort = follower ? `${follower.slice(0, 6)}…${follower.slice(-4)}` : "unknown";

  const text = `${statusEmoji} *Copy-Trade ${status === "success" ? "Executed" : "Failed"}*

*Strategy:* ${vaultName}
*Protocol:* ${protocol}
*Amount:* $${amount} USDC
*APY:* ${(apy * 100).toFixed(2)}%
*Chain:* ${chainName}
*TX:* \`${sweepHash || "N/A"}\`
${error ? `*Error:* ${error}` : ""}
_${followerShort}_`;

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "Markdown" }),
    });
    console.log(`[Telegram] Alert sent for ${follower.slice(0, 8)}...`);
  } catch (err) {
    console.error("[Telegram] Failed to send alert:", err);
  }
}
