"use client";
import { motion } from "framer-motion";
import type { AllocationPlan } from "@/types";

interface RouteMapProps {
  allocations: AllocationPlan[];
  fromChain?: string;
  asset?: string;
}

const CHAIN_COLORS: Record<string, string> = {
  Ethereum: "from-blue-500 to-blue-700",
  Base: "from-blue-400 to-blue-600",
  Arbitrum: "from-sky-400 to-sky-600",
  Optimism: "from-rose-400 to-rose-600",
  Polygon: "from-purple-400 to-purple-600",
};

export function RouteMap({ allocations, fromChain = "Polygon", asset = "USDC" }: RouteMapProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6"
    >
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-5">
        Route Map — The Mullet Moment
      </p>

      <div className="flex flex-col gap-4">
        {/* Source */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${CHAIN_COLORS[fromChain] ?? "from-violet-500 to-indigo-600"} flex items-center justify-center text-white text-xs font-black shrink-0`}>
            {fromChain.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Your Wallet</p>
            <p className="text-xs text-white/40">{asset} on {fromChain}</p>
          </div>
        </div>

        {/* Routes */}
        {allocations.map((plan, i) => {
          const steps = plan.quote?.steps ?? [];
          const isCrossChain = plan.vault.chainId !== 137; // assume polygon source
          return (
            <motion.div
              key={plan.vault.address}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.15 }}
              className="ml-5 pl-5 border-l border-dashed border-white/10"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white/30 text-xs">
                  {(plan.percentage * 100).toFixed(0)}%
                </span>
                {isCrossChain && (
                  <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
                    Bridge via {steps[0]?.toolDetails?.name ?? "LI.FI"}
                  </span>
                )}
                <span className="text-white/30 text-xs">→</span>
                <span className={`w-6 h-6 rounded-lg bg-gradient-to-br ${CHAIN_COLORS[plan.vault.chainName] ?? "from-violet-500 to-indigo-600"} flex items-center justify-center text-white text-[10px] font-black`}>
                  {plan.vault.chainName.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-sm text-white font-medium">
                  {plan.vault.protocol} {asset} Vault
                </span>
              </div>
              <p className="text-xs text-white/30 ml-0">
                ${plan.amount.toLocaleString()} → {(plan.vault.apy.total * 100).toFixed(2)}% APY
              </p>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-white/30">
        <span>Powered by LI.FI Composer</span>
        <span>Atomic cross-chain execution</span>
      </div>
    </motion.div>
  );
}
