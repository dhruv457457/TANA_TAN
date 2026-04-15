"use client";
import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";
import { createWalletClient, custom, parseUnits } from "viem";
import { base } from "viem/chains";

const USDC_BY_CHAIN: Record<number, `0x${string}`> = {
  8453: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
};

// TanaAutoDeposit helper: receives delegated USDC and deposits into the vault,
// minting shares back to the follower. This is the transfer() recipient.
const TANA_AUTO_DEPOSIT = (process.env.NEXT_PUBLIC_TANA_AUTO_DEPOSIT ?? "") as `0x${string}`;

export type CopyStatus =
  | "idle"
  | "requesting"   // MetaMask permission dialog (ERC-7715)
  | "saving"       // POST to /api/delegations
  | "done"
  | "error";

export interface StrategyToCopy {
  _id: string;
  vaultAddress: string;
  chainId: number;
  protocol: string;
  vaultName: string;
  amount?: number; // USDC amount follower wants to allocate
}

export function useCopyStrategy() {
  const { address } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();
  const [status, setStatus] = useState<CopyStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function copyStrategy(strategy: StrategyToCopy) {
    if (!address || !wagmiWalletClient) {
      setError("Connect your wallet first");
      return;
    }

    setStatus("requesting");
    setError(null);

    try {
      const chainId = strategy.chainId;
      const usdcAddress = USDC_BY_CHAIN[chainId];

      if (!usdcAddress) {
        throw new Error(`Chain ${chainId} not supported`);
      }
      if (!TANA_AUTO_DEPOSIT) {
        throw new Error("NEXT_PUBLIC_TANA_AUTO_DEPOSIT not configured");
      }

      // Build ERC-7715 wallet client (Advanced Permissions — production MetaMask)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ethereum = (window as any).ethereum;
      if (!ethereum) throw new Error("MetaMask not found");

      const walletClient = createWalletClient({
        account: address,
        chain: base,
        transport: custom(ethereum),
      }).extend(erc7715ProviderActions());

      const amount = strategy.amount ?? 100;
      const expiry = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days

      // Request ERC-7715 permission:
      // Grant backend the right to call USDC.transfer(TanaAutoDeposit, amount).
      // TanaAutoDeposit then calls vault.deposit(amount, follower) atomically,
      // so the follower receives vault shares — not just a raw USDC transfer.
      // The ERC20PeriodTransferEnforcer enforces the transfer() selector & amount limit.
      const grantedPermissions = await walletClient.requestExecutionPermissions([
        {
          chainId,
          expiry,
          // v1.0.0: use `to` instead of `signer`
          to: process.env.NEXT_PUBLIC_BACKEND_RELAYER_ADDRESS as `0x${string}`,
          permission: {
            type: "erc20-token-periodic",
            data: {
              tokenAddress: usdcAddress,
              // Periodic: allow up to (amount * 2) USDC per 30-day period
              periodAmount: parseUnits((amount * 2).toFixed(6), 6),
              periodDuration: 30 * 24 * 60 * 60,
              justification: `TANA-TAN: auto-copy ${strategy.protocol} strategy — funds go to TanaAutoDeposit which deposits into vault`,
            },
            // v1.0.0: isAdjustmentAllowed moved inside permission
            isAdjustmentAllowed: true,
          },
        },
      ]);

      if (!grantedPermissions || grantedPermissions.length === 0) {
        throw new Error("Permission not granted");
      }

      const granted = grantedPermissions[0];
      // v1.0.0: context and delegationManager are top-level (signerMeta removed)
      const permissionContext = granted.context;
      const delegationManager = granted.delegationManager;

      if (!permissionContext || !delegationManager) {
        throw new Error("Invalid permission response from MetaMask");
      }

      // Save delegation to MongoDB
      setStatus("saving");
      const res = await fetch("/api/delegations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followerAddress: address,
          strategyId: strategy._id,
          permissionContext,
          delegationManager,
          expiry,
          chainId,
          amount,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save delegation");
      }

      setStatus("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setStatus("error");
    }
  }

  function reset() {
    setStatus("idle");
    setError(null);
  }

  return { copyStrategy, status, error, reset };
}
