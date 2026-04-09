import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base, mainnet, arbitrum, optimism, polygon } from "viem/chains";

const CHAINS: Record<number, Parameters<typeof createPublicClient>[0]["chain"]> = {
  1: mainnet,
  8453: base,
  42161: arbitrum,
  10: optimism,
  137: polygon,
};

const ERC20_ABI = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") as `0x${string}`;
  const owner = searchParams.get("owner") as `0x${string}`;
  const spender = searchParams.get("spender") as `0x${string}`;
  const chainId = Number(searchParams.get("chainId"));

  const chain = CHAINS[chainId];
  if (!chain || !token || !owner || !spender) {
    return NextResponse.json({ allowance: "0" });
  }

  try {
    const client = createPublicClient({ chain, transport: http() });
    const allowance = await client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner, spender],
    });
    return NextResponse.json({ allowance: allowance.toString() });
  } catch {
    return NextResponse.json({ allowance: "0" });
  }
}
