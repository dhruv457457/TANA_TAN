"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useCopyStrategy, type StrategyToCopy } from "@/hooks/useCopyStrategy";

const RISK_COLORS = {
  Safe: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Balanced: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Degen: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

const COPY_LABEL: Record<string, string> = {
  idle: "Copy Strategy",
  requesting: "Approve in MetaMask…",
  saving: "Saving…",
  done: "✓ Copied!",
  error: "Retry",
};

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  strategy: any;
  index: number;
  onPost?: () => void;
}

export function StrategyCard({ strategy, index }: Props) {
  const { address } = useAccount();
  const { copyStrategy, status, error, reset } = useCopyStrategy();
  const [amount, setAmount] = useState(100);
  const [showAmountInput, setShowAmountInput] = useState(false);

  const apyPct = ((strategy.apy ?? 0) * 100).toFixed(2);
  const tvlM = ((strategy.tvlUsd ?? 0) / 1_000_000).toFixed(1);
  const riskLabel = strategy.riskLabel ?? "Balanced";
  const isOwn = address?.toLowerCase() === strategy.author?.toLowerCase();
  const isDone = status === "done";

  function handleCopy() {
    if (status === "idle" || status === "error") {
      if (!showAmountInput) { setShowAmountInput(true); return; }
      reset();
      copyStrategy({
        _id: strategy._id,
        vaultAddress: strategy.vaultAddress,
        chainId: strategy.chainId,
        protocol: strategy.protocol,
        vaultName: strategy.vaultName ?? strategy.protocol,
        amount,
      } as StrategyToCopy);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 hover:border-white/20 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0">
            {strategy.protocol.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white text-sm">
              {strategy.vaultName || `${strategy.protocol} ${strategy.asset}`}
            </p>
            <p className="text-xs text-white/40">{strategy.chainName} · by {strategy.author.slice(0, 6)}…{strategy.author.slice(-4)}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${RISK_COLORS[riskLabel as keyof typeof RISK_COLORS] ?? RISK_COLORS.Balanced}`}>
          {riskLabel}
        </span>
      </div>

      {/* Pitch */}
      {strategy.pitch && (
        <p className="text-sm text-white/60 mb-3 leading-relaxed">{strategy.pitch}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        <div className="rounded-xl bg-white/5 py-2">
          <p className="text-xs text-white/40 mb-0.5">APY</p>
          <p className="text-sm font-black text-emerald-400">{apyPct}%</p>
        </div>
        <div className="rounded-xl bg-white/5 py-2">
          <p className="text-xs text-white/40 mb-0.5">TVL</p>
          <p className="text-sm font-black text-white">${tvlM}M</p>
        </div>
        <div className="rounded-xl bg-white/5 py-2">
          <p className="text-xs text-white/40 mb-0.5">Followers</p>
          <p className="text-sm font-black text-violet-400">{strategy.followerCount ?? 0}</p>
        </div>
      </div>

      {/* Amount input (shown after first click) */}
      {showAmountInput && !isDone && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-white/40">Amount:</span>
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/40">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(0.01, Number(e.target.value)))}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-6 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
              min={0.01}
              step={0.01}
            />
          </div>
          <span className="text-xs text-white/40">USDC</span>
        </div>
      )}

      {/* Copy button */}
      {!isOwn && (
        <div className="space-y-1">
          {isDone ? (
            <div className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-center text-sm text-emerald-400 font-semibold">
              ✓ Strategy Copied — auto-executing with delegated permissions
            </div>
          ) : (
            <button
              onClick={handleCopy}
              disabled={status === "requesting" || status === "saving"}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {COPY_LABEL[status]}
            </button>
          )}
          {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
          {showAmountInput && !isDone && (
            <p className="text-xs text-white/30 text-center">
              Backend pays your gas · Requires MetaMask v13.23+
            </p>
          )}
        </div>
      )}

      {isOwn && (
        <div className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-white/30 select-none">
          Your strategy
        </div>
      )}
    </motion.div>
  );
}
