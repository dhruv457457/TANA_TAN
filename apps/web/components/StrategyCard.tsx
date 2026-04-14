"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useCopyStrategy, type StrategyToCopy } from "@/hooks/useCopyStrategy";
import { useMyDelegations } from "@/hooks/useMyDelegations";
import { useRevokeDelegation } from "@/hooks/useRevokeDelegation";
import { useUserProfile } from "@/hooks/useUserProfile";
import { LiFiBadge } from "./LiFiBadge";
import { addressToColor } from "@/lib/protocolLogos";
import Image from "next/image";

const RISK_STYLE = {
  Safe: "bg-[#E8F5E9] border-[#4CAF82] text-[#4CAF82]",
  Balanced: "bg-[#FFF8E1] border-[#F5B731] text-[#B8860B]",
  Degen: "bg-[#FCE4EC] border-[#F06292] text-[#F06292]",
};

const COPY_LABEL: Record<string, string> = {
  idle: "Follow & Auto-Copy",
  requesting: "Approve in MetaMask…",
  saving: "Saving…",
  done: "✓ Following!",
  error: "Retry",
};

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ProtocolAvatar({ protocol, logoUri, size = 44 }: { protocol: string; logoUri?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  // Use LiFi Earn API logoUri; fall back to colored initials
  const logoUrl = !imgError ? (logoUri ?? null) : null;
  const initials = protocol.replace(/-v\d+$/, "").slice(0, 2).toUpperCase();

  if (logoUrl) {
    return (
      <div style={{ width: size, height: size }} className="rounded-xl border-2 border-[#1A1A1A] overflow-hidden shadow-[2px_2px_0_#1A1A1A] shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={protocol}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }
  return (
    <div
      style={{ width: size, height: size, backgroundColor: addressToColor(protocol) }}
      className="rounded-xl border-2 border-[#1A1A1A] flex items-center justify-center text-white font-black text-sm shadow-[2px_2px_0_#1A1A1A] shrink-0"
    >
      {initials}
    </div>
  );
}

function WalletAvatar({
  address, size = 22, avatarUrl, displayName,
}: { address: string; size?: number; avatarUrl?: string; displayName?: string }) {
  const [imgErr, setImgErr] = useState(false);
  const color = addressToColor(address);
  const initials = (displayName || address.slice(2, 4)).slice(0, 2).toUpperCase();
  const fontSize = Math.max(8, Math.floor(size * 0.38));

  if (avatarUrl && !imgErr) {
    return (
      <div style={{ width: size, height: size }} className="rounded-full border border-[#1A1A1A] overflow-hidden shrink-0">
        <Image src={avatarUrl} alt={displayName || address} width={size} height={size} className="w-full h-full object-cover" onError={() => setImgErr(true)} unoptimized />
      </div>
    );
  }
  return (
    <div
      style={{ width: size, height: size, backgroundColor: color, fontSize }}
      className="rounded-full border border-[#1A1A1A] flex items-center justify-center text-white font-black shrink-0"
    >
      {initials}
    </div>
  );
}

function StrategyImage({ url }: { url: string }) {
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
  return (
    <div className="mx-4 mt-3 mb-1 rounded-xl overflow-hidden border-2 border-[#1A1A1A]">
      {status === "err" ? (
        <div className="w-full h-24 bg-[#F0EDE6] flex items-center justify-center text-xs text-[#888888]">
          Image unavailable
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={url}
          alt="strategy"
          className="w-full object-cover max-h-52"
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("err")}
          style={status === "loading" ? { minHeight: 80, background: "#F0EDE6" } : undefined}
        />
      )}
    </div>
  );
}

interface Props {
  strategy: {
    _id: string;
    vaultAddress: string;
    chainId: number;
    protocol: string;
    vaultName: string;
    chainName: string;
    asset: string;
    apy: number;
    tvlUsd: number;
    riskLabel: string;
    pitch: string;
    author: string;
    followerCount: number;
    totalValueManaged?: number;
    createdAt?: string;
    likes?: string[];
    imageUrl?: string;
    protocolLogoUri?: string;
  };
  index: number;
  onAuthorClick?: (author: string) => void;
}

export function StrategyCard({ strategy, index, onAuthorClick }: Props) {
  const { address } = useAccount();
  const { copyStrategy, status: copyStatus, error: copyError, reset: copyReset } = useCopyStrategy();
  const { data: myDelegations } = useMyDelegations(address);
  const { revoke, status: revokeStatus } = useRevokeDelegation();
  const { profile: authorProfile } = useUserProfile(strategy.author);

  const [amount, setAmount] = useState("100");
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [showLiFiDetails, setShowLiFiDetails] = useState(false);

  // Like state
  const [likes, setLikes] = useState<string[]>(strategy.likes ?? []);
  const isLiked = !!(address && likes.includes(address.toLowerCase()));
  async function handleLike() {
    if (!address) return;
    const prev = likes;
    const next = isLiked ? likes.filter((a) => a !== address.toLowerCase()) : [...likes, address.toLowerCase()];
    setLikes(next);
    try {
      await fetch(`/api/strategies/${strategy._id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
    } catch { setLikes(prev); }
  }

  const apyPct = ((strategy.apy ?? 0) * 100).toFixed(2);
  const tvlM = ((strategy.tvlUsd ?? 0) / 1_000_000).toFixed(1);
  const riskLabel = (strategy.riskLabel ?? "Balanced") as keyof typeof RISK_STYLE;
  const isOwn = address?.toLowerCase() === strategy.author?.toLowerCase();
  const postedAt = timeAgo(strategy.createdAt);

  const myDelegation = myDelegations?.find((d) => d.strategyId?._id === strategy._id);
  const isCopying = !!myDelegation && myDelegation.isActive;
  const isDone = copyStatus === "done";
  const isBusy = copyStatus === "requesting" || copyStatus === "saving" || revokeStatus === "revoking";

  function handleFollowClick() {
    if (!showAmountInput) { setShowAmountInput(true); return; }
    copyReset();
    copyStrategy({
      _id: strategy._id,
      vaultAddress: strategy.vaultAddress,
      chainId: strategy.chainId,
      protocol: strategy.protocol,
      vaultName: strategy.vaultName ?? strategy.protocol,
      amount: Math.max(0.01, parseFloat(amount) || 0.01),
    } as StrategyToCopy);
  }

  function handleUnfollow() {
    if (!myDelegation) return;
    revoke(myDelegation._id);
  }

  const authorName = authorProfile?.displayName || `${strategy.author.slice(0, 6)}…${strategy.author.slice(-4)}`;
  const authorShort = `${strategy.author.slice(0, 6)}…${strategy.author.slice(-4)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-xl border-2 border-[#1A1A1A] bg-white shadow-[3px_3px_0_#1A1A1A] hover:shadow-[5px_5px_0_#1A1A1A] transition-shadow"
    >
      {/* ── Author header (top, like X/Farcaster) ── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={(e) => { e.stopPropagation(); onAuthorClick?.(strategy.author); }}
          className="shrink-0"
        >
          <WalletAvatar
            address={strategy.author}
            size={40}
            avatarUrl={authorProfile?.avatarUrl}
            displayName={authorProfile?.displayName}
          />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onAuthorClick?.(strategy.author); }}
              className="text-sm font-black text-[#1A1A1A] hover:underline truncate max-w-[160px]"
            >
              {authorName}
            </button>
            {authorProfile?.displayName && (
              <span className="text-xs text-[#888888] font-mono truncate">
                {authorShort}
              </span>
            )}
            {isOwn && (
              <span className="text-[10px] bg-[#FFF8E1] text-[#B8860B] border border-[#F5B731] px-2 py-0.5 rounded-full font-semibold shrink-0">
                You
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#AAAAAA] mt-0.5">{postedAt}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border shrink-0 ${RISK_STYLE[riskLabel] ?? RISK_STYLE.Balanced}`}>
          {riskLabel}
        </span>
      </div>

      {/* ── Vault identity ── */}
      <div className="flex items-center gap-3 px-4 pb-2">
        <div className="w-10 shrink-0 flex justify-center">
          {/* vertical connector line */}
          <div className="w-0.5 h-full bg-[#F0EDE6] rounded-full" style={{ minHeight: 8 }} />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ProtocolAvatar protocol={strategy.protocol} logoUri={strategy.protocolLogoUri} size={32} />
          <div className="min-w-0">
            <p className="font-black text-[#1A1A1A] text-sm leading-tight font-display truncate">
              {strategy.vaultName || `${strategy.protocol} ${strategy.asset}`}
            </p>
            <p className="text-xs text-[#888888]">
              {strategy.chainName} · {strategy.protocol.replace(/-v\d+$/, "")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Pitch (tweet-style body) ── */}
      {strategy.pitch && (
        <p className="px-4 pb-3 text-sm text-[#1A1A1A] leading-relaxed pl-[3.75rem]">
          {strategy.pitch}
        </p>
      )}

      {/* ── Stats bar ── */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#FAF6EE] mx-4 rounded-lg border border-[#E8E4DC] flex-wrap">
        <div className="flex items-baseline gap-1">
          <span className="text-base font-black text-[#4CAF82] font-display">{apyPct}%</span>
          <span className="text-[10px] text-[#888888]">APY</span>
        </div>
        <span className="text-[#D0CFCF] text-xs">·</span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-bold text-[#1A1A1A] font-display">${tvlM}M</span>
          <span className="text-[10px] text-[#888888]">TVL</span>
        </div>
        <span className="text-[#D0CFCF] text-xs">·</span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-bold text-[#F5B731] font-display">{strategy.followerCount ?? 0}</span>
          <span className="text-[10px] text-[#888888]">copying</span>
        </div>
        {(strategy.totalValueManaged ?? 0) > 0 && (
          <>
            <span className="text-[#D0CFCF] text-xs">·</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-[#2F7EE5] font-display">
                ${(strategy.totalValueManaged! >= 1000
                  ? `${(strategy.totalValueManaged! / 1000).toFixed(1)}k`
                  : strategy.totalValueManaged!.toFixed(0))}
              </span>
              <span className="text-[10px] text-[#888888]">managed</span>
            </div>
          </>
        )}
      </div>

      {/* ── Strategy image (if any) ── */}
      {strategy.imageUrl && <StrategyImage url={strategy.imageUrl} />}

      {/* ── Social action bar ── */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-b border-[#F0EDE6]">
        {/* Like */}
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${isLiked ? "text-[#F06292]" : "text-[#888888] hover:text-[#F06292]"}`}
        >
          <svg width="15" height="14" viewBox="0 0 15 14" fill={isLiked ? "#F06292" : "none"} stroke={isLiked ? "#F06292" : "currentColor"} strokeWidth="1.5">
            <path d="M7.5 12.5S1 8.5 1 4.5A3 3 0 017.5 3 3 3 0 0114 4.5c0 4-6.5 8-6.5 8z"/>
          </svg>
          {likes.length > 0 && <span>{likes.length}</span>}
        </button>
        {/* Share/copy link */}
        <button
          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/feed?strategy=${strategy._id}`)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#888888] hover:text-[#2F7EE5] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 1l4 3-4 3V5H5a4 4 0 000 8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Share</span>
        </button>
        <div className="flex-1" />
        {/* Follower pill */}
        <span className="text-[10px] bg-[#FAF6EE] border border-[#E0DBCF] px-2 py-0.5 rounded-full text-[#888888]">
          {strategy.followerCount ?? 0} copying
        </span>
      </div>

      {/* ── LI.FI details (collapsible) ── */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setShowLiFiDetails((v) => !v)}
          className="flex items-center gap-1 text-[11px] text-[#2F7EE5] hover:underline"
        >
          <span className="w-4 h-4 rounded bg-[#2F7EE5] text-white font-black text-[8px] flex items-center justify-center">L</span>
          {showLiFiDetails ? "Hide" : "LI.FI"} live data {showLiFiDetails ? "▲" : "▼"}
        </button>
        {showLiFiDetails && (
          <div className="mt-2">
            <LiFiBadge
              chainId={strategy.chainId}
              vaultAddress={strategy.vaultAddress}
              strategyApy={strategy.apy}
              strategyTvl={strategy.tvlUsd}
            />
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="px-4 pb-4 border-t-2 border-[#F0EDE6] pt-3">

        {/* ALREADY COPYING */}
        {isCopying && (
          <div className="space-y-2">
            <div className="rounded-lg bg-[#E8F5E9] border-2 border-[#4CAF82] p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-[#4CAF82]">✓ Auto-Copying</p>
                <p className="text-[10px] text-[#4CAF82]/80 mt-0.5">
                  ${myDelegation?.amount ?? 0} USDC · {myDelegation?.executionCount ?? 0} runs · last {timeAgo(myDelegation?.lastExecutedAt ?? null) || "never"}
                </p>
              </div>
              <span className="text-[10px] bg-[#4CAF82] text-white px-2 py-0.5 rounded-full font-bold">LIVE</span>
            </div>
            <motion.button
              onClick={handleUnfollow}
              disabled={revokeStatus === "revoking"}
              whileTap={{ scale: 0.97 }}
              className="w-full py-2 rounded-lg bg-white border-2 border-[#F06292] text-[#F06292] font-bold text-xs hover:bg-[#FCE4EC] disabled:opacity-50 transition-colors"
            >
              {revokeStatus === "revoking" ? "Stopping…" : "Unfollow Strategy"}
            </motion.button>
          </div>
        )}

        {/* NOT COPYING, NOT OWN */}
        {!isCopying && !isOwn && (
          <div className="space-y-2">
            {showAmountInput && !isDone && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#FAF6EE] border-2 border-[#1A1A1A] rounded-lg">
                <span className="text-xs text-[#888888] shrink-0">Amount:</span>
                <div className="flex-1 relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[#888888]">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                      // Allow digits, one dot, and empty string — no clamping while typing
                      const v = e.target.value;
                      if (v === "" || /^\d*\.?\d*$/.test(v)) setAmount(v);
                    }}
                    onBlur={() => {
                      // Clamp to minimum on blur
                      const n = parseFloat(amount);
                      if (!n || n < 0.01) setAmount("0.01");
                    }}
                    placeholder="0.00"
                    className="w-full bg-transparent pl-5 pr-2 py-0.5 text-sm text-[#1A1A1A] focus:outline-none"
                  />
                </div>
                <span className="text-xs font-bold text-[#888888] shrink-0">USDC</span>
              </div>
            )}

            <motion.button
              onClick={handleFollowClick}
              disabled={isBusy}
              whileTap={{ scale: 0.97 }}
              className="w-full py-2.5 rounded-lg bg-[#F5B731] hover:bg-[#E5A720] text-[#1A1A1A] font-black text-sm border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] disabled:opacity-50 transition-shadow hover:shadow-[4px_4px_0_#1A1A1A]"
            >
              {COPY_LABEL[copyStatus]}
            </motion.button>

            {copyError && <p className="text-[10px] text-[#F06292] text-center">{copyError}</p>}

            {showAmountInput && !isDone && (
              <p className="text-[10px] text-[#AAAAAA] text-center">
                Executes automatically when this alpha moves · Requires MetaMask Flask
              </p>
            )}
          </div>
        )}

        {/* OWN STRATEGY */}
        {isOwn && (
          <div className="rounded-lg bg-[#FAF6EE] border-2 border-[#D0CFCF] p-3 text-center">
            <p className="text-xs text-[#888888]">
              Your strategy · <span className="font-bold text-[#F5B731]">{strategy.followerCount ?? 0}</span> follower{strategy.followerCount !== 1 ? "s" : ""} auto-copying
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
