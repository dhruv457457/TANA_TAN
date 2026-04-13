"use client";
import { useReadContract } from "wagmi";
import { erc20Abi, formatUnits } from "viem";

const USDC_BY_CHAIN: Record<number, `0x${string}`> = {
  8453: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  1: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  10: "0x0b2c639c533813f4aa9d7837c72789064b33b0cd",
  137: "0x3c499c542cef5e38b70834e69223902c5a6254e3",
};

const DECIMALS: Record<number, number> = {
  8453: 6,
  1: 6,
  42161: 6,
  10: 6,
  137: 6,
};

export function useUsdcBalance(address: string | null | undefined, chainId = 8453) {
  const usdcAddress = USDC_BY_CHAIN[chainId] ?? USDC_BY_CHAIN[8453];
  const decimals = DECIMALS[chainId] ?? 6;

  const { data, ...rest } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });

  const formatted =
    data != null
      ? `$${parseFloat(formatUnits(data as bigint, decimals)).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} USDC`
      : null;

  return { data, formatted, ...rest };
}
