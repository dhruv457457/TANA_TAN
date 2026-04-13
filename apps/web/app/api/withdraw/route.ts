import { NextRequest, NextResponse } from "next/server";
import { fetchVaultDetail, fetchComposerQuote } from "@/lib/lifi";
import { parseUnits } from "viem";

const LIFI_API_KEY = process.env.LIFI_API_KEY ?? "";
const TANA_RELAY_SECRET = process.env.TANA_RELAY_SECRET ?? "";

export async function POST(req: NextRequest) {
  console.log("[withdraw] Processing withdraw request");
  
  const text = await req.text();
  console.log("[withdraw] Raw body:", text);
  
  let body: {
    vaultAddress?: string;
    chainId?: number;
    amount?: string;
    userAddress?: string;
    toTokenAddress?: string;
  };
  
  try {
    body = JSON.parse(text);
    console.log("[withdraw] Parsed body:", JSON.stringify(body));
  } catch (err) {
    console.error("[withdraw] JSON parse error:", err);
    return NextResponse.json({ error: "Invalid JSON: " + text }, { status: 400 });
  }

  const { vaultAddress, chainId = 8453, amount, userAddress, toTokenAddress } = body;

  if (!vaultAddress || !amount || !userAddress) {
    return NextResponse.json(
      { error: "vaultAddress, amount, and userAddress are required" },
      { status: 400 }
    );
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(userAddress)) {
    return NextResponse.json({ error: "Invalid userAddress" }, { status: 400 });
  }

  // ── Get vault details from LI.FI Earn ──────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let vaultDetail: any = {};
  try {
    vaultDetail = await fetchVaultDetail(chainId, vaultAddress);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[withdraw] fetchVaultDetail failed:", msg);
    return NextResponse.json({ error: `Could not fetch vault details: ${msg}` }, { status: 502 });
  }

  // Vault share tokens (LP tokens) use 18 decimals by default — NOT 6 like stablecoins.
  // The underlying asset (e.g. USDC) uses 6 decimals, but the vault share token
  // (e.g. PT-apxUSD, morpho shares) virtually always uses 18 decimals.
  const vaultDecimals: number = vaultDetail.lpTokens?.[0]?.decimals ?? 18;

  // Convert share amount (decimal string) to smallest unit using parseUnits
  // (avoids floating-point precision loss that BigInt(Math.round(...)) causes at 18 decimals)
  let amountInSmallestUnit: string;
  try {
    const shareAmount = parseFloat(amount);
    if (isNaN(shareAmount) || shareAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    amountInSmallestUnit = parseUnits(amount, vaultDecimals).toString();
    console.log("[withdraw] Converted amount:", amount, "->", amountInSmallestUnit, "(decimals:", vaultDecimals, ")");
  } catch (err) {
    console.error("[withdraw] Amount conversion error:", err);
    return NextResponse.json({ error: "Invalid amount format" }, { status: 400 });
  }

  if (vaultDetail.isRedeemable !== true) {
    return NextResponse.json(
      { error: "Vault does not support withdrawals" },
      { status: 400 }
    );
  }

  // Get underlying asset address (for toToken)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vd = vaultDetail as any;
  const assetAddress = vd.underlyingTokens?.[0]?.address ?? vd.asset?.address ?? vd.tokenAddress;
  if (!assetAddress) {
    return NextResponse.json(
      { error: "Could not determine withdrawal token address" },
      { status: 502 }
    );
  }

  // ── Build LI.FI Composer quote ─────────────────────────────────────────────
  try {
    const quote = await fetchComposerQuote({
      fromChainId: chainId,
      toChainId: chainId,
      fromTokenAddress: vaultAddress,
      toTokenAddress: toTokenAddress ?? (assetAddress as string),
      fromAmount: amountInSmallestUnit,
      fromAddress: userAddress,
      toAddress: userAddress,
      integrator: "tana-tan",
      apiKey: LIFI_API_KEY,
    });

    if (quote.error || !quote.transactionRequest) {
      const errMsg = quote.error 
        ? (typeof quote.error === 'string' ? quote.error : "No available quotes") 
        : "No transaction request in quote";
      console.error("[withdraw] LI.FI quote failed:", errMsg);
      const protocolName = typeof vaultDetail.protocol === 'string' 
        ? vaultDetail.protocol 
        : vaultDetail.protocol?.name ?? 'the vault';
      return NextResponse.json({ 
        error: `LI.FI Composer unavailable: ${errMsg}`,
        vault: {
          name: vaultDetail.name,
          protocol: protocolName,
          isRedeemable: vaultDetail.isRedeemable,
        }
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      quote,
      vault: {
        name: vaultDetail.name,
        protocol: vaultDetail.protocol,
        isRedeemable: vaultDetail.isRedeemable,
        verifiedByLiFi: true,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Quote failed";
    console.error("[withdraw] fetchComposerQuote failed:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
