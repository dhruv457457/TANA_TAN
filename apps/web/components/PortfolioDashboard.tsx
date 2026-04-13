"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useMyDelegations } from "@/hooks/useMyDelegations";
import { useWithdraw } from "@/hooks/useWithdraw";
import { useRevokeDelegation } from "@/hooks/useRevokeDelegation";
import type { PortfolioPosition } from "@/types";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const CHAIN_NAMES: Record<number, string> = {
  8453: "Base", 1: "Ethereum", 42161: "Arbitrum", 10: "Optimism", 137: "Polygon",
};

type TabFilter = "all" | string;

function WithdrawModal({
  pos,
  address,
  onClose,
}: {
  pos: PortfolioPosition;
  address: string;
  onClose: () => void;
}) {
  const { withdraw, status, error, reset } = useWithdraw();
  // Use actual token balance (pos.balance) — NOT balanceUsd which rounds and causes tx failures
  // e.g. 0.0488 shares rounds to "0.05" USD, but user only owns 0.0488 shares → tx reverts
  const [amount, setAmount] = useState(pos.balance && parseFloat(pos.balance) > 0 ? pos.balance : "");

  async function handleWithdraw() {
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }
    await withdraw({
      vaultAddress: pos.vaultAddress,
      chainId: pos.chainId,
      amount,
      userAddress: address,
    });
    if (status === "done") {
      onClose();
      reset();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-xl border-2 border-[#1A1A1A] bg-white shadow-[5px_5px_0_#1A1A1A] p-5"
      >
        <h3 className="font-black text-[#1A1A1A] font-display mb-1">Withdraw</h3>
        <p className="text-xs text-[#888888] mb-4">{pos.name}</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#888888] mb-1 block">Amount (tokens)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#FAF6EE] border-2 border-[#1A1A1A] rounded-lg px-3 py-2 text-sm text-[#1A1A1A]"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAmount(pos.balance && parseFloat(pos.balance) > 0 ? pos.balance : "0")}
              className="flex-1 py-2 rounded-lg bg-[#FAF6EE] border-2 border-[#D0CFCF] text-xs text-[#888888] hover:border-[#1A1A1A] transition-colors"
            >
              Max
            </button>
            <button
              onClick={handleWithdraw}
              disabled={status === "sending" || status === "quoting" || status === "approving"}
              className="flex-1 py-2 rounded-lg bg-[#F5B731] border-2 border-[#1A1A1A] text-sm font-black text-[#1A1A1A] disabled:opacity-50"
            >
              {status === "quoting" ? "Getting quote…"
                : status === "approving" ? "Approving…"
                : status === "sending" ? "Sending…"
                : "Withdraw"}
            </button>
          </div>
          {error && (
            <div className="p-2 bg-[#FEF2F2] border border-[#F06292] rounded-lg">
              <p className="text-xs text-[#F06292] mb-2">{error}</p>
              <a
                href={`https://app.morpho.org/base/vault/${pos.vaultAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#2F7EE5] underline hover:text-[#1A5BC5]"
              >
                Withdraw directly from {pos.protocol}
              </a>
            </div>
          )}
          <button onClick={onClose} className="w-full text-xs text-[#888888] hover:text-[#1A1A1A]">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function PositionRow({
  pos,
  address,
  index,
}: {
  pos: PortfolioPosition;
  address: string;
  index: number;
}) {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "shared">("idle");
  const apyPct = (pos.apy * 100).toFixed(2);
  const chainName = CHAIN_NAMES[pos.chainId] ?? "Chain";

  async function handleShare() {
    setShareStatus("sharing");
    try {
      const res = await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: address,
          vaultAddress: pos.vaultAddress,
          chainId: pos.chainId,
          protocol: pos.protocol,
          chainName,
          vaultName: pos.name,
          asset: pos.asset,
          apy: pos.apy,
          tvlUsd: pos.tvlUsd ?? 0,
          pitch: `Earning ${apyPct}% APY on ${pos.protocol} (${chainName})`,
        }),
      });
      if (res.ok) {
        setShareStatus("shared");
        setTimeout(() => setShareStatus("idle"), 3000);
      } else {
        setShareStatus("idle");
      }
    } catch {
      setShareStatus("idle");
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06 }}
        className="rounded-xl border-2 border-[#1A1A1A] bg-[#FAF6EE] shadow-[2px_2px_0_#1A1A1A] p-4 hover:shadow-[4px_4px_0_#1A1A1A] transition-shadow"
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="w-9 h-9 rounded-lg bg-[#F5B731] flex items-center justify-center text-[#1A1A1A] text-xs font-black border-2 border-[#1A1A1A] shrink-0">
            {pos.protocol.slice(0, 2).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-[#1A1A1A] truncate font-display">{pos.name}</p>
              <span className="text-[10px] bg-white border border-[#D0CFCF] px-1.5 py-0.5 rounded text-[#888888] shrink-0">
                {chainName}
              </span>
            </div>
            {/* Vault Address */}
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[9px] text-[#888888]">Vault:</span>
              <button 
                onClick={() => navigator.clipboard.writeText(pos.vaultAddress)}
                className="text-[9px] text-[#2F7EE5] hover:underline font-mono"
                title="Click to copy"
              >
                {pos.vaultAddress.slice(0, 6)}...{pos.vaultAddress.slice(-4)}
              </button>
            </div>
            {/* Tags */}
            {pos.tags && pos.tags.length > 0 && (
              <div className="flex gap-1 mt-1">
                {pos.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[9px] bg-white border border-[#D0CFCF] px-1.5 py-0.5 rounded text-[#888888]">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* APY + Balance */}
          <div className="text-right shrink-0">
            <p className="text-sm font-black text-[#4CAF82] font-display tabular-nums">{apyPct}%</p>
            <p className="text-xs text-[#1A1A1A] font-bold tabular-nums">
              ${pos.balanceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* APY breakdown */}
        {pos.apyBreakdown && (
          <p className="text-[10px] text-[#888888] mt-1">
            Base {(pos.apyBreakdown.base * 100).toFixed(1)}% · Reward {(pos.apyBreakdown.reward * 100).toFixed(1)}%
            {pos.tvlUsd && <span className="ml-2">TVL ${(pos.tvlUsd / 1_000_000).toFixed(1)}M</span>}
          </p>
        )}

        {/* Actions */}
        <div className="mt-3 flex justify-end gap-2">
          <motion.button
            onClick={handleShare}
            disabled={shareStatus !== "idle"}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-1.5 rounded-lg bg-[#F5B731] text-[#1A1A1A] text-xs font-bold border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] disabled:opacity-60"
          >
            {shareStatus === "sharing" ? "Posting…" : shareStatus === "shared" ? "Posted!" : "Share to Feed"}
          </motion.button>
          {pos.isRedeemable && (
            <motion.button
              onClick={() => setShowWithdraw(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-1.5 rounded-lg bg-[#F06292] text-white text-xs font-bold border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A]"
            >
              Withdraw
            </motion.button>
          )}
        </div>
      </motion.div>

      {showWithdraw && (
        <WithdrawModal pos={pos} address={address} onClose={() => setShowWithdraw(false)} />
      )}
    </>
  );
}

function ActiveCopyTradeRow({
  delegation,
  index,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delegation: any;
  index: number;
}) {
  const { revoke, status } = useRevokeDelegation();
  const s = delegation.strategyId ?? {};
  const apyPct = ((s.apy ?? 0) * 100).toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex items-center gap-3 p-3 rounded-xl border-2 border-[#F5B731] bg-white shadow-[2px_2px_0_#F5B731]"
    >
      <div className="w-8 h-8 rounded-lg bg-[#F5B731] flex items-center justify-center text-[#1A1A1A] text-xs font-black border border-[#1A1A1A] shrink-0">
        {(s.protocol ?? "??").slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-[#1A1A1A] truncate">{s.vaultName || s.protocol}</p>
        <p className="text-[10px] text-[#888888]">
          ${delegation.amount} USDC · {delegation.executionCount ?? 0} runs · Last {timeAgo(delegation.lastExecutedAt)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-[#4CAF82]">{apyPct}%</span>
        <motion.button
          onClick={() => revoke(delegation._id)}
          disabled={status === "revoking"}
          whileTap={{ scale: 0.95 }}
          className="text-[10px] px-2 py-1 rounded bg-[#F06292] text-white font-bold border border-[#1A1A1A]"
        >
          {status === "revoking" ? "…" : "Stop"}
        </motion.button>
      </div>
    </motion.div>
  );
}

export function PortfolioDashboard({ address }: { address?: string | null }) {
  const { data: positions, isLoading, error } = usePortfolio(address);
  const { data: myDelegations } = useMyDelegations(address);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const activeCopyTrades = myDelegations?.filter((d) => d.isActive) ?? [];

  if (!address) {
    return (
      <div className="rounded-xl border-2 border-[#D0CFCF] bg-[#FAF6EE] p-6 text-center">
        <p className="text-sm text-[#888888]">Connect your wallet to view positions</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-[#FAF6EE] border-2 border-[#D0CFCF] animate-pulse" />
        ))}
      </div>
    );
  }

  // Get unique protocols from positions
  const protocols = [...new Set((positions ?? []).map((p) => p.protocol))];
  
  // Filter positions by selected tab
  const filteredPositions = activeTab === "all" 
    ? (positions ?? [])
    : (positions ?? []).filter((p) => p.protocol.toLowerCase().includes(activeTab.toLowerCase()));

  const totalUsd = (positions ?? []).reduce((s, p) => s + p.balanceUsd, 0);
  const filteredUsd = filteredPositions.reduce((s, p) => s + p.balanceUsd, 0);
  const weightedApy =
    totalUsd > 0
      ? (positions ?? []).reduce((s, p) => s + p.apy * p.balanceUsd, 0) / totalUsd
      : 0;

  return (
    <div className="space-y-6">
      {/* Total + APY */}
      <div className="rounded-xl border-2 border-[#1A1A1A] bg-white p-5 shadow-[3px_3px_0_#1A1A1A]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#888888] uppercase tracking-wider">Portfolio</p>
            <p className="text-2xl font-black text-[#1A1A1A] font-display tabular-nums">
              ${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#888888]">Avg APY</p>
            <p className="text-xl font-black text-[#4CAF82] font-display tabular-nums">
              {(weightedApy * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Active Copy Trades */}
      {activeCopyTrades.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded bg-[#F5B731] border border-[#1A1A1A] flex items-center justify-center">
              <span className="text-[8px] text-[#1A1A1A] font-black">C</span>
            </div>
            <h3 className="font-bold text-[#1A1A1A] text-sm font-display">Active Copy Trades</h3>
            <span className="text-[10px] bg-[#F5B731] text-[#1A1A1A] px-1.5 py-0.5 rounded font-bold">
              {activeCopyTrades.length}
            </span>
          </div>
          <div className="space-y-2">
            {activeCopyTrades.map((d, i) => (
              <ActiveCopyTradeRow key={d._id} delegation={d} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Vault Positions */}
      <div>
        {/* Protocol Tabs */}
        {protocols.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-lg text-xs font-bold border-2 transition-colors shrink-0 ${
                activeTab === "all"
                  ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                  : "bg-white text-[#888888] border-[#D0CFCF] hover:border-[#1A1A1A]"
              }`}
            >
              All ({(positions ?? []).length})
            </button>
            {protocols.map((protocol) => {
              const count = (positions ?? []).filter((p) => p.protocol === protocol).length;
              const protocolTotal = (positions ?? [])
                .filter((p) => p.protocol === protocol)
                .reduce((s, p) => s + p.balanceUsd, 0);
              return (
                <button
                  key={protocol}
                  onClick={() => setActiveTab(protocol)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border-2 transition-colors shrink-0 ${
                    activeTab === protocol
                      ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                      : "bg-white text-[#888888] border-[#D0CFCF] hover:border-[#1A1A1A]"
                  }`}
                >
                  {protocol} ({count})
                  <span className="ml-1 opacity-70">${protocolTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[#1A1A1A] text-sm font-display">
            {activeTab === "all" ? "Vault Positions" : `${activeTab} Positions`}
          </h3>
          <span className="text-xs text-[#888888]">
            {filteredPositions.length} position{filteredPositions.length !== 1 ? "s" : ""}
            {filteredPositions.length > 0 && activeTab !== "all" && (
              <span className="ml-1">(${filteredUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
            )}
          </span>
        </div>

        {(error || !positions || filteredPositions.length === 0) ? (
          <div className="rounded-xl border-2 border-[#D0CFCF] bg-[#FAF6EE] p-6 text-center">
            <p className="text-sm text-[#888888]">
              {error ? "Error loading positions" : `No ${activeTab === "all" ? "" : activeTab + " "}positions found`}
            </p>
            <p className="text-xs text-[#AAAAAA] mt-1">Positions indexed every ~15 minutes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPositions.map((pos, i) => (
              <PositionRow key={`${pos.vaultAddress}-${i}`} pos={pos} address={address!} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
