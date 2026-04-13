"use client";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useExecute } from "@/hooks/useExecute";
import { useWithdraw } from "@/hooks/useWithdraw";
import type { Vault } from "@/types";

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism", 137: "Polygon",
};

// Fetch all vaults from all chains
async function fetchAllVaults(): Promise<Vault[]> {
  const res = await fetch("/api/vaults?limit=100");
  if (!res.ok) return [];
  return res.json();
}

const RISK_STYLE: Record<string, string> = {
  Safe: "border-[#4CAF82] text-[#4CAF82]",
  Balanced: "border-[#F5B731] text-[#1A1A1A]",
  Degen: "border-[#F06292] text-[#F06292]",
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ManualDepositWithdraw({ isOpen, onClose }: Props) {
  const { address, isConnected } = useAccount();
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"select" | "amount" | "confirm">("select");
  const [searchQuery, setSearchQuery] = useState("");
  const [chainFilter, setChainFilter] = useState<string>("all");

  // Fetch all vaults from all chains for the manual modal
  const { data: allVaults, isLoading: isLoadingVaults } = useQuery({
    queryKey: ["vaults-all"],
    queryFn: fetchAllVaults,
    staleTime: 60_000,
    enabled: isOpen,
  });

  const { execute, status: depositStatus, txHash, error: depositError, reset: resetExecute } = useExecute();
  const { withdraw, status: withdrawStatus, error: withdrawError, reset: resetWithdraw } = useWithdraw();

  useEffect(() => {
    if (!isOpen) {
      setStep("select");
      setSelectedVault(null);
      setAmount("");
      setSearchQuery("");
      setChainFilter("all");
      resetExecute();
      resetWithdraw();
    }
  }, [isOpen, resetExecute, resetWithdraw]);

  const isDone = depositStatus === "done" || withdrawStatus === "done";
  const isLoading = depositStatus !== "idle" && depositStatus !== "done" && depositStatus !== "error" ||
                     withdrawStatus !== "idle" && withdrawStatus !== "done" && withdrawStatus !== "error";

  // Filter and search vaults
  const filteredVaults = useMemo(() => {
    let filtered = (allVaults ?? []).filter((v) => v.isTransactional !== false);
    
    // Chain filter
    if (chainFilter !== "all") {
      filtered = filtered.filter((v) => v.chainId === parseInt(chainFilter));
    }
    
    // Search filter - search by protocol, name, or token address
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((v) =>
        v.protocol.toLowerCase().includes(query) ||
        v.name.toLowerCase().includes(query) ||
        v.address.toLowerCase().includes(query) ||
        v.asset.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [allVaults, chainFilter, searchQuery]);

  async function handleDeposit() {
    if (!selectedVault || !amount || !address) return;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    await execute({
      vault: selectedVault,
      percentage: 1,
      amount: amountNum,
    });
  }

  async function handleWithdraw() {
    if (!selectedVault || !amount || !address) return;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    await withdraw({
      vaultAddress: selectedVault.address,
      chainId: selectedVault.chainId,
      amount,
      userAddress: address,
    });
  }

  function handleDone() {
    onClose();
  }

  function handleReset() {
    if (mode === "deposit") resetExecute();
    else resetWithdraw();
    setStep("amount");
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl border-2 border-[#1A1A1A] bg-white shadow-[5px_5px_0_#1A1A1A] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-[#1A1A1A] font-display">
                {mode === "deposit" ? "Deposit" : "Withdraw"}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-[#FAF6EE] border border-[#D0CFCF] flex items-center justify-center text-[#888888] hover:text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setMode("deposit"); setStep("select"); setSelectedVault(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                  mode === "deposit"
                    ? "bg-[#F5B731] border-[#1A1A1A] text-[#1A1A1A]"
                    : "bg-white border-[#D0CFCF] text-[#888888] hover:border-[#1A1A1A]"
                }`}
              >
                Deposit
              </button>
              <button
                onClick={() => { setMode("withdraw"); setStep("select"); setSelectedVault(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                  mode === "withdraw"
                    ? "bg-[#F06292] border-[#1A1A1A] text-white"
                    : "bg-white border-[#D0CFCF] text-[#888888] hover:border-[#1A1A1A]"
                }`}
              >
                Withdraw
              </button>
            </div>

            {/* Step: Select Vault */}
            {step === "select" && (
              <div className="space-y-3">
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by protocol, name, or token address..."
                    className="w-full bg-white border-2 border-[#1A1A1A] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#888888] focus:outline-none focus:shadow-[3px_3px_0_#F5B731]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#1A1A1A] text-white text-xs flex items-center justify-center hover:bg-[#F06292]"
                    >
                      x
                    </button>
                  )}
                </div>

                {/* Chain Filter */}
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={() => setChainFilter("all")}
                    className={`px-2 py-1 rounded text-xs font-bold border-2 ${
                      chainFilter === "all"
                        ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                        : "bg-white text-[#888888] border-[#D0CFCF] hover:border-[#1A1A1A]"
                    }`}
                  >
                    All
                  </button>
                  {Object.entries(CHAIN_NAMES).map(([id, name]) => (
                    <button
                      key={id}
                      onClick={() => setChainFilter(id)}
                      className={`px-2 py-1 rounded text-xs font-bold border-2 ${
                        chainFilter === id
                          ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                          : "bg-white text-[#888888] border-[#D0CFCF] hover:border-[#1A1A1A]"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-[#888888]">
                  {mode === "deposit" ? "Select a vault to deposit into:" : "Select a vault to withdraw from:"}
                  <span className="ml-1">({filteredVaults.length} vaults)</span>
                </p>
                
                {isLoadingVaults ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-16 rounded-xl bg-[#FAF6EE] border-2 border-[#D0CFCF] animate-pulse" />
                    ))}
                  </div>
                ) : filteredVaults.length === 0 ? (
                  <p className="text-sm text-[#888888] text-center py-4">
                    {searchQuery ? "No vaults match your search" : "No vaults available"}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredVaults.map((vault) => (
                      <button
                        key={vault.address}
                        onClick={() => { setSelectedVault(vault); setStep("amount"); }}
                        className="w-full p-3 rounded-xl border-2 border-[#1A1A1A] bg-[#FAF6EE] hover:bg-[#F5B731] hover:shadow-[2px_2px_0_#1A1A1A] transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          {/* Protocol Logo */}
                          {vault.protocolLogoUri ? (
                            <img
                              src={vault.protocolLogoUri}
                              alt={vault.protocol}
                              className="w-8 h-8 rounded-lg border border-[#1A1A1A] object-contain bg-white shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[#F5B731] flex items-center justify-center text-[#1A1A1A] font-black text-xs border border-[#1A1A1A] shrink-0">
                              {vault.protocol.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#1A1A1A] truncate">{vault.name}</p>
                            <p className="text-xs text-[#888888]">{vault.chainName} · {vault.protocol}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-black text-[#4CAF82]">{((vault.apy.total * 100)).toFixed(2)}%</p>
                            <p className="text-xs text-[#888888]">${(vault.tvl.usd / 1_000_000).toFixed(1)}M</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step: Enter Amount */}
            {step === "amount" && selectedVault && !isDone && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl border-2 border-[#1A1A1A] bg-[#FAF6EE]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#1A1A1A]">{selectedVault.name}</p>
                      <p className="text-xs text-[#888888]">{selectedVault.chainName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-[#4CAF82]">{((selectedVault.apy.total * 100)).toFixed(2)}% APY</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#888888] mb-1 block">Amount (USDC)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white border-2 border-[#1A1A1A] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:shadow-[3px_3px_0_#F5B731]"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep("select")}
                    className="flex-1 py-2 rounded-lg bg-[#FAF6EE] border-2 border-[#D0CFCF] text-sm font-bold text-[#888888] hover:border-[#1A1A1A]"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep("confirm")}
                    disabled={!amount || parseFloat(amount) <= 0}
                    className="flex-1 py-2 rounded-lg bg-[#F5B731] border-2 border-[#1A1A1A] text-sm font-black text-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step: Confirm */}
            {step === "confirm" && selectedVault && !isDone && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border-2 border-[#1A1A1A] bg-[#FAF6EE]">
                  <p className="text-xs text-[#888888] mb-2">Confirm {mode}</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#1A1A1A]">Vault</span>
                    <span className="text-sm font-bold text-[#1A1A1A]">{selectedVault.name}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#1A1A1A]">Amount</span>
                    <span className="text-sm font-black text-[#1A1A1A]">${parseFloat(amount || "0").toLocaleString()} USDC</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#1A1A1A]">Expected APY</span>
                    <span className="text-sm font-black text-[#4CAF82]">{((selectedVault.apy.total * 100)).toFixed(2)}%</span>
                  </div>
                </div>

                {depositError && (
                  <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#F06292]">
                    <p className="text-xs text-[#F06292]">{depositError}</p>
                  </div>
                )}
                {withdrawError && (
                  <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#F06292]">
                    <p className="text-xs text-[#F06292]">{withdrawError}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep("amount")}
                    disabled={isLoading}
                    className="flex-1 py-2 rounded-lg bg-[#FAF6EE] border-2 border-[#D0CFCF] text-sm font-bold text-[#888888] hover:border-[#1A1A1A] disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={mode === "deposit" ? handleDeposit : handleWithdraw}
                    disabled={isLoading}
                    className="flex-1 py-2 rounded-lg bg-[#F5B731] border-2 border-[#1A1A1A] text-sm font-black text-[#1A1A1A] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        {mode === "deposit" 
                          ? (depositStatus === "switching" ? "Switching chain..." : 
                             depositStatus === "quoting" ? "Getting quote..." : 
                             depositStatus === "approving" ? "Approving..." : "Depositing...")
                          : (withdrawStatus === "quoting" ? "Getting quote..." : "Withdrawing...")
                        }
                      </>
                    ) : (
                      mode === "deposit" ? "Deposit Now" : "Withdraw Now"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Done State */}
            {isDone && (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#4CAF82] flex items-center justify-center">
                  <span className="text-3xl text-white">✓</span>
                </div>
                <p className="text-lg font-black text-[#1A1A1A] mb-2">
                  {mode === "deposit" ? "Deposited!" : "Withdrawn!"}
                </p>
                {txHash && (
                  <a
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#2F7EE5] hover:underline"
                  >
                    View on Explorer →
                  </a>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-2 rounded-lg bg-[#FAF6EE] border-2 border-[#D0CFCF] text-sm font-bold text-[#888888] hover:border-[#1A1A1A]"
                  >
                    {mode === "deposit" ? "Deposit More" : "Withdraw More"}
                  </button>
                  <button
                    onClick={handleDone}
                    className="flex-1 py-2 rounded-lg bg-[#F5B731] border-2 border-[#1A1A1A] text-sm font-black text-[#1A1A1A]"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}