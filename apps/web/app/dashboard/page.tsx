"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { PortfolioDashboard } from "@/components/PortfolioDashboard";
import { ExecutionHistory } from "@/components/ExecutionHistory";
import { EditProfileModal, type UserProfileData } from "@/components/EditProfileModal";
import { useTanaStore } from "@/store";
import { addressToColor } from "@/lib/protocolLogos";

type PageTab = "portfolio" | "profile";

// ── Avatar helpers ────────────────────────────────────────────────────────────

function UserAvatar({ address, avatarUrl, displayName, size = 72 }: {
  address: string;
  avatarUrl?: string;
  displayName?: string;
  size?: number;
}) {
  const [err, setErr] = useState(false);
  const initials = (displayName || address).slice(0, 2).toUpperCase();
  const bgColor = addressToColor(address);

  if (avatarUrl && !err) {
    return (
      <div style={{ width: size, height: size }} className="rounded-full border-2 border-[#1A1A1A] overflow-hidden shadow-[3px_3px_0_#1A1A1A] shrink-0">
        <Image src={avatarUrl} alt="avatar" width={size} height={size} className="w-full h-full object-cover" onError={() => setErr(true)} unoptimized />
      </div>
    );
  }
  return (
    <div
      style={{ width: size, height: size, backgroundColor: bgColor }}
      className="rounded-full border-2 border-[#1A1A1A] flex items-center justify-center text-white font-black shadow-[3px_3px_0_#1A1A1A] shrink-0"
    >
      <span style={{ fontSize: size * 0.3 }}>{initials}</span>
    </div>
  );
}

function ProtocolMini({ protocol, logoUrl }: { protocol: string; logoUrl: string | null }) {
  const [err, setErr] = useState(false);
  const initials = protocol.replace(/-v\d+$/, "").slice(0, 2).toUpperCase();
  if (logoUrl && !err) {
    return (
      <div className="w-9 h-9 rounded-lg border-2 border-[#1A1A1A] overflow-hidden shrink-0">
        <Image src={logoUrl} alt={protocol} width={36} height={36} className="object-cover w-full h-full" onError={() => setErr(true)} unoptimized />
      </div>
    );
  }
  return (
    <div style={{ backgroundColor: addressToColor(protocol) }} className="w-9 h-9 rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center text-white font-black text-xs shrink-0">
      {initials}
    </div>
  );
}

// ── Profile Section ───────────────────────────────────────────────────────────

