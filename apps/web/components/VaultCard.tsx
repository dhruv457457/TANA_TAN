"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { useTanaStore } from "@/store";
import { useExecute } from "@/hooks/useExecute";
import { PostStrategyModal } from "@/components/PostStrategyModal";
import type { AllocationPlan } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  switching: "Switching chain…",
  quoting: "Getting quote…",
  approving: "Approving USDC…",
  sending: "Sending tx…",
  done: "Done!",
  error: "Failed — retry?",
};

const EXPLORER_BY_CHAIN: Record<number, string> = {
  1: "https://etherscan.io/tx/",
  8453: "https://basescan.org/tx/",
  42161: "https://arbiscan.io/tx/",
  10: "https://optimistic.etherscan.io/tx/",
  137: "https://polygonscan.com/tx/",
};

const RISK_STYLE = {
  Safe: "border-[#4CAF82] text-[#4CAF82]",
  Balanced: "border-[#F5B731] text-[#1A1A1A]",
  Degen: "border-[#F06292] text-[#F06292]",
};

const RISK_DOT = {
  Safe: "bg-[#4CAF82]",
  Balanced: "bg-[#F5B731]",
  Degen: "bg-[#F06292]",
};

export function VaultCard({ plan, index }: { plan: AllocationPlan; index: number }) {
  const { vault, percentage, amount } = plan;
  const label = vault.riskLabel ?? "Balanced";
  const apyPct = (Math.min(vault.apy.total, 2.0) * 100).toFixed(2);
  const tvlM = (vault.tvl.usd / 1_000_000).toFixed(1);
  const walletAddress = useTanaStore((s) => s.walletAddress);
  const { address } = useAccount();
  const isConnected = !!(walletAddress || address);
  const [showRoute, setShowRoute] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  const { execute, status, txHash, error, reset } = useExecute();
  const isIdle = status === "idle" || status === "error";
  const isDone = status === "done";
  const isBusy = !isIdle && !isDone;

  const explorerUrl = txHash
    ? `${EXPLORER_BY_CHAIN[vault.chainId] ?? "https://basescan.org/tx/"}${txHash}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ y: -2 }}
      className="relative rounded-xl border-2 border-[#1A1A1A] bg-white shadow-[3px_3px_0_#1A1A1A] p-5 hover:shadow-[5px_5px_0_#1A1A1A] transition-shadow"
    >
      {/* Allocation badge */}
      <div className="absolute top-4 right-4 text-xs font-black text-[#888888] tabular-nums font-display">
        {(percentage * 100).toFixed(0)}%
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {vault.protocolLogoUri ? (
          <img
            src={vault.protocolLogoUri}
            alt={vault.protocol}
            className="w-10 h-10 rounded-lg border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] object-contain bg-white shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-[#F5B731] flex items-center justify-center text-[#1A1A1A] font-black text-sm border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] shrink-0">
            {vault.protocol.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold text-[#1A1A1A] truncate font-display">{vault.name}</p>
          <p className="text-xs text-[#888888] mt-0.5">{vault.chainName}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="border-2 border-[#1A1A1A] rounded-lg bg-[#FAF6EE] p-2">
          <p className="text-[10px] text-[#888888] mb-0.5">APY</p>
          <p className="text-lg font-black text-[#4CAF82] tabular-nums font-display">{apyPct}%</p>
        </div>
        <div className="border-2 border-[#1A1A1A] rounded-lg bg-[#FAF6EE] p-2">
          <p className="text-[10px] text-[#888888] mb-0.5">TVL</p>
          <p className="text-lg font-black text-[#1A1A1A] tabular-nums font-display">${tvlM}M</p>
        </div>
        <div className="border-2 border-[#1A1A1A] rounded-lg bg-[#FAF6EE] p-2">
          <p className="text-[10px] text-[#888888] mb-0.5">Amount</p>
          <p className="text-lg font-black text-[#1A1A1A] tabular-nums font-display">
            ${amount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* APY breakdown */}
      <div className="flex gap-3 mb-4 text-xs text-[#888888]">
        <span>Base: {(Math.min(vault.apy.base, 2.0) * 100).toFixed(2)}%</span>
        <span>Reward: {(Math.min(vault.apy.reward, 2.0) * 100).toFixed(2)}%</span>
      </div>

      {/* Risk label + lock */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border-2 ${RISK_STYLE[label]}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[label]}`} />
          {label}
        </span>
        {vault.timeLock === 0 && (
          <span className="text-xs text-[#888888]">Instant withdrawal</span>
        )}
      </div>

      {/* Execute section */}
      <div>
        {!isConnected ? (
          <div className="w-full py-2.5 rounded-xl bg-[#FAF6EE] border-2 border-[#D0CFCF] text-center text-sm text-[#888888] select-none">
            Connect wallet to execute
          </div>
        ) : vault.isTransactional === false ? (
          <div className="w-full py-2.5 rounded-xl bg-[#FAF6EE] border-2 border-[#D0CFCF] text-center text-sm text-[#888888] select-none">
            Deposit not available via LI.FI
          </div>
        ) : isDone ? (
          <div className="space-y-2">
            {/* Success banner */}
            <div className="rounded-xl bg-[#E8F5E9] border-2 border-[#4CAF82] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#4CAF82] flex items-center justify-center shrink-0">
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="font-black text-[#4CAF82] text-sm">Deposited into {vault.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#4CAF82]/80">
                <span>${amount.toLocaleString()} USDC</span>
                <span>·</span>
                <span>{apyPct}% APY</span>
                <span>·</span>
                <span>{vault.chainName}</span>
              </div>
              {explorerUrl && (
                <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
                  className="block mt-2 text-[11px] text-[#2F7EE5] hover:underline font-mono">
                  View tx →
                </a>
              )}
            </div>
            {/* Route visualization */}
            <button
              onClick={() => setShowRoute((v) => !v)}
              className="w-full py-2 rounded-xl text-xs font-semibold text-[#2F7EE5] border-2 border-[#2F7EE5]/30 hover:border-[#2F7EE5] hover:bg-[#EFF6FF] transition-colors flex items-center justify-center gap-1"
            >
              <span>{showRoute ? "▲" : "▼"}</span>
              {showRoute ? "Hide" : "Show"} LI.FI execution route
            </button>
            {/* Share to feed */}
            <button
              onClick={() => setShowPostModal(true)}
              className="w-full py-2.5 rounded-xl bg-[#F5B731] hover:bg-[#E5A720] text-[#1A1A1A] text-sm font-black border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] transition-shadow"
            >
              Share this strategy to Feed →
            </button>
            <button onClick={reset} className="w-full py-1 text-xs text-[#AAAAAA] hover:text-[#888888] transition-colors">
              Deposit again
            </button>
          </div>
        ) : isBusy ? (
          <motion.button
            disabled
            className="w-full py-2.5 rounded-xl bg-[#F5B731]/50 text-[#1A1A1A] text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {STATUS_LABEL[status]}
          </motion.button>
        ) : (
          <div className="space-y-1">
            <motion.button
              onClick={() => execute(plan)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 rounded-xl bg-[#F5B731] hover:bg-[#E5A720] text-[#1A1A1A] text-sm font-black border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] hover:shadow-[5px_5px_0_#1A1A1A] transition-shadow cursor-pointer"
            >
              Execute via LI.FI
            </motion.button>
            {error && <p className="text-xs text-[#F06292] text-center">{error}</p>}
          </div>
        )}
      </div>

      {/* Inline route map */}
      <AnimatePresence>
        {showRoute && isDone && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t-2 border-[#D0CFCF] overflow-hidden"
          >
            <p className="text-xs text-[#888888] uppercase tracking-wider mb-3">Execution Route</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#F5B731] border border-[#1A1A1A] flex items-center justify-center text-[#1A1A1A] text-[10px] font-black shrink-0">W</div>
                <span className="text-xs text-[#1A1A1A]">Your Wallet (USDC)</span>
              </div>
              <div className="ml-3 text-[#888888] text-xs">↓ Approve + Deposit</div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#2F7EE5] border border-[#1A1A1A] flex items-center justify-center text-white text-[10px] font-black shrink-0">L</div>
                <span className="text-xs text-[#1A1A1A]">LI.FI Diamond (Composer)</span>
              </div>
              <div className="ml-3 text-[#888888] text-xs">↓ Deposit to vault</div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-xl bg-[#F5B731] border border-[#1A1A1A] flex items-center justify-center text-[#1A1A1A] text-[10px] font-black shrink-0">
                  {vault.protocol.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="text-xs text-[#1A1A1A] font-medium">{vault.name}</span>
                  <span className="text-xs text-[#4CAF82] ml-2">{apyPct}% APY</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-[#D0CFCF] text-xs text-[#888888] flex justify-between">
              <span>Powered by LI.FI Composer</span>
              <span>{vault.chainName}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showPostModal && (
        <PostStrategyModal
          plan={plan}
          onClose={() => setShowPostModal(false)}
          onPosted={() => setShowPostModal(false)}
        />
      )}
    </motion.div>
  );
}
