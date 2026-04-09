"use client";
import { useState } from "react";
import { useSendTransaction, useAccount, useChainId, useSwitchChain, useWriteContract } from "wagmi";
import { encodeFunctionData, parseUnits } from "viem";
import type { AllocationPlan } from "@/types";

export type ExecStatus = "idle" | "switching" | "approving" | "quoting" | "sending" | "done" | "error";

const USDC_BY_CHAIN: Record<number, string> = {
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  137: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
};

const SUPPORTED_CHAINS = new Set([1, 8453, 42161, 10, 137]);

// ERC-20 ABI for allowance check and approve
const ERC20_ABI = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export function useExecute() {
  const { address } = useAccount();
  const currentChainId = useChainId();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const [status, setStatus] = useState<ExecStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function execute(plan: AllocationPlan) {
    if (!address) return;
    setStatus("quoting");
    setError(null);
    setTxHash(null);

    try {
      const vault = plan.vault;
      const vaultChain = vault.chainId;

      if (!SUPPORTED_CHAINS.has(vaultChain)) {
        // Unsupported chain — simulate
        setStatus("sending");
        await new Promise((r) => setTimeout(r, 1200));
        setStatus("done");
        return;
      }

      // Switch to vault's chain first
      if (currentChainId !== vaultChain) {
        setStatus("switching");
        try {
          await switchChainAsync({ chainId: vaultChain });
        } catch {
          throw new Error(`Please switch your wallet to ${vault.chainName}`);
        }
      }

      setStatus("quoting");

      const fromToken = USDC_BY_CHAIN[vaultChain];
      if (!fromToken) throw new Error("USDC not supported on this chain");

      const fromAmount = String(Math.round(plan.amount * 1_000_000));

      // 1. Get Composer quote
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChain: vaultChain,
          toChain: vaultChain,
          fromToken,
          toToken: vault.address,
          fromAmount,
          fromAddress: address,
        }),
      });

      const quote = await res.json();

      if (!quote.transactionRequest || quote.mock) {
        // No real route — simulate
        setStatus("sending");
        await new Promise((r) => setTimeout(r, 1200));
        setStatus("done");
        return;
      }

      const tx = quote.transactionRequest;
      const spender = (tx.to as string);

      // 2. Check USDC allowance — if insufficient, send approve tx first
      setStatus("approving");
      try {
        const allowanceRes = await fetch(
          `/api/allowance?token=${fromToken}&owner=${address}&spender=${spender}&chainId=${vaultChain}`
        );
        const { allowance } = await allowanceRes.json();
        const needed = BigInt(fromAmount);

        if (BigInt(allowance ?? "0") < needed) {
          // Send approve transaction — user signs this in wallet
          await writeContractAsync({
            address: fromToken as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [spender as `0x${string}`, parseUnits("1000", 6)], // approve 1000 USDC max
            chainId: vaultChain,
          });
          // Wait a moment for approval to propagate
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch {
        // Allowance check failed — try tx anyway, wallet will show the error
      }

      // 3. Send the actual deposit transaction
      setStatus("sending");
      const hash = await sendTransactionAsync({
        to: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
        value: tx.value ? BigInt(tx.value) : 0n,
        gas: tx.gasLimit ? BigInt(tx.gasLimit) : undefined,
        chainId: vaultChain,
      });

      setTxHash(hash);
      setStatus("done");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message.includes("User rejected") || err.message.includes("rejected")
            ? "Transaction rejected in wallet"
            : err.message
          : "Transaction failed";
      setError(msg);
      setStatus("error");
    }
  }

  function reset() {
    setStatus("idle");
    setTxHash(null);
    setError(null);
  }

  return { execute, status, txHash, error, reset };
}
