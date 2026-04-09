"use client";
import { motion } from "framer-motion";
import { usePortfolio } from "@/hooks/usePortfolio";
import type { PortfolioPosition } from "@/types";

interface Props {
  address?: string | null;
}

function PositionRow({ pos, index }: { pos: PortfolioPosition; index: number }) {
  const apyPct = (pos.apy * 100).toFixed(2);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
    >
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
        {pos.protocol.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{pos.name}</p>
        <p className="text-xs text-white/40">{pos.asset}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-emerald-400 tabular-nums">{apyPct}%</p>
        <p className="text-xs text-white/40 tabular-nums">
          ${pos.balanceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </p>
      </div>
    </motion.div>
  );
}

export function PortfolioDashboard({ address }: Props) {
  const { data: positions, isLoading, error } = usePortfolio(address);

  if (!address) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/40 text-sm">
        Connect your wallet to view positions
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !positions || positions.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-white/40 text-xs space-y-1">
        <p>No positions found</p>
        <p className="text-white/20">Positions index every ~15 min</p>
      </div>
    );
  }

  const totalUsd = positions.reduce((s, p) => s + p.balanceUsd, 0);
  const weightedApy =
    positions.reduce((s, p) => s + p.apy * p.balanceUsd, 0) / totalUsd;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-white">Portfolio</h3>
        <div className="text-right">
          <p className="text-sm font-bold text-white tabular-nums">
            ${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-emerald-400 tabular-nums">
            Avg {(weightedApy * 100).toFixed(2)}% APY
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {positions.map((pos, i) => (
          <PositionRow key={`${pos.vaultAddress}-${i}`} pos={pos} index={i} />
        ))}
      </div>
    </div>
  );
}
