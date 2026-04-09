"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import type { AllocationPlan } from "@/types";

interface Props {
  plan?: AllocationPlan;            // pre-fill from a TANA recommendation
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
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-950 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-black text-white text-lg mb-1">Post Strategy</h3>
          <p className="text-xs text-white/40 mb-4">Share your yield position to the TANA-TAN feed</p>

          {/* Vault preview */}
          {vault && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 mb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0">
                {vault.protocol.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{vault.name}</p>
                <p className="text-xs text-white/40">{vault.chainName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-emerald-400">{(vault.apy.total * 100).toFixed(2)}%</p>
                <p className="text-xs text-white/30">APY</p>
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
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 resize-none mb-4"
          />

          {error && <p className="text-xs text-rose-400 mb-3">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePost}
              disabled={isPosting || !address || !vault}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {isPosting ? "Posting…" : "Post to Feed"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
