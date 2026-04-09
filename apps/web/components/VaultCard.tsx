"use client";
import { motion } from "framer-motion";
import { useTanaStore } from "@/store";
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

interface VaultCardProps {
  plan: AllocationPlan;
  index: number;
  onExecute?: () => void;
}

export function VaultCard({ plan, index, onExecute }: VaultCardProps) {
  const { vault, percentage, amount } = plan;
  const label = vault.riskLabel ?? "Balanced";
  const apyPct = (vault.apy.total * 100).toFixed(2);
  const tvlM = (vault.tvl.usd / 1_000_000).toFixed(1);
  const walletAddress = useTanaStore((s) => s.walletAddress);
  const isConnected = !!walletAddress;

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
        <span>Base: {(vault.apy.base * 100).toFixed(2)}%</span>
        <span>Reward: {(vault.apy.reward * 100).toFixed(2)}%</span>
      </div>

      {/* Risk label + lock */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${RISK_COLORS[label]}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[label]}`} />
          {label}
        </span>
        {vault.timeLock === 0 && (
          <span className="text-xs text-white/30">Instant withdrawal</span>
        )}
      </div>

      {onExecute && (
        <div className="mt-4">
          {isConnected ? (
            <button
              onClick={onExecute}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Execute via LI.FI
            </button>
          ) : (
            <div className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-center text-sm text-white/40 select-none">
              Connect wallet to execute
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