function ProfileSection({ address, isOwn }: { address: string; isOwn: boolean }) {
  const [data, setData] = useState<{
    profile: UserProfileData | null;
    strategies: { _id: string; vaultName: string; protocol: string; chainName: string; apy: number; followerCount: number; protocolLogoUri?: string }[];
    followingCount: number;
    followersCount: number;
    followingStrategies: { _id: string; protocol: string; vaultName: string; chainName: string; apy: number; protocolLogoUri?: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/profile/${address}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [address]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-36 rounded-xl bg-white border-2 border-[#D0CFCF] animate-pulse" />
        {[0, 1].map((i) => <div key={i} className="h-16 rounded-xl bg-white border-2 border-[#D0CFCF] animate-pulse" />)}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border-2 border-[#D0CFCF] bg-[#FAF6EE] p-6 text-center text-sm text-[#888888]">
        Could not load profile data.
      </div>
    );
  }

  const profile = data.profile;
  const shortAddr = `${address.slice(0, 6)}…${address.slice(-4)}`;

  return (
    <div className="space-y-6">
      {/* ── Profile header card ── */}
      <div className="rounded-xl border-2 border-[#1A1A1A] bg-white p-5 shadow-[3px_3px_0_#1A1A1A]">
        <div className="flex items-start gap-4">
          <UserAvatar
            address={address}
            avatarUrl={profile?.avatarUrl}
            displayName={profile?.displayName}
            size={72}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-lg font-black text-[#1A1A1A] font-display truncate">
                  {profile?.displayName || shortAddr}
                </h2>
                <p className="text-xs text-[#888888] font-mono">{shortAddr}</p>
              </div>
              {isOwn && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="shrink-0 px-3 py-1.5 rounded-lg border-2 border-[#1A1A1A] text-xs font-bold text-[#1A1A1A] hover:bg-[#F5B731] hover:shadow-[2px_2px_0_#1A1A1A] transition-all"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="text-sm text-[#444444] mt-2 leading-relaxed">{profile.bio}</p>
            )}
            {isOwn && !profile?.bio && (
              <p className="text-xs text-[#AAAAAA] mt-2 italic">
                No bio yet —{" "}
                <button onClick={() => setEditOpen(true)} className="text-[#2F7EE5] hover:underline not-italic">add one</button>
              </p>
            )}

            {/* Social links */}
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              {profile?.twitterHandle && (
                <a
                  href={`https://twitter.com/${profile.twitterHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-[#2F7EE5] hover:underline"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
                  </svg>
                  @{profile.twitterHandle}
                </a>
              )}
              {profile?.websiteUrl && (
                <a
                  href={profile.websiteUrl.startsWith("http") ? profile.websiteUrl : `https://${profile.websiteUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-[#888888] hover:text-[#1A1A1A]"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                  </svg>
                  {profile.websiteUrl.replace(/^https?:\/\//, "").slice(0, 30)}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t-2 border-[#F5F5F5]">
          {[
            { label: "Strategies", value: data.strategies.length },
            { label: "Following", value: data.followingCount },
            { label: "Followers", value: data.followersCount },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-xl font-black text-[#1A1A1A] font-display">{stat.value}</p>
              <p className="text-[11px] text-[#888888]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Posted strategies ── */}
      <div>
        <h3 className="text-sm font-bold text-[#1A1A1A] mb-3 font-display">
          {isOwn ? "My Posted Strategies" : "Posted Strategies"}
        </h3>
        {data.strategies.length === 0 ? (
          <div className="rounded-xl border-2 border-[#D0CFCF] bg-[#FAF6EE] p-5 text-center">
            <p className="text-sm text-[#888888]">No strategies posted yet.</p>
            {isOwn && (
              <Link href="/" className="text-xs text-[#2F7EE5] hover:underline mt-1 block">
                Use AI chat to find a vault → post it
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {data.strategies.map((s) => (
              <div key={s._id} className="flex items-center gap-3 p-3 rounded-xl border-2 border-[#1A1A1A] bg-white shadow-[2px_2px_0_#1A1A1A]">
                <ProtocolMini protocol={s.protocol} logoUrl={s.protocolLogoUri ?? null} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1A1A1A] truncate">{s.vaultName || s.protocol}</p>
                  <p className="text-xs text-[#888888]">{s.chainName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-[#4CAF82]">{((s.apy ?? 0) * 100).toFixed(2)}%</p>
                  <p className="text-[10px] text-[#F5B731]">{s.followerCount ?? 0} followers</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Strategies I follow ── */}
      {data.followingStrategies.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[#1A1A1A] mb-3 font-display">Strategies I Follow</h3>
          <div className="space-y-2">
            {data.followingStrategies.map((s) => (
              <div key={String(s._id)} className="flex items-center gap-3 p-3 rounded-xl border-2 border-[#F5B731] bg-white shadow-[2px_2px_0_#F5B731]">
                <ProtocolMini protocol={s.protocol} logoUrl={s.protocolLogoUri ?? null} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1A1A1A] truncate">{s.vaultName || s.protocol}</p>
                  <p className="text-xs text-[#888888]">{s.chainName}</p>
                </div>
                <p className="text-sm font-black text-[#4CAF82] shrink-0">{((s.apy ?? 0) * 100).toFixed(2)}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit profile modal */}
      {editOpen && (
        <EditProfileModal
          address={address}
          current={profile ?? {}}
          onClose={() => setEditOpen(false)}
          onSaved={(saved) => {
            setData((prev) => prev ? { ...prev, profile: saved } : prev);
          }}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { address: connectedAddress } = useAccount();
  const walletAddress = useTanaStore((s) => s.walletAddress);
  const [inputAddr, setInputAddr] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const [tab, setTab] = useState<PageTab>("portfolio");

  useEffect(() => {
    const addr = connectedAddress ?? walletAddress;
    if (addr) { setAddress(addr); setInputAddr(addr); }
  }, [connectedAddress, walletAddress]);

  const handleLoad = () => {
    const trimmed = inputAddr.trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) setAddress(trimmed);
  };

  const isOwnWallet = !!(connectedAddress && address?.toLowerCase() === connectedAddress.toLowerCase());

  return (
    <div className="min-h-screen bg-[#FAF6EE]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#F5B731]/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#4CAF82]/5 blur-3xl" />
      </div>

      <Navbar />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">

        {/* Header + address input */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-black text-[#1A1A1A] mb-4 font-display">
            {isOwnWallet ? "My Profile & Portfolio" : "Trader Profile"}
          </h1>
          <div className="flex gap-3">
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
                title="Refresh"
              >
                ↻
              </button>
            )}
          </div>
        </motion.div>

        {/* Tab switcher */}
        {address && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1 bg-white border-2 border-[#1A1A1A] rounded-xl p-1 shadow-[2px_2px_0_#1A1A1A] mb-6 w-fit">
            {(["portfolio", "profile"] as PageTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all border-2 capitalize ${
                  tab === t
                    ? "bg-[#F5B731] text-[#1A1A1A] border-[#1A1A1A] shadow-[1px_1px_0_#1A1A1A]"
                    : "text-[#888888] border-transparent hover:text-[#1A1A1A] hover:bg-[#FAF6EE]"
                }`}
              >
                {t === "portfolio" ? "Portfolio" : "Profile & Social"}
              </button>
            ))}
          </motion.div>
        )}

        {/* Tab content */}
        {!address ? (
          <div className="rounded-xl border-2 border-[#D0CFCF] bg-white p-10 text-center">
            <p className="text-[#888888]">Connect wallet or enter an address above</p>
          </div>
        ) : tab === "portfolio" ? (
          <div className="space-y-8">
            <PortfolioDashboard address={address} />
            <ExecutionHistory address={address} />
          </div>
        ) : (
          <ProfileSection address={address} isOwn={isOwnWallet} />
        )}
      </div>
    </div>
  );
}
