"use client";
import { ChatInterface } from "@/components/ChatInterface";
import { PortfolioDashboard } from "@/components/PortfolioDashboard";
import { ConnectButton } from "@/components/ConnectButton";
import { useTanaStore } from "@/store";
import Link from "next/link";

export default function Home() {
  const walletAddress = useTanaStore((s) => s.walletAddress);
  return (
    <div className="flex flex-col h-full min-h-screen bg-black">
      {/* Background gradient mesh */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-violet-800/10 blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-black text-xs">TT</span>
          </div>
          <div>
            <span className="font-black text-white tracking-tight">TANA</span>
            <span className="font-black text-violet-400 tracking-tight">-TAN</span>
          </div>
          <span className="text-[10px] text-white/30 border border-white/10 px-2 py-0.5 rounded-full">
            AI × Earn
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-white/50 hover:text-white/90 transition-colors"
          >
            Dashboard
          </Link>
          <ConnectButton />
        </div>
      </nav>

      {/* Main layout */}
      <div className="relative z-10 flex flex-1 gap-0 overflow-hidden">
        {/* Chat — main area */}
        <div className="flex-1 flex flex-col min-w-0 max-h-[calc(100vh-65px)]">
          <ChatInterface />
        </div>

        {/* Sidebar — portfolio */}
        <div className="hidden lg:flex flex-col w-80 border-l border-white/5 p-4 gap-4 overflow-y-auto">
          <div>
            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
              Active Positions
            </p>
            <PortfolioDashboard address={walletAddress} />
          </div>

          {/* Info cards */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
              Powered by LI.FI
            </p>
            <div className="space-y-2 text-xs text-white/50">
              <div className="flex justify-between">
                <span>Protocols</span>
                <span className="text-white/80">20+</span>
              </div>
              <div className="flex justify-between">
                <span>Chains</span>
                <span className="text-white/80">15+</span>
              </div>
              <div className="flex justify-between">
                <span>Data API</span>
                <span className="text-emerald-400">Live</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="text-xs font-semibold text-violet-400 mb-2">Risk Scoring</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-white/60">Safe — score ≥ 0.7</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-white/60">Balanced — 0.4–0.7</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                <span className="text-white/60">Degen — &lt; 0.4</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
