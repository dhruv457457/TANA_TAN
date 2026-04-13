"use client";
import { useState } from "react";
import { useSendTransaction, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { encodeFunctionData, erc20Abi, maxUint256 } from "viem";
import { useQueryClient } from "@tanstack/react-query";

export type WithdrawStatus =
  | "idle"
  | "quoting"
  | "approving"
  | "sending"
  | "done"
  | "error";

export function useWithdraw() {
  const [status, setStatus] = useState<WithdrawStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Record<string, unknown> | null>(null);
  const queryClient = useQueryClient();
  const publicClient = usePublicClient();

  const { sendTransactionAsync } = useSendTransaction();
  const { data: approvalReceipt, isLoading: waitingApproval } = useWaitForTransactionReceipt();
  void waitingApproval; void approvalReceipt;

  async function withdraw(params: {
    vaultAddress: string;
    chainId: number;
    amount: string; // decimal string, e.g. "0.05" (in human-readable units)
    userAddress: string;
    toTokenAddress?: string;
  }) {
    setStatus("quoting");
    setError(null);

    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tana-secret": process.env.NEXT_PUBLIC_TANA_RELAY_SECRET ?? "lol-lolo",
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Withdraw quote failed");
      }

      const data = await res.json();
      setQuote(data.quote);

      if (!data.quote?.transactionRequest) {
        throw new Error("No transaction request in quote");
      }

      const txReq = data.quote.transactionRequest as {
        to: `0x${string}`;
        data: `0x${string}`;
        value?: string;
      };

      // ── Step 1: ERC-20 approval ──────────────────────────────────────────
      // LiFi Diamond needs to pull the vault tokens from the user's wallet.
      // The quote's estimate.approvalAddress is the spender (LiFi Diamond).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const approvalAddress = (data.quote as any)?.estimate?.approvalAddress as `0x${string}` | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fromAmount = (data.quote as any)?.action?.fromAmount as string | undefined;

      if (approvalAddress && approvalAddress !== "0x0000000000000000000000000000000000000000" && publicClient) {
        // Check current allowance to avoid unnecessary approval txs
        const allowance = await publicClient.readContract({
          address: params.vaultAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: "allowance",
          args: [params.userAddress as `0x${string}`, approvalAddress],
        });

        const needed = fromAmount ? BigInt(fromAmount) : maxUint256;

        if (allowance < needed) {
          setStatus("approving");
          const approveData = encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [approvalAddress, maxUint256],
          });
          const approvalHash = await sendTransactionAsync({
            to: params.vaultAddress as `0x${string}`,
            data: approveData,
          });
          // Wait for approval to land on-chain before proceeding
          await publicClient.waitForTransactionReceipt({ hash: approvalHash });
        }
      }

      // ── Step 2: Withdrawal transaction ──────────────────────────────────
      setStatus("sending");
      const txHash = await sendTransactionAsync({
        to: txReq.to,
        data: txReq.data,
        value: txReq.value ? BigInt(txReq.value) : 0n,
      });

      setStatus("done");
      queryClient.invalidateQueries({ queryKey: ["portfolio", params.userAddress] });
      return txHash;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setStatus("error");
    }
  }

  function reset() {
    setStatus("idle");
    setError(null);
    setQuote(null);
  }

  return { withdraw, status, error, quote, reset };
}
