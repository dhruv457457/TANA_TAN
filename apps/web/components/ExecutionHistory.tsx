"use client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

interface ExecutionLog {
  _id: string;
  followerAddress: string;
  strategyId: string;
  txHash: string;
  sweepHash: string;
  amount: number;
  vaultAddress: string;
  chainId: number;
  status: "success" | "failed";
  error: string;
  executedAt: string;
}

const EXPLORER_BY_CHAIN: Record<number, string> = {
  8453: "https://basescan.org/tx/",
  1: "https://etherscan.io/tx/",
  42161: "https://arbiscan.io/tx/",
  10: "https://optimistic.etherscan.io/tx/",
};

const CHAIN_NAMES: Record<number, string> = {
  8453: "Base",
  1: "Ethereum",
  42161: "Arbitrum",
  10: "Optimism",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  address: string | null | undefined;
}

export function ExecutionHistory({ address }: Props) {
  const { data: logs, isLoading } = useQuery<ExecutionLog[]>({
    queryKey: ["execution-history", address],
    queryFn: async () => {
      if (!address) return [];
      const res = await fetch(`/api/history/${address}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (!address) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-[#FAF6EE] border-2 border-[#D0CFCF] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-xl border-2 border-[#D0CFCF] bg-[#FAF6EE] p-6 text-center">
        <p className="text-2xl mb-2">📋</p>
        <p className="text-sm text-[#888888]">No copy-trade history yet</p>
        <p className="text-xs text-[#AAAAAA] mt-1">
          Your executions will appear here after strategies are copied
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[#1A1A1A] text-sm font-display">Execution History</h3>
        <span className="text-xs text-[#888888]">{logs.length} total</span>
      </div>

      {logs.slice(0, 20).map((log, i) => {
        const explorer = EXPLORER_BY_CHAIN[log.chainId] ?? EXPLORER_BY_CHAIN[8453];
        const chainName = CHAIN_NAMES[log.chainId] ?? "Chain";

        return (
          <motion.div
            key={log._id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 bg-white ${
              log.status === "success"
                ? "border-[#4CAF82]"
                : "border-[#F06292]"
            }`}
          >
            {/* Status dot */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 ${
                log.status === "success" ? "bg-[#4CAF82]" : "bg-[#F06292]"
              }`}
            >
              {log.status === "success" ? "✓" : "✗"}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1A1A1A]">
                  ${log.amount} USDC
                </span>
                <span className="text-xs bg-[#FAF6EE] border border-[#D0CFCF] px-1.5 py-0.5 rounded text-[#888888]">
                  {chainName}
                </span>
                <span className="text-[10px] text-[#888888]">
                  {formatDate(log.executedAt)}
                </span>
              </div>
              {log.error && (
                <p className="text-xs text-[#F06292] mt-0.5 truncate">{log.error}</p>
              )}
              {log.sweepHash && (
                <a
                  href={`${explorer}${log.sweepHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-[#2F7EE5] hover:underline font-mono"
                >
                  {log.sweepHash.slice(0, 10)}…{log.sweepHash.slice(-8)}
                </a>
              )}
            </div>

            {/* Time */}
            <div className="text-right shrink-0">
              <span className="text-xs text-[#888888]">{timeAgo(log.executedAt)}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
