"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { Navbar } from "@/components/Navbar";
import { useVaults } from "@/hooks/useVaults";
import { PortfolioDashboard } from "@/components/PortfolioDashboard";
import { ExecutionHistory } from "@/components/ExecutionHistory";
import { useTanaStore } from "@/store";

export default function DashboardPage() {
  const { address: connectedAddress } = useAccount();
  const walletAddress = useTanaStore((s) => s.walletAddress);
  const [inputAddr, setInputAddr] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const { data: vaults } = useVaults();

  // Auto-fill connected wallet
  useEffect(() => {
    const addr = connectedAddress ?? walletAddress;
    if (addr) {
      setAddress(addr);
      setInputAddr(addr);
    }
  }, [connectedAddress, walletAddress]);

  const handleLoad = () => {
    const trimmed = inputAddr.trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) setAddress(trimmed);
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#F5B731]/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#4CAF82]/5 blur-3xl" />
      </div>

      <Navbar />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black text-[#1A1A1A] tracking-tight mb-2 font-display">Portfolio Dashboard</h1>
          <p className="text-[#888888]">Your active positions across 20+ protocols via LI.FI Earn</p>
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
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            placeholder="Enter wallet address (0x…)"
            className="flex-1 bg-white border-2 border-[#1A1A1A] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] placeholder:text-[#888888] focus:outline-none focus:shadow-[4px_4px_0_#F5B731] shadow-[3px_3px_0_#1A1A1A] font-mono transition-shadow"
          />
          <button
            onClick={handleLoad}
            className="px-5 py-3 rounded-xl bg-[#F5B731] hover:bg-[#E5A720] text-[#1A1A1A] text-sm font-black border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] hover:shadow-[5px_5px_0_#1A1A1A] transition-shadow shrink-0"
          >
            Load
          </button>
          {address && (
            <button
              onClick={() => { setAddress(null); setTimeout(() => setAddress(address), 100); }}
              className="px-4 py-3 rounded-xl border-2 border-[#1A1A1A] hover:border-[#F5B731] text-[#888888] hover:text-[#1A1A1A] text-sm transition-colors shrink-0"
              title="Refresh positions"
            >
              ↻
            </button>
          )}
        </motion.div>

        {address && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-[#888888] mb-4 -mt-4"
          >
            LI.FI indexes positions every ~15 minutes. New deposits may take a moment to appear.
          </motion.p>
        )}

        {/* Portfolio */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <PortfolioDashboard address={address} />
        </motion.div>

        {/* Execution History */}
        {address && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <ExecutionHistory address={address} />
          </motion.div>
        )}

        {/* Top vaults */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-4 font-display">Top Vaults Right Now</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(vaults ?? []).slice(0, 6).map((vault, i) => (
              <motion.div
                key={vault.address}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.06 }}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-[#1A1A1A] bg-white shadow-[2px_2px_0_#1A1A1A] hover:shadow-[4px_4px_0_#1A1A1A] transition-shadow"
              >
                <div className="w-9 h-9 rounded-lg bg-[#F5B731] flex items-center justify-center text-[#1A1A1A] text-xs font-black border-2 border-[#1A1A1A] shrink-0">
                  {vault.protocol.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1A1A1A] truncate font-display">{vault.name}</p>
                  <p className="text-xs text-[#888888]">{vault.chainName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-[#4CAF82] tabular-nums font-display">
                    {(Math.min(vault.apy.total, 2.0) * 100).toFixed(2)}%
                  </p>
                  <p className="text-xs text-[#888888] tabular-nums">
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
