"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import Link from "next/link";
import { StrategyCard } from "@/components/StrategyCard";
import { ConnectButton } from "@/components/ConnectButton";

type SortMode = "followers" | "apy" | "new";

export default function FeedPage() {
  const { address } = useAccount();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [strategies, setStrategies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("followers");
  const [chainFilter, setChainFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ sort });
      if (chainFilter !== "all") params.set("chainId", chainFilter);
      const res = await fetch(`/api/leaderboard?${params}`);
      if (res.ok) setStrategies(await res.json());
    } finally {
      setIsLoading(false);
    }
  }, [sort, chainFilter]);

  useEffect(() => { load(); }, [load]);

  const CHAINS = [
    { id: "all", label: "All Chains" },
    { id: "8453", label: "Base" },
    { id: "42161", label: "Arbitrum" },
    { id: "1", label: "Ethereum" },
  ];

  const SORTS: { id: SortMode; label: string }[] = [
    { id: "followers", label: "Most Copied" },
    { id: "apy", label: "Highest APY" },
    { id: "new", label: "Newest" },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-black text-xs">TT</span>
            </div>
            <div>
              <span className="font-black text-white tracking-tight">TANA</span>
              <span className="font-black text-violet-400 tracking-tight">-TAN</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-1 text-sm">
            <Link href="/" className="px-3 py-1.5 text-white/50 hover:text-white/90 transition-colors">AI Chat</Link>
            <Link href="/feed" className="px-3 py-1.5 text-white rounded-lg bg-white/5">Feed</Link>
            <Link href="/dashboard" className="px-3 py-1.5 text-white/50 hover:text-white/90 transition-colors">Portfolio</Link>
          </div>
        </div>
        <ConnectButton />
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white">Strategy Feed</h1>
            <p className="text-sm text-white/40 mt-1">
              Copy alpha strategies — backend auto-executes when they move
            </p>
          </div>
          {address && (
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
            >
              + Post Strategy
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Chain filter */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {CHAINS.map((c) => (
              <button
                key={c.id}
                onClick={() => setChainFilter(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  chainFilter === c.id
                    ? "bg-violet-600 text-white"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {SORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  sort === s.id
                    ? "bg-indigo-600 text-white"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard top 3 */}
        {!isLoading && strategies.length > 0 && sort === "followers" && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Top Copied Strategies</p>
            <div className="grid grid-cols-3 gap-3">
              {strategies.slice(0, 3).map((s, i) => (
                <div key={s._id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                  <div className="text-2xl mb-1">{["🥇", "🥈", "🥉"][i]}</div>
                  <p className="text-xs font-semibold text-white truncate">{s.protocol}</p>
                  <p className="text-xs text-emerald-400 font-bold">{((s.apy ?? 0) * 100).toFixed(2)}% APY</p>
                  <p className="text-xs text-violet-400">{s.followerCount} followers</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategy list */}
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : strategies.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 text-white/30"
          >
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">No strategies posted yet.</p>
            <p className="text-xs mt-1">Use the AI chat to find a vault, then post it here.</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {strategies.map((s, i) => (
              <StrategyCard key={s._id} strategy={s} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
