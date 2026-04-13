"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useCopyStrategy, type StrategyToCopy } from "@/hooks/useCopyStrategy";
import { useMyDelegations } from "@/hooks/useMyDelegations";
import { useRevokeDelegation } from "@/hooks/useRevokeDelegation";
import { LiFiBadge } from "./LiFiBadge";

const RISK_STYLE = {
  Safe: "border-[#4CAF82] text-[#4CAF82]",
  Balanced: "border-[#F5B731] text-[#1A1A1A]",
  Degen: "border-[#F06292] text-[#F06292]",
};

const COPY_LABEL: Record<string, string> = {
  idle: "Copy Strategy",
  requesting: "Approve in MetaMask…",
  saving: "Saving…",
  done: "✓ Copied!",
  error: "Retry Copy",
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface Props {
  strategy: {
    _id: string;
    vaultAddress: string;
    chainId: number;
    protocol: string;
    vaultName: string;
    chainName: string;
    asset: string;
    apy: number;
    tvlUsd: number;
    riskLabel: string;
    pitch: string;
    author: string;
    followerCount: number;
  };
  index: number;
  onAuthorClick?: (author: string) => void;
}

export function StrategyCard({ strategy, index, onAuthorClick }: Props) {
  const { address } = useAccount();
  const { copyStrategy, status: copyStatus, error: copyError, reset: copyReset } = useCopyStrategy();
  const { data: myDelegations } = useMyDelegations(address);
  const { revoke, status: revokeStatus } = useRevokeDelegation();

  const [amount, setAmount] = useState(100);
  const [showAmountInput, setShowAmountInput] = useState(false);

  const apyPct = ((strategy.apy ?? 0) * 100).toFixed(2);
  const tvlM = ((strategy.tvlUsd ?? 0) / 1_000_000).toFixed(1);
  const riskLabel = strategy.riskLabel ?? "Balanced";
  const isOwn = address?.toLowerCase() === strategy.author?.toLowerCase();

  // Check if this user is already copying this strategy
  const myDelegation = myDelegations?.find(
    (d) => d.strategyId?._id === strategy._id
  );
  const isCopying = !!myDelegation && myDelegation.isActive;

  const isDone = copyStatus === "done";
  const isBusy =
    copyStatus === "requesting" ||
    copyStatus === "saving" ||
    revokeStatus === "revoking";

  function handleFirstClick() {
    if (!showAmountInput) {
      setShowAmountInput(true);
      return;
    }
    copyReset();
    copyStrategy({
      _id: strategy._id,
      vaultAddress: strategy.vaultAddress,
      chainId: strategy.chainId,
      protocol: strategy.protocol,
      vaultName: strategy.vaultName ?? strategy.protocol,
      amount,
    } as StrategyToCopy);
  }

  function handleUnfollow() {
    if (!myDelegation) return;
    revoke(myDelegation._id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2 }}
      className="rounded-xl border-2 border-[#1A1A1A] bg-white shadow-[3px_3px_0_#1A1A1A]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#F5B731] flex items-center justify-center text-[#1A1A1A] font-black text-sm border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A]">
            {strategy.protocol.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-[#1A1A1A] text-sm font-display">
              {strategy.vaultName || `${strategy.protocol} ${strategy.asset}`}
            </p>
            <p className="text-xs text-[#888888]">
              {strategy.chainName} · by{" "}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAuthorClick?.(strategy.author);
                }}
                className="text-[#2F7EE5] hover:underline font-mono"
              >
                {strategy.author.slice(0, 6)}…{strategy.author.slice(-4)}
              </button>
            </p>
          </div>
        </div>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-lg border-2 ${RISK_STYLE[riskLabel as keyof typeof RISK_STYLE] ?? RISK_STYLE.Balanced}`}
        >
          {riskLabel}
        </span>
      </div>

      {/* Pitch */}
      {strategy.pitch && (
        <p className="px-4 pb-3 text-sm text-[#888888] leading-relaxed">
          {strategy.pitch}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        <div className="rounded-lg border-2 border-[#1A1A1A] bg-[#FAF6EE] p-2 text-center">
          <p className="text-[10px] text-[#888888] mb-0.5">APY</p>
          <p className="text-sm font-black text-[#4CAF82] font-display">{apyPct}%</p>
        </div>
        <div className="rounded-lg border-2 border-[#1A1A1A] bg-[#FAF6EE] p-2 text-center">
          <p className="text-[10px] text-[#888888] mb-0.5">TVL</p>
          <p className="text-sm font-black text-[#1A1A1A] font-display">${tvlM}M</p>
        </div>
        <div className="rounded-lg border-2 border-[#1A1A1A] bg-[#FAF6EE] p-2 text-center">
          <p className="text-[10px] text-[#888888] mb-0.5">Followers</p>
          <p className="text-sm font-black text-[#F5B731] font-display">
            {strategy.followerCount ?? 0}
          </p>
        </div>
      </div>

      {/* ── NOT COPYING: Show LI.FI Earn data + Copy button ─────────────── */}
      {!isCopying && !isOwn && (
        <div className="px-4 pb-4 space-y-3">
          {/* LI.FI Earn Data Panel */}
          <LiFiBadge
            chainId={strategy.chainId}
            vaultAddress={strategy.vaultAddress}
            strategyApy={strategy.apy}
            strategyTvl={strategy.tvlUsd}
          />

          {/* Amount input */}
          {showAmountInput && !isDone && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#888888] shrink-0">Amount:</span>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#888888]">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0.01, Number(e.target.value)))}
                  className="w-full bg-[#FAF6EE] border-2 border-[#1A1A1A] rounded-lg pl-6 pr-3 py-1.5 text-sm text-[#1A1A1A] focus:outline-none focus:shadow-[3px_3px_0_#F5B731]"
                  min={0.01}
                  step={0.01}
                  placeholder="Enter amount"
                />
              </div>
              <span className="text-xs text-[#888888] shrink-0">USDC</span>
            </div>
          )}

          {/* Copy button */}
          <motion.button
            onClick={handleFirstClick}
            disabled={isBusy}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-lg bg-[#F5B731] hover:bg-[#E5A720] text-[#1A1A1A] font-black text-sm border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] hover:shadow-[5px_5px_0_#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
          >
            {COPY_LABEL[copyStatus]}
          </motion.button>

          {copyError && (
            <p className="text-xs text-[#F06292] text-center">{copyError}</p>
          )}

          {showAmountInput && !isDone && (
            <p className="text-[10px] text-[#888888] text-center">
              Backend pays gas · Requires MetaMask Flask
            </p>
          )}
        </div>
      )}

      {/* ── IS COPYING: Show status badge + Unfollow ───────────────────────── */}
      {isCopying && (
        <div className="px-4 pb-4 space-y-3">
          {/* Active copy badge */}
          <div className="rounded-lg bg-[#4CAF82] text-white p-3 border-2 border-[#1A1A1A]">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-white flex items-center justify-center">
                <span className="text-[#4CAF82] text-[8px] font-black">✓</span>
              </span>
              <span className="font-black text-sm font-display">Actively Copying</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-[#4CAF82]/80 rounded p-1.5 text-center">
                <p className="text-white/70 text-[9px]">Amount</p>
                <p className="font-bold">${myDelegation?.amount ?? 0}</p>
              </div>
              <div className="bg-[#4CAF82]/80 rounded p-1.5 text-center">
                <p className="text-white/70 text-[9px]">Runs</p>
                <p className="font-bold">{myDelegation?.executionCount ?? 0}</p>
              </div>
              <div className="bg-[#4CAF82]/80 rounded p-1.5 text-center">
                <p className="text-white/70 text-[9px]">Last</p>
                <p className="font-bold text-[10px]">
                  {timeAgo(myDelegation?.lastExecutedAt ?? null)}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-white/70 mt-2 text-center">
              Auto-executing on every alpha move
            </p>
          </div>

          {/* Unfollow button */}
          <motion.button
            onClick={handleUnfollow}
            disabled={revokeStatus === "revoking"}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-2.5 rounded-lg bg-[#F06292] hover:bg-[#E05080] text-white font-black text-sm border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
          >
            {revokeStatus === "revoking" ? "Stopping…" : "Stop Copying"}
          </motion.button>
        </div>
      )}

      {/* ── OWN STRATEGY ─────────────────────────────────────────────────── */}
      {isOwn && (
        <div className="px-4 pb-4">
          <div className="w-full py-2.5 rounded-lg bg-[#FAF6EE] border-2 border-[#D0CFCF] text-center text-xs text-[#888888]">
            Your strategy
          </div>
        </div>
      )}
    </motion.div>
  );
}
