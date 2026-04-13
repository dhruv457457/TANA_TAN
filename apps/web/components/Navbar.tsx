"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ConnectButton } from "./ConnectButton";
import { useAccount, useBalance } from "wagmi";

const NAV_LINKS = [
  { href: "/", label: "AI Chat" },
  { href: "/feed", label: "Feed" },
  { href: "/dashboard", label: "Portfolio" },
];

const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as const;

export function Navbar() {
  const pathname = usePathname();
  const { address } = useAccount();
  const { data: usdcBal } = useBalance({
    address,
    token: USDC_BASE,
    query: { enabled: !!address, staleTime: 30_000 },
  });

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative z-10 flex items-center justify-between px-6 py-3.5 border-b-2 border-[#1A1A1A] bg-white shadow-[0_3px_0_#1A1A1A]"
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 group">
        <motion.div
          whileHover={{ rotate: -5, scale: 1.05 }}
          className="w-8 h-8 rounded-lg bg-[#F5B731] border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] flex items-center justify-center"
        >
          <span className="text-[#1A1A1A] font-black text-xs">TT</span>
        </motion.div>
        <div className="flex items-center gap-2">
          <span className="font-black text-[#1A1A1A] tracking-tight font-display">TANA</span>
          <span className="font-black text-[#F5B731] tracking-tight font-display">-TAN</span>
          <span className="hidden sm:inline text-[10px] text-[#888888] border border-[#D0CFCF] px-2 py-0.5 rounded-full">
            AI x Earn
          </span>
        </div>
      </Link>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-1 bg-[#FAF6EE] border-2 border-[#1A1A1A] rounded-xl p-1 shadow-[2px_2px_0_#1A1A1A]">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? "bg-[#F5B731] text-[#1A1A1A] border-2 border-[#1A1A1A] shadow-[1px_1px_0_#1A1A1A]"
                  : "text-[#888888] border-2 border-transparent hover:text-[#1A1A1A] hover:bg-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* USDC Balance */}
        {address && usdcBal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden sm:flex items-center gap-1.5 bg-[#FAF6EE] border-2 border-[#D0CFCF] rounded-lg px-3 py-1.5"
          >
            <div className="w-4 h-4 rounded-full bg-[#2775CA] flex items-center justify-center">
              <span className="text-white text-[7px] font-black">$</span>
            </div>
            <span className="text-xs font-bold text-[#1A1A1A] tabular-nums">
              {parseFloat(usdcBal.formatted).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-[#888888]">USDC</span>
          </motion.div>
        )}
        <ConnectButton />
      </div>
    </motion.nav>
  );
}
