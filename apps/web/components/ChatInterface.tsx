"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChainId } from "wagmi";
import { useVaults } from "@/hooks/useVaults";
import { useTanaStore } from "@/store";
import { parseIntent } from "@/lib/intent";
import { scoreAndLabelVaults, allocate } from "@/lib/scorer";
import { VaultCard } from "./VaultCard";
import { RouteMap } from "./RouteMap";
import type { ChatMessage, AllocationPlan } from "@/types";

const SUGGESTIONS = [
  "Put 500 USDC into the safest stablecoin vaults above 5% APY",
  "I want balanced yield on 1000 USDC across chains",
  "Find me the highest APY for ETH",
  "Safe stablecoin strategy with 200 DAI",
];

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] ${
          isUser
            ? "bg-violet-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5"
            : "bg-white/5 border border-white/10 text-white/90 rounded-2xl rounded-tl-sm px-4 py-2.5"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
      </div>
    </motion.div>
  );
}

export function ChatInterface() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    addMessage,
    setIntent,
    allocations,
    setAllocations,
    showRouteMap,
    setShowRouteMap,
    currentIntent,
  } = useTanaStore();

  const currentChainId = useChainId();
  const { data: allVaults } = useVaults();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, allocations]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      setInput("");
      setIsLoading(true);

      const userMsg: ChatMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      addMessage(userMsg);

      try {
        // Parse intent
        const intent = await parseIntent(text);
        setIntent(intent);

        const SUPPORTED_CHAINS = new Set([1, 8453, 42161, 10, 137]);

        // Determine target chain: user-mentioned chain, or their wallet chain
        const targetChainId = (intent.chainIds && intent.chainIds.length > 0)
          ? intent.chainIds[0]
          : currentChainId;

        const effectiveChain = SUPPORTED_CHAINS.has(targetChainId) ? targetChainId : currentChainId;

        // If the target chain differs from what we have cached, fetch fresh
        let vaults = (allVaults ?? []).filter((v) => v.chainId === effectiveChain);
        if (vaults.length === 0) {
          const params = new URLSearchParams({ sortBy: "apy", chainId: String(effectiveChain) });
          const res = await fetch(`/api/vaults?${params}`);
          if (res.ok) vaults = await res.json();
        }

        // Filter by asset + APY, cap extreme APYs to avoid flash-loan noise
        const filtered = vaults.filter((v) => {
          const assetMatch = v.asset.toUpperCase() === intent.asset.toUpperCase();
          const apyCapped = Math.min(v.apy.total, 2.0);
          return assetMatch && apyCapped >= intent.minApy;
        });
        // Fall back to asset match only if APY filter is too strict
        const pool = filtered.length > 0
          ? filtered
          : vaults.filter((v) => v.asset.toUpperCase() === intent.asset.toUpperCase());
        const scored = scoreAndLabelVaults(pool);

        const plans = allocate(scored, intent.amount, intent.riskTolerance, intent.maxVaults);
        setAllocations(plans);

        const riskMap = { safe: "🟢 Safe", balanced: "🟡 Balanced", degen: "🔴 Degen" };
        const avgApy =
          plans.length > 0
            ? plans.reduce((s, p) => s + p.vault.apy.total * p.percentage, 0) * 100
            : 0;

        const isSingleVault = intent.maxVaults === 1;
        const replyContent =
          plans.length === 0
            ? `No ${intent.asset} vaults found matching your criteria (min APY ${(intent.minApy * 100).toFixed(1)}%, risk: ${intent.riskTolerance}). Try adjusting your requirements.`
            : isSingleVault
            ? `Going all-in on the best vault for $${intent.amount.toLocaleString()} ${intent.asset} — ${riskMap[intent.riskTolerance]} strategy.\n\nAPY: ~${avgApy.toFixed(2)}%\n\nHere's your vault:`
            : `Found ${plans.length} vault${plans.length > 1 ? "s" : ""} for $${intent.amount.toLocaleString()} ${intent.asset} — ${riskMap[intent.riskTolerance]} strategy.\n\nWeighted APY: ~${avgApy.toFixed(2)}%\n\nHere's your optimized allocation:`;

        const assistantMsg: ChatMessage = {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: replyContent,
          intent,
          allocations: plans,
          timestamp: Date.now(),
        };
        addMessage(assistantMsg);
      } catch (err) {
        addMessage({
          id: `${Date.now()}-error`,
          role: "assistant",
          content: "Something went wrong. Please try again.",
          timestamp: Date.now(),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, allVaults, addMessage, setIntent, setAllocations]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-10">
            <div className="text-center">
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                TANA finds the yield.
              </h2>
              <p className="text-white/40 text-sm">
                Tell me what you want to earn. I&apos;ll handle the rest.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-sm text-white/60 hover:text-white/90 px-4 py-3 rounded-xl border border-white/5 hover:border-white/15 bg-white/[0.03] hover:bg-white/[0.06] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <div key={msg.id}>
              <MessageBubble msg={msg} />
              {msg.allocations && msg.allocations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 space-y-3"
                >
                  {msg.allocations.map((plan, i) => (
                    <VaultCard
                      key={plan.vault.address}
                      plan={plan}
                      index={i}
                    />
                  ))}
                  <button
                    onClick={() => setShowRouteMap(!showRouteMap)}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors mt-1"
                  >
                    {showRouteMap ? "Hide" : "Show"} execution route →
                  </button>
                </motion.div>
              )}
            </div>
          ))}
        </AnimatePresence>

        {/* Route map */}
        <AnimatePresence>
          {showRouteMap && allocations.length > 0 && currentIntent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <RouteMap
                allocations={allocations}
                asset={currentIntent.asset}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-violet-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell TANA what yield you want…"
            rows={1}
            className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-colors"
            style={{ minHeight: 48, maxHeight: 120 }}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 8L2 2l2 6-2 6 12-6z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
