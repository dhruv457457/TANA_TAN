"use client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { fetchVaultDetail } from "@/lib/lifi";

interface LiFiEarnData {
  name: string;
  protocol: string | { url: string; name: string };
  tags: string[];
  analytics?: {
    apy?: { base?: number; reward?: number; total?: number };
    tvl?: { usd?: number };
  };
  isTransactional?: boolean;
  isRedeemable?: boolean;
}

interface Props {
  chainId: number;
  vaultAddress: string;
  strategyApy?: number;
  strategyTvl?: number;
}

export function LiFiBadge({ chainId, vaultAddress, strategyApy, strategyTvl }: Props) {
  const { data, isLoading, error } = useQuery<LiFiEarnData>({
    queryKey: ["vault-detail", chainId, vaultAddress],
    queryFn: () => fetchVaultDetail(chainId, vaultAddress),
    staleTime: 60_000,
    retry: 2,
  });

  const apy = data?.analytics?.apy?.total ?? strategyApy ?? 0;
  const tvl = data?.analytics?.tvl?.usd ?? strategyTvl ?? 0;
  const baseApy = data?.analytics?.apy?.base ?? 0;
  const rewardApy = data?.analytics?.apy?.reward ?? 0;
  const tags = data?.tags ?? [];
  const isTransactional = data?.isTransactional !== false;
  const isRedeemable = data?.isRedeemable === true;

  const tvlFormatted =
    tvl > 1_000_000
      ? `$${(tvl / 1_000_000).toFixed(1)}M`
      : tvl > 1_000
      ? `$${(tvl / 1_000).toFixed(0)}K`
      : "$0";

  const chainName =
    chainId === 8453 ? "Base" : chainId === 1 ? "Ethereum" : chainId === 42161 ? "Arbitrum" : "Chain";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border-2 border-[#1A1A1A] bg-white p-3 shadow-[3px_3px_0_#1A1A1A]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-[#2F7EE5] text-white font-black text-[10px]">
            L
          </div>
          <span className="text-xs font-bold text-[#2F7EE5]">
            Verified by LI.FI Earn
          </span>
        </div>
        {isLoading ? (
          <span className="text-[10px] text-[#888888] animate-pulse">Loading…</span>
        ) : error ? (
          <span className="text-[10px] text-[#F06292]">Error</span>
        ) : (
          <span className="text-[10px] text-[#4CAF82] font-semibold">Live Data</span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* APY */}
        <div className="bg-[#FAF6EE] rounded-lg p-2 border border-[#D0CFCF]">
          <p className="text-[10px] text-[#888888] mb-0.5">APY</p>
          <p className="text-sm font-black text-[#4CAF82] font-display">
            {(apy * 100).toFixed(2)}%
          </p>
          {baseApy > 0 && rewardApy > 0 && (
            <p className="text-[9px] text-[#888888]">
              {((baseApy + rewardApy) * 100).toFixed(1)}% total
            </p>
          )}
        </div>

        {/* TVL */}
        <div className="bg-[#FAF6EE] rounded-lg p-2 border border-[#D0CFCF]">
          <p className="text-[10px] text-[#888888] mb-0.5">TVL</p>
          <p className="text-sm font-black text-[#1A1A1A] font-display">{tvlFormatted}</p>
        </div>
      </div>

      {/* Chain + Protocol */}
      <div className="flex items-center gap-2 mb-3 text-xs text-[#888888]">
        <span className="bg-[#FAF6EE] border border-[#D0CFCF] rounded px-2 py-0.5 font-semibold text-[#1A1A1A]">
          {chainName}
        </span>
        <span className="font-medium text-[#1A1A1A]">
          {typeof data?.protocol === 'string' ? data.protocol : data?.protocol?.name ?? "Protocol"}
        </span>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 bg-[#FAF6EE] border border-[#D0CFCF] rounded-full text-[#888888]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Status */}
      <div className="flex items-center gap-3 text-[11px]">
        <div className="flex items-center gap-1">
          <span
            className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
              isTransactional
                ? "bg-[#4CAF82] border-[#4CAF82]"
                : "bg-white border-[#F06292]"
            }`}
          >
            {isTransactional && (
              <span className="text-white text-[8px] font-black">✓</span>
            )}
          </span>
          <span className={isTransactional ? "text-[#4CAF82]" : "text-[#F06292]"}>
            Deposits {isTransactional ? "Open" : "Closed"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
              isRedeemable
                ? "bg-[#4CAF82] border-[#4CAF82]"
                : "bg-white border-[#888888]"
            }`}
          >
            {isRedeemable && (
              <span className="text-white text-[8px] font-black">✓</span>
            )}
          </span>
          <span className={isRedeemable ? "text-[#4CAF82]" : "text-[#888888]"}>
            Withdrawals {isRedeemable ? "Open" : "Locked"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
