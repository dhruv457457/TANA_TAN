"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChatInterface } from "@/components/ChatInterface";
import { PortfolioDashboard } from "@/components/PortfolioDashboard";
import { Navbar } from "@/components/Navbar";
import { ConnectButton } from "@/components/ConnectButton";
import { useTanaStore } from "@/store";
import { useAccount } from "wagmi";
import { useRef } from "react";

const FEATURES = [
  {
    icon: "\u{1F9E0}",
    title: "AI Vault Discovery",
    desc: "Chat with TANA in plain English. Find the best yield across 672+ vaults instantly.",
    color: "#2F7EE5",
    tag: "Powered by Claude",
  },
  {
    icon: "\u{1F4CB}",
    title: "1-Click Copy Trading",
    desc: "Grant permission once. Backend auto-executes every time your alpha moves funds.",
    color: "#F5B731",
    tag: "ERC-7715",
  },
  {
    icon: "\u{1F517}",
    title: "Cross-Chain Yield",
    desc: "Deploy across 15+ chains. Ethereum, Base, Arbitrum, Optimism \u2014 all in one click.",
    color: "#4CAF82",
    tag: "LI.FI Composer",
  },
  {
    icon: "\u26A1",
    title: "LI.FI Earn Powered",
    desc: "Real-time APY, TVL, portfolio tracking. 20+ protocols unified under one API.",
    color: "#F06292",
    tag: "Live Data",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Ask TANA", desc: "Tell me what you want \u2014 'safe USDC vaults above 5% on Base'" },
  { step: "02", title: "Pick a Strategy", desc: "Choose a vault or copy an alpha\u2019s live strategy from the feed" },
  { step: "03", title: "Watch it Earn", desc: "Funds deploy automatically. Every move they make, you follow." },
];

const STATS = [
  { num: "672+", label: "Vaults", color: "#F5B731" },
  { num: "20+", label: "Protocols", color: "#4CAF82" },
  { num: "15+", label: "Chains", color: "#2F7EE5" },
  { num: "24/7", label: "Auto-Execute", color: "#F06292" },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

function LandingPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: scrollRef, offset: ["start start", "end end"] });
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.97]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.6]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
      {/* Hero */}
      <motion.section
        style={{ scale: heroScale, opacity: heroOpacity }}
        className="relative flex flex-col items-center justify-center px-6 pt-20 pb-16 max-w-5xl mx-auto w-full"
      >
        {/* Floating decorations */}
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          className="absolute top-10 left-10 w-16 h-16 rounded-xl bg-[#F5B731] border-2 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] opacity-20 hidden lg:block"
        />
        <motion.div
          animate={{ y: [0, 10, 0], rotate: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
          className="absolute top-32 right-16 w-10 h-10 rounded-full bg-[#4CAF82] border-2 border-[#1A1A1A] opacity-20 hidden lg:block"
        />
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-20 left-20 w-12 h-12 rounded-lg bg-[#2F7EE5] border-2 border-[#1A1A1A] opacity-15 hidden lg:block"
        />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 150, damping: 20 }}
          className="inline-flex items-center gap-2 bg-white border-2 border-[#1A1A1A] rounded-full px-5 py-2.5 mb-8 shadow-[3px_3px_0_#1A1A1A]"
        >
          <div className="w-5 h-5 rounded bg-[#F5B731] border border-[#1A1A1A] flex items-center justify-center">
            <span className="text-[8px] text-[#1A1A1A] font-black">TT</span>
          </div>
          <span className="text-xs font-bold text-[#888888]">Social Copy-Yield Platform</span>
          <span className="text-[10px] bg-[#4CAF82] text-white px-2 py-0.5 rounded-full font-bold">Live</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="text-5xl md:text-7xl font-black text-[#1A1A1A] font-display tracking-tight mb-5 leading-[1.1] text-center"
        >
          TANA finds the yield.
          <br />
          <span className="relative">
            <span className="text-[#F5B731]">TAN</span>
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.8, duration: 0.4 }}
              className="absolute -bottom-1 left-0 h-1 bg-[#F5B731] rounded-full"
            />
          </span>{" "}
          executes it.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-lg md:text-xl text-[#888888] max-w-xl mx-auto mb-10 text-center leading-relaxed"
        >
          Social copy-trading for DeFi. Grant permission once.
          Auto-follow alpha strategies across 15+ chains.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="flex flex-col sm:flex-row gap-3 items-center"
        >
          <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
            <ConnectButton />
          </motion.div>
          <motion.a
            href="/feed"
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="px-6 py-3 rounded-xl bg-white border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] text-sm font-bold text-[#1A1A1A] hover:shadow-[5px_5px_0_#1A1A1A] transition-shadow"
          >
            Browse Strategies \u2192
          </motion.a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-16"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex flex-col items-center gap-1 text-[#888888]"
          >
            <span className="text-[10px] uppercase tracking-widest">Scroll</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Stats */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={stagger}
        className="px-6 pb-20 max-w-4xl mx-auto"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="bg-white border-2 border-[#1A1A1A] rounded-xl p-5 text-center shadow-[3px_3px_0_#1A1A1A] hover:shadow-[6px_6px_0_#1A1A1A] transition-shadow"
            >
              <p className="text-3xl font-black font-display tabular-nums" style={{ color: s.color }}>{s.num}</p>
              <p className="text-xs text-[#888888] mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* How it works */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={stagger}
        className="px-6 pb-20 max-w-4xl mx-auto"
      >
        <motion.h2
          variants={fadeUp}
          className="text-3xl font-black text-[#1A1A1A] font-display text-center mb-10"
        >
          How it works
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((item) => (
            <motion.div
              key={item.step}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              className="bg-white border-2 border-[#1A1A1A] rounded-xl p-6 shadow-[3px_3px_0_#1A1A1A] hover:shadow-[6px_6px_0_#F5B731] transition-shadow relative"
            >
              <div className="absolute -top-4 -left-3 w-9 h-9 rounded-lg bg-[#F5B731] border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] flex items-center justify-center">
                <span className="text-sm font-black text-[#1A1A1A] font-display">{item.step}</span>
              </div>
              <h3 className="font-bold text-[#1A1A1A] font-display text-lg mt-3 mb-2">{item.title}</h3>
              <p className="text-sm text-[#888888] leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Features */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={stagger}
        className="px-6 pb-20 max-w-4xl mx-auto"
      >
        <motion.h2
          variants={fadeUp}
          className="text-3xl font-black text-[#1A1A1A] font-display text-center mb-10"
        >
          Everything you need
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="bg-white border-2 border-[#1A1A1A] rounded-xl p-6 shadow-[3px_3px_0_#1A1A1A] hover:shadow-[6px_6px_0_#1A1A1A] transition-shadow flex items-start gap-4"
            >
              <div
                className="w-12 h-12 rounded-xl border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] flex items-center justify-center text-2xl shrink-0"
                style={{ background: f.color }}
              >
                {f.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-[#1A1A1A] font-display">{f.title}</h3>
                  <span className="text-[9px] bg-[#FAF6EE] border border-[#D0CFCF] px-1.5 py-0.5 rounded text-[#888888]">
                    {f.tag}
                  </span>
                </div>
                <p className="text-sm text-[#888888] leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="px-6 pb-24 text-center"
      >
        <motion.div variants={fadeUp} className="max-w-md mx-auto">
          <p className="text-2xl font-black text-[#1A1A1A] font-display mb-3">
            Ready to find your yield?
          </p>
          <p className="text-sm text-[#888888] mb-6">
            Connect your wallet and start earning in under 30 seconds.
          </p>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <ConnectButton />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t-2 border-[#1A1A1A] bg-white px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#F5B731] border border-[#1A1A1A] flex items-center justify-center">
              <span className="text-[7px] text-[#1A1A1A] font-black">TT</span>
            </div>
            <span className="text-sm font-bold text-[#1A1A1A] font-display">TANA-TAN</span>
            <span className="text-xs text-[#888888]">\u00b7 Built for LI.FI DeFi Mullet Hackathon</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#888888]">
            <span>Powered by <span className="font-bold text-[#1A1A1A]">LI.FI Earn</span></span>
            <span>\u00b7</span>
            <span>MetaMask Delegation</span>
            <span>\u00b7</span>
            <span>ERC-7715</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  const { address } = useAccount();
  const storeAddress = useTanaStore((s) => s.walletAddress);
  const walletAddress = address ?? storeAddress;
  const isConnected = !!walletAddress;

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#FAF6EE]">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#F5B731]/10 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full bg-[#4CAF82]/5 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-[#F5B731]/5 blur-3xl" />
      </div>

      <Navbar />

      {isConnected ? (
        <div className="relative z-10 flex flex-1 gap-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 max-h-[calc(100vh-57px)]">
            <ChatInterface />
          </div>
          <div className="hidden lg:flex flex-col w-80 border-l-2 border-[#D0CFCF] p-4 gap-4 overflow-y-auto">
            <div>
              <p className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-3">
                Active Positions
              </p>
              <PortfolioDashboard address={walletAddress} />
            </div>
            <div className="rounded-xl border-2 border-[#1A1A1A] bg-white p-4 shadow-[3px_3px_0_#1A1A1A]">
              <p className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-3">
                Powered by LI.FI
              </p>
              <div className="space-y-2 text-xs text-[#888888]">
                <div className="flex justify-between"><span>Protocols</span><span className="text-[#1A1A1A] font-bold">20+</span></div>
                <div className="flex justify-between"><span>Chains</span><span className="text-[#1A1A1A] font-bold">15+</span></div>
                <div className="flex justify-between"><span>Data API</span><span className="text-[#4CAF82] font-bold">Live</span></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <LandingPage />
      )}
    </div>
  );
}
