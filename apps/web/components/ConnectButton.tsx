"use client";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useEffect, useRef, useState } from "react";
import { useTanaStore } from "@/store";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const setWalletAddress = useTanaStore((s) => s.setWalletAddress);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync address to store safely in effect
  useEffect(() => {
    setWalletAddress(isConnected && address ? address : null);
  }, [isConnected, address, setWalletAddress]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white px-4 py-2 rounded-xl transition-colors font-medium tabular-nums"
      >
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl transition-colors font-medium"
      >
        Connect Wallet
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-zinc-900 shadow-2xl z-[100] overflow-hidden">
          <p className="px-4 pt-3 pb-1 text-xs text-white/30 font-semibold uppercase tracking-wider">
            Choose wallet
          </p>
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              disabled={isPending}
              onClick={() => {
                connect({ connector });
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
