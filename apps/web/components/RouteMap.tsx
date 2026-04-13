"use client";
import { motion } from "framer-motion";
import type { AllocationPlan } from "@/types";

const EXPLORER_BY_CHAIN: Record<number, string> = {
  8453: "https://basescan.org/tx/",
  1: "https://etherscan.io/tx/",
  42161: "https://arbiscan.io/tx/",
  10: "https://optimistic.etherscan.io/tx/",
};

export function RouteMap({
  allocations,
  asset,
}: {
  allocations: AllocationPlan[];
  asset: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border-2 border-[#1A1A1A] bg-white shadow-[3px_3px_0_#1A1A1A] p-4 max-w-md"
    >
      <p className="text-xs text-[#888888] uppercase tracking-wider mb-3">Execution Route</p>
      <div className="space-y-1">
        {/* Wallet */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#F5B731] border border-[#1A1A1A] flex items-center justify-center text-[#1A1A1A] text-[10px] font-black shrink-0">W</div>
          <span className="text-xs text-[#1A1A1A] font-medium">Your Wallet</span>
          <span className="text-xs text-[#888888] ml-auto">{asset}</span>
        </div>
        {allocations.map((plan) => {
          return (
            <div key={plan.vault.address}>
              {/* Arrow */}
              <div className="flex items-center gap-2 ml-3">
                <div className="w-px h-4 border-l-2 border-[#D0CFCF] border-dashed" />
                <div className="w-3 h-3 border-2 border-[#2F7EE5] rotate-45 -ml-1.5 -mr-0.5 shrink-0" />
                <span className="text-[10px] text-[#888888]">
                  {plan.percentage >= 0.5 ? "Main deposit" : `$${plan.amount} (${(plan.percentage * 100).toFixed(0)}%)`}
                </span>
              </div>
              {/* LI.FI */}
              <div className="flex items-center gap-2 ml-3">
                <div className="w-6 h-6 rounded-lg bg-[#2F7EE5] border border-[#1A1A1A] flex items-center justify-center text-white text-[10px] font-black shrink-0">L</div>
                <span className="text-xs text-[#1A1A1A]">LI.FI Diamond</span>
                <span className="text-[10px] text-[#888888] ml-auto">{plan.vault.chainName}</span>
              </div>
              {/* Vault */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#F5B731] border border-[#1A1A1A] flex items-center justify-center text-[#1A1A1A] text-[10px] font-black shrink-0">
                  {plan.vault.protocol.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-[#1A1A1A] font-medium truncate">{plan.vault.name}</span>
                </div>
                <span className="text-[10px] text-[#4CAF82] ml-auto font-bold">
                  {(plan.vault.apy.total * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-2 border-t border-[#D0CFCF] flex justify-between">
        <span className="text-[10px] text-[#888888]">LI.FI Composer</span>
        <span className="text-[10px] text-[#2F7EE5]">Multi-hop secured</span>
      </div>
    </motion.div>
  );
}
