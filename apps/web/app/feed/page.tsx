"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import Link from "next/link";
import { StrategyCard } from "@/components/StrategyCard";
import { Navbar } from "@/components/Navbar";

type SortMode = "followers" | "apy" | "new";

export default function FeedPage() {
  const { address } = useAccount();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [strategies, setStrategies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("followers");
  const [chainFilter, setChainFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const filtered = searchQuery.trim()
    ? strategies.filter(
        (s) =>
          s.protocol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.chainName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.author?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : strategies;

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
    <div className="min-h-screen bg-[#FAF6EE]">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#F5B731]/10 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full bg-[#4CAF82]/5 blur-3xl" />
      </div>

      <Navbar />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-[#1A1A1A] font-display">Strategy Feed</h1>
            <p className="text-sm text-[#888888] mt-1">
              Copy alpha strategies — backend auto-executes when they move
            </p>
          </div>
          {address && (
            <Link
              href="/"
              className="px-4 py-2 rounded-lg bg-[#F5B731] hover:bg-[#E5A720] text-[#1A1A1A] text-sm font-black border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A]"
            >
              + Post Strategy
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by protocol, chain, or author address…"
              className="w-full bg-white border-2 border-[#1A1A1A] rounded-xl px-4 py-3 pr-10 text-sm text-[#1A1A1A] placeholder:text-[#888888] focus:outline-none focus:shadow-[4px_4px_0_#F5B731] shadow-[3px_3px_0_#1A1A1A]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#1A1A1A] text-white text-xs flex items-center justify-center hover:bg-[#F06292] transition-colors"
              >
                x
              </button>
            )}
          </div>
          {searchQuery.startsWith("0x") && (
            <p className="text-xs text-[#888888] mt-2">
              Showing strategies by <span className="font-mono text-[#2F7EE5]">{searchQuery.slice(0, 6)}…{searchQuery.slice(-4)}</span>
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Chain filter */}
          <div className="flex gap-1 bg-white border-2 border-[#1A1A1A] rounded-xl p-1 shadow-[2px_2px_0_#1A1A1A]">
            {CHAINS.map((c) => (
              <button
                key={c.id}
                onClick={() => setChainFilter(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border-2 ${
                  chainFilter === c.id
                    ? "bg-[#F5B731] text-[#1A1A1A] border-[#1A1A1A]"
                    : "text-[#888888] border-transparent hover:text-[#1A1A1A]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex gap-1 bg-white border-2 border-[#1A1A1A] rounded-xl p-1 shadow-[2px_2px_0_#1A1A1A]">
            {SORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border-2 ${
                  sort === s.id
                    ? "bg-[#F5B731] text-[#1A1A1A] border-[#1A1A1A]"
                    : "text-[#888888] border-transparent hover:text-[#1A1A1A]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard top 3 */}
        {!isLoading && filtered.length > 0 && sort === "followers" && !searchQuery && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-3">Top Copied Strategies</p>
            <div className="grid grid-cols-3 gap-3">
              {filtered.slice(0, 3).map((s, i) => (
                <div key={s._id} className="rounded-xl border-2 border-[#1A1A1A] bg-white p-3 text-center shadow-[3px_3px_0_#1A1A1A]">
                  <div className="text-2xl mb-1">{["🥇", "🥈", "🥉"][i]}</div>
                  <p className="text-xs font-bold text-[#1A1A1A] truncate font-display">{s.protocol}</p>
                  <p className="text-xs text-[#4CAF82] font-black">{((s.apy ?? 0) * 100).toFixed(2)}% APY</p>
                  <p className="text-xs text-[#F5B731] font-bold">{s.followerCount} followers</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategy list */}
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-52 rounded-xl bg-white border-2 border-[#D0CFCF] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 text-[#888888]"
          >
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">No strategies found.</p>
            <p className="text-xs mt-1">
              {searchQuery ? "Try a different search term." : "Use the AI chat to find a vault, then post it here."}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filtered.map((s, i) => (
              <StrategyCard key={s._id} strategy={s} index={i} onAuthorClick={(author) => setSearchQuery(author)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
