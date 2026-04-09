"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { useTanaStore } from "@/store";
import { useExecute } from "@/hooks/useExecute";
import type { AllocationPlan } from "@/types";

const RISK_COLORS = {
  Safe: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Balanced: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Degen: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

const RISK_DOT = {
  Safe: "bg-emerald-400",
  Balanced: "bg-amber-400",
  Degen: "bg-rose-400",
};

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

interface VaultCardProps {
  plan: AllocationPlan;
  index: number;
}

export function VaultCard({ plan, index }: VaultCardProps) {
  const { vault, percentage, amount } = plan;
  const label = vault.riskLabel ?? "Balanced";
  const apyPct = (Math.min(vault.apy.total, 2.0) * 100).toFixed(2);
  const tvlM = (vault.tvl.usd / 1_000_000).toFixed(1);
  const walletAddress = useTanaStore((s) => s.walletAddress);
  const { address } = useAccount();
  const isConnected = !!(walletAddress || address);
  const [showRoute, setShowRoute] = useState(false);

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
      className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 hover:border-white/20 transition-colors"
    >
      {/* Allocation badge */}
      <div className="absolute top-4 right-4 text-xs font-bold text-white/50 tabular-nums">
        {(percentage * 100).toFixed(0)}%
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0">
          {vault.protocol.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">{vault.name}</p>
          <p className="text-xs text-white/40 mt-0.5">{vault.chainName}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-xs text-white/40 mb-1">APY</p>
          <p className="text-lg font-black text-white tabular-nums">{apyPct}%</p>
        </div>
        <div>
          <p className="text-xs text-white/40 mb-1">TVL</p>
          <p className="text-lg font-black text-white tabular-nums">${tvlM}M</p>
        </div>
        <div>
          <p className="text-xs text-white/40 mb-1">Amount</p>
          <p className="text-lg font-black text-white tabular-nums">
            ${amount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* APY breakdown */}
      <div className="flex gap-3 mb-4 text-xs text-white/40">
        <span>Base: {(Math.min(vault.apy.base, 2.0) * 100).toFixed(2)}%</span>
        <span>Reward: {(Math.min(vault.apy.reward, 2.0) * 100).toFixed(2)}%</span>
      </div>

      {/* Risk label + lock */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${RISK_COLORS[label]}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[label]}`} />
          {label}
        </span>
        {vault.timeLock === 0 && (
          <span className="text-xs text-white/30">Instant withdrawal</span>
        )}
      </div>

      {/* Execute section */}
      <div className="mt-4">
        {!isConnected ? (
          <div className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-center text-sm text-white/40 select-none">
            Connect wallet to execute
          </div>
        ) : vault.isTransactional === false ? (
          <div className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-center text-sm text-white/30 select-none">
            Deposit not available via LI.FI
          </div>
        ) : isDone ? (
          <div className="space-y-2">
            <div className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-center text-sm text-emerald-400 font-semibold">
              ✓ Deposited!
            </div>
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-violet-400 hover:text-violet-300 text-center transition-colors"
              >
                View on {vault.chainName === "Base" ? "BaseScan" : "Explorer"} →
              </a>
            ) : txHash ? (
              <p className="text-xs text-white/30 text-center font-mono truncate">
                {txHash.slice(0, 12)}…{txHash.slice(-8)}
              </p>
            ) : null}
            <button
              onClick={() => setShowRoute((v) => !v)}
              className="w-full py-1.5 rounded-xl text-xs text-violet-400 hover:text-violet-300 border border-violet-500/20 hover:border-violet-500/40 transition-colors"
            >
              {showRoute ? "Hide" : "Show"} execution route →
            </button>
            <button onClick={reset} className="w-full py-1 text-xs text-white/30 hover:text-white/50 transition-colors">
              Execute again
            </button>
          </div>
        ) : isBusy ? (
          <button disabled className="w-full py-2.5 rounded-xl bg-violet-600/50 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {STATUS_LABEL[status]}
          </button>
        ) : (
          <div className="space-y-1">
            <button
              onClick={() => execute(plan)}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Execute via LI.FI
            </button>
            {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
          </div>
        )}
      </div>

      {/* Inline route map — shows after successful execution */}
      <AnimatePresence>
        {showRoute && isDone && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-white/10 overflow-hidden"
          >
            <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Execution Route</p>
            <div className="space-y-2">
              {/* Step 1: Wallet */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-violet-500/30 flex items-center justify-center text-violet-300 text-[10px] font-black shrink-0">W</div>
                <span className="text-xs text-white/60">Your Wallet (USDC)</span>
              </div>
              {/* Arrow */}
              <div className="ml-3 text-white/20 text-xs">↓ Approve + Deposit</div>
              {/* Step 2: LiFiDiamond */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/30 flex items-center justify-center text-indigo-300 text-[10px] font-black shrink-0">L</div>
                <span className="text-xs text-white/60">LiFiDiamond (Composer)</span>
              </div>
              {/* Arrow */}
              <div className="ml-3 text-white/20 text-xs">↓ Deposit to vault</div>
              {/* Step 3: Vault */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                  {vault.protocol.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="text-xs text-white/80 font-medium">{vault.name}</span>
                  <span className="text-xs text-emerald-400 ml-2">{apyPct}% APY</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-white/5 text-xs text-white/20 flex justify-between">
              <span>Powered by LI.FI Composer</span>
              <span>{vault.chainName}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
