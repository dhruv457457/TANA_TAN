"use client";
import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useEffect } from "react";
import { useTanaStore } from "@/store";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const setWalletAddress = useTanaStore((s) => s.setWalletAddress);

  useEffect(() => {
    setWalletAddress(isConnected && address ? address : null);
  }, [isConnected, address, setWalletAddress]);

  return (
    <RainbowConnectButton
      showBalance={false}
      chainStatus="none"
      accountStatus="address"
    />
  );
}
