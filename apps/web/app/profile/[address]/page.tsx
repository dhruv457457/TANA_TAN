"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { StrategyCard } from "@/components/StrategyCard";
import { Navbar } from "@/components/Navbar";

interface UserStrategy {
  _id: string;
  author: string;
  vaultAddress: string;
  chainId: number;
  protocol: string;
  protocolLogoUri?: string;
  chainName: string;
  vaultName: string;
  asset: string;
  apy: number;
  tvlUsd: number;
  riskLabel: string;
  pitch: string;
  followerCount: number;
  createdAt: string;
}

export default function ProfilePage() {
  const params = useParams();
  const address = params.address as string;
  const { address: connectedAddress } = useAccount();
  
  const [strategies, setStrategies] = useState<UserStrategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<"strategies" | "followers" | "following">("strategies");

  const isOwnProfile = connectedAddress?.toLowerCase() === address.toLowerCase();

  useEffect(() => {
    async function loadStrategies() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/profile/${address}`);
        if (res.ok) {
          const data = await res.json();
          setStrategies(data.strategies || []);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (address) loadStrategies();
  }, [address]);

  const totalFollowers = strategies.reduce((sum, s) => sum + (s.followerCount || 0), 0);
  const totalValue = strategies.reduce((sum, s) => sum + (s.tvlUsd || 0), 0);

  return (
    <div className="min-h-screen bg-[#FAF6EE]">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#F5B731]/10 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full bg-[#4CAF82]/5 blur-3xl" />
      </div>

      <Navbar />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="rounded-xl border-2 border-[#1A1A1A] bg-white p-6 shadow-[4px_4px_0_#1A1A1A] mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-[#F5B731] flex items-center justify-center text-[#1A1A1A] font-black text-2xl border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A]">
              {address.slice(2, 4).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-black text-[#1A1A1A] font-display">
                {isOwnProfile ? "Your Profile" : "Trader Profile"}
              </h1>
              <p className="text-xs text-[#888888] font-mono mt-1">
                {address.slice(0, 6)}…{address.slice(-4)}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-[#FAF6EE] border-2 border-[#1A1A1A]">
              <p className="text-xl font-black text-[#1A1A1A] font-display">{strategies.length}</p>
              <p className="text-xs text-[#888888]">Strategies</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[#FAF6EE] border-2 border-[#1A1A1A]">
              <p className="text-xl font-black text-[#F5B731] font-display">{totalFollowers}</p>
              <p className="text-xs text-[#888888]">Total Followers</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[#FAF6EE] border-2 border-[#1A1A1A]">
              <p className="text-xl font-black text-[#4CAF82] font-display">
                ${totalValue > 1000000 ? `${(totalValue / 1000000).toFixed(1)}M` : `${(totalValue / 1000).toFixed(0)}K`}
              </p>
              <p className="text-xs text-[#888888]">TVL</p>
            </div>
          </div>

          {/* Bio */}
          <div className="p-3 rounded-lg bg-[#FAF6EE] border border-[#D0CFCF]">
            <p className="text-sm text-[#888888]">
              {isOwnProfile 
                ? "Your yield strategies are visible to the community. Share your positions to build your following!"
                : "Yield alpha trader. Follow their strategies to auto-copy their moves."
              }
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("strategies")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold border-2 transition-colors ${
              tab === "strategies"
                ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                : "bg-white text-[#888888] border-[#D0CFCF] hover:border-[#1A1A1A]"
            }`}
          >
            Strategies ({strategies.length})
          </button>
          <button
            onClick={() => setTab("followers")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold border-2 transition-colors ${
              tab === "followers"
                ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                : "bg-white text-[#888888] border-[#D0CFCF] hover:border-[#1A1A1A]"
            }`}
          >
            Followers
          </button>
          <button
            onClick={() => setTab("following")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold border-2 transition-colors ${
              tab === "following"
                ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                : "bg-white text-[#888888] border-[#D0CFCF] hover:border-[#1A1A1A]"
            }`}
          >
            Following
          </button>
        </div>

        {/* Content */}
        {tab === "strategies" && (
          isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-40 rounded-xl bg-white border-2 border-[#D0CFCF] animate-pulse" />
              ))}
            </div>
          ) : strategies.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 px-6 rounded-xl border-2 border-[#D0CFCF] bg-white"
            >
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm text-[#888888]">
                {isOwnProfile 
                  ? "You haven't posted any strategies yet. Find a vault in the chat and share it to the feed!"
                  : "No strategies posted yet."
                }
              </p>
              {isOwnProfile && (
                <Link
                  href="/"
                  className="inline-block mt-4 px-4 py-2 rounded-lg bg-[#F5B731] text-[#1A1A1A] text-sm font-black border-2 border-[#1A1A1A]"
                >
                  Find Vaults →
                </Link>
              )}
            </motion.div>
          ) : (
            <div className="space-y-4">
              {strategies.map((s, i) => (
                <StrategyCard key={s._id} strategy={s} index={i} onAuthorClick={() => {}} />
              ))}
            </div>
          )
        )}

        {tab === "followers" && (
          <div className="text-center py-12 px-6 rounded-xl border-2 border-[#D0CFCF] bg-white">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-sm text-[#888888]">Follower list coming soon</p>
          </div>
        )}

        {tab === "following" && (
          <div className="text-center py-12 px-6 rounded-xl border-2 border-[#D0CFCF] bg-white">
            <p className="text-4xl mb-3">🤝</p>
            <p className="text-sm text-[#888888]">Following list coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}