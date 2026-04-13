"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import type { AllocationPlan } from "@/types";

interface Props {
  plan?: AllocationPlan;
  onClose: () => void;
  onPosted: () => void;
}

export function PostStrategyModal({ plan, onClose, onPosted }: Props) {
  const { address } = useAccount();
  const [pitch, setPitch] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vault = plan?.vault;

  async function handlePost() {
    if (!address || !vault) return;
    setIsPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: address,
          vaultAddress: vault.address,
          chainId: vault.chainId,
          protocol: vault.protocol,
          chainName: vault.chainName,
          vaultName: vault.name,
          asset: vault.asset,
          apy: vault.apy.total,
          tvlUsd: vault.tvl.usd,
          riskLabel: vault.riskLabel ?? "Balanced",
          pitch,
        }),
      });
      if (!res.ok) throw new Error("Failed to post");
      onPosted();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error posting strategy");
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md rounded-xl border-2 border-[#1A1A1A] bg-white p-6 shadow-[5px_5px_0_#1A1A1A]"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-black text-[#1A1A1A] text-lg mb-1 font-display">Post Strategy</h3>
          <p className="text-xs text-[#888888] mb-4">Share your yield position to the TANA-TAN feed</p>

          {/* Vault preview */}
          {vault && (
            <div className="rounded-xl border-2 border-[#1A1A1A] bg-[#FAF6EE] p-3 mb-4 flex items-center gap-3 shadow-[2px_2px_0_#1A1A1A]">
              <div className="w-9 h-9 rounded-lg bg-[#F5B731] border-2 border-[#1A1A1A] flex items-center justify-center text-[#1A1A1A] font-black text-xs shrink-0">
                {vault.protocol.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1A1A1A] truncate font-display">{vault.name}</p>
                <p className="text-xs text-[#888888]">{vault.chainName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-[#4CAF82] font-display">{(vault.apy.total * 100).toFixed(2)}%</p>
                <p className="text-xs text-[#888888]">APY</p>
              </div>
            </div>
          )}

          {/* Pitch */}
          <textarea
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder="Why is this a good strategy? (optional)"
            rows={3}
            maxLength={280}
            className="w-full bg-[#FAF6EE] border-2 border-[#1A1A1A] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] placeholder:text-[#888888] focus:outline-none focus:shadow-[4px_4px_0_#F5B731] resize-none mb-4 transition-shadow"
          />

          {error && <p className="text-xs text-[#F06292] mb-3">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border-2 border-[#1A1A1A] text-sm text-[#888888] hover:text-[#1A1A1A] hover:border-[#F5B731] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePost}
              disabled={isPosting || !address || !vault}
              className="flex-1 py-2.5 rounded-xl bg-[#F5B731] hover:bg-[#E5A720] disabled:opacity-40 disabled:cursor-not-allowed text-[#1A1A1A] text-sm font-black border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] hover:shadow-[4px_4px_0_#1A1A1A] transition-shadow"
            >
              {isPosting ? "Posting…" : "Post to Feed"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
