"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useVaults } from "@/hooks/useVaults";
import { PortfolioDashboard } from "@/components/PortfolioDashboard";
import type { PortfolioPosition } from "@/types";

export default function DashboardPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [inputAddr, setInputAddr] = useState("");
  const { data: vaults } = useVaults();

  const handleConnect = () => {
    const trimmed = inputAddr.trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
      setAddress(trimmed);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-violet-800/10 blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-black text-xs">TT</span>
          </div>
          <div>
            <span className="font-black text-white tracking-tight">TANA</span>
            <span className="font-black text-violet-400 tracking-tight">-TAN</span>
          </div>
        </div>
        <Link
          href="/"
          className="text-sm text-white/50 hover:text-white/90 transition-colors"
        >
          ← Back to Chat
        </Link>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            Portfolio Dashboard
          </h1>
          <p className="text-white/40">
            View your active positions across 20+ protocols
          </p>
        </motion.div>

        {/* Address input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex gap-3"
        >
          <input
            value={inputAddr}
            onChange={(e) => setInputAddr(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            placeholder="Enter wallet address (0x…)"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
          <button
            onClick={handleConnect}
            className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors shrink-0"
          >
            Load Portfolio
          </button>
        </motion.div>

        {/* Portfolio */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <PortfolioDashboard address={address} />
        </motion.div>

        {/* Top vaults */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-bold text-white mb-4">Top Vaults Right Now</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(vaults ?? []).slice(0, 6).map((vault, i) => (
              <motion.div
                key={vault.address}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.03]"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                  {vault.protocol.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {vault.name}
                  </p>
                  <p className="text-xs text-white/40">{vault.chainName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-emerald-400 tabular-nums">
                    {(vault.apy.total * 100).toFixed(2)}%
                  </p>
                  <p className="text-xs text-white/30 tabular-nums">
                    ${(vault.tvl.usd / 1_000_000).toFixed(1)}M TVL
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
