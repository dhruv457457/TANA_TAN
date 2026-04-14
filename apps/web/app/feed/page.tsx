"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import Link from "next/link";
import { StrategyCard } from "@/components/StrategyCard";
import { Navbar } from "@/components/Navbar";

type SortMode = "followers" | "apy" | "new";

const CHAINS = [
  { id: "all", label: "All" },
  { id: "8453", label: "Base" },
  { id: "42161", label: "Arbitrum" },
  { id: "1", label: "Ethereum" },
];

const SORTS: { id: SortMode; label: string; icon: string }[] = [
  { id: "followers", label: "Hot", icon: "🔥" },
  { id: "new", label: "New", icon: "✨" },
  { id: "apy", label: "Top APY", icon: "📈" },
];

export default function FeedPage() {
  const { address } = useAccount();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [strategies, setStrategies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("followers");
  const [chainFilter, setChainFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

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
          s.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.pitch?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : strategies;

  const topThree = filtered.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#FAF6EE]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#F5B731]/8 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full bg-[#4CAF82]/5 blur-3xl" />
      </div>

      <Navbar />

      {/* ── Two-column layout ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 flex gap-6">

        {/* ── LEFT: Main feed ── */}
        <div className="flex-1 min-w-0">

          {/* Feed top bar — like X/Farcaster tab bar */}
          <div className="sticky top-0 z-20 bg-[#FAF6EE]/95 backdrop-blur-sm border-b-2 border-[#1A1A1A] mb-4">
            <div className="flex items-center justify-between py-3">
              <div className="flex gap-0">
                {SORTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSort(s.id)}
                    className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-all ${
                      sort === s.id
                        ? "border-[#F5B731] text-[#1A1A1A]"
                        : "border-transparent text-[#888888] hover:text-[#1A1A1A]"
                    }`}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pr-1">
                {/* Search toggle */}
                <button
                  onClick={() => setSearchOpen((v) => !v)}
                  className="w-8 h-8 rounded-lg border-2 border-[#D0CFCF] bg-white flex items-center justify-center text-[#888888] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="5.5" cy="5.5" r="4.5"/><path d="M9.5 9.5l2.5 2.5" strokeLinecap="round"/>
                  </svg>
                </button>
                {/* Chain filter */}
                <div className="flex gap-0.5 bg-white border-2 border-[#1A1A1A] rounded-lg p-0.5">
                  {CHAINS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setChainFilter(c.id)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                        chainFilter === c.id
                          ? "bg-[#1A1A1A] text-white"
                          : "text-[#888888] hover:text-[#1A1A1A]"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Expandable search bar */}
            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden pb-3"
                >
                  <div className="relative">
                    <input
                      autoFocus
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search protocol, chain, address, or pitch…"
                      className="w-full bg-white border-2 border-[#1A1A1A] rounded-xl px-4 py-2.5 pr-9 text-sm text-[#1A1A1A] placeholder:text-[#888888] focus:outline-none focus:shadow-[3px_3px_0_#F5B731] shadow-[2px_2px_0_#1A1A1A]"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#888888] text-white text-[10px] flex items-center justify-center hover:bg-[#F06292]">
                        ×
                      </button>
                    )}
                  </div>
                  {searchQuery.startsWith("0x") && (
                    <p className="text-xs text-[#888888] mt-1.5 px-1">
                      Strategies by <span className="font-mono text-[#2F7EE5]">{searchQuery.slice(0, 6)}…{searchQuery.slice(-4)}</span>
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Strategy list */}
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl bg-white border-2 border-[#D0CFCF] animate-pulse" style={{ height: 220 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm text-[#888888]">No strategies found.</p>
              <Link href="/" className="text-xs text-[#2F7EE5] hover:underline mt-1 block">
                Use AI chat to find a vault → post it here
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filtered.map((s, i) => (
                <StrategyCard
                  key={s._id}
                  strategy={s}
                  index={i}
                  onAuthorClick={(author) => { setSearchQuery(author); setSearchOpen(true); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT sidebar ── */}
        <div className="hidden lg:block w-72 shrink-0 space-y-4">

          {/* Post CTA */}
          {address ? (
            <div className="rounded-xl border-2 border-[#1A1A1A] bg-white p-4 shadow-[3px_3px_0_#1A1A1A]">
              <p className="text-sm font-black text-[#1A1A1A] mb-1">Share your alpha</p>
              <p className="text-xs text-[#888888] mb-3">Chat with TANA → find a vault → post it for others to follow.</p>
              <Link
                href="/"
                className="block text-center py-2.5 rounded-lg bg-[#F5B731] hover:bg-[#E5A720] text-[#1A1A1A] text-sm font-black border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] transition-shadow"
              >
                + Post via AI
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-[#D0CFCF] bg-white p-4">
              <p className="text-sm font-bold text-[#1A1A1A] mb-1">Join TANA-TAN</p>
              <p className="text-xs text-[#888888]">Connect wallet to follow strategies and auto-copy alpha moves.</p>
            </div>
          )}

          {/* Trending leaderboard */}
          {!isLoading && topThree.length > 0 && (
            <div className="rounded-xl border-2 border-[#1A1A1A] bg-white p-4 shadow-[3px_3px_0_#1A1A1A]">
              <p className="text-xs font-black text-[#1A1A1A] uppercase tracking-wider mb-3">🔥 Trending</p>
              <div className="space-y-3">
                {topThree.map((s, i) => (
                  <div key={s._id} className="flex items-center gap-2.5">
                    <span className="text-base shrink-0">{["🥇","🥈","🥉"][i]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#1A1A1A] truncate">{s.protocol?.replace(/-v\d+$/,"")}</p>
                      <p className="text-[10px] text-[#888888]">{s.followerCount ?? 0} copying · {((s.apy ?? 0) * 100).toFixed(1)}%</p>
                    </div>
                    <span className="text-xs font-black text-[#4CAF82] shrink-0">{((s.apy ?? 0) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What is TANA-TAN */}
          <div className="rounded-xl border-2 border-[#D0CFCF] bg-white p-4 text-xs text-[#888888] space-y-1.5">
            <p className="font-black text-[#1A1A1A] text-sm">What is TANA-TAN?</p>
            <p>A social yield platform. Follow alpha traders and auto-copy their DeFi moves on-chain.</p>
            <p>Powered by <span className="text-[#2F7EE5] font-semibold">LI.FI Earn</span> + <span className="font-semibold text-[#F06292]">MetaMask Delegation</span>.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
