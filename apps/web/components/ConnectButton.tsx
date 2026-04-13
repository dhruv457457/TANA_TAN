"use client";
import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useEffect } from "react";
import { useTanaStore } from "@/store";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import { useChainId } from "wagmi";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const setWalletAddress = useTanaStore((s) => s.setWalletAddress);
  const { formatted: usdcBalance } = useUsdcBalance(address, chainId);

  useEffect(() => {
    setWalletAddress(isConnected && address ? address : null);
  }, [isConnected, address, setWalletAddress]);

  return (
    <div className="flex items-center gap-3">
      {isConnected && address && usdcBalance && (
        <span className="text-xs font-bold text-[#888888] font-mono hidden sm:block">
          {usdcBalance}
        </span>
      )}
      <RainbowConnectButton
        showBalance={false}
        chainStatus="none"
        accountStatus="address"
      />
    </div>
  );
}
