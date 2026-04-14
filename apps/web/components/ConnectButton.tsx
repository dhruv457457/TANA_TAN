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
    <RainbowConnectButton.Custom>
      {({ account, chain, openConnectModal, openChainModal, openAccountModal, mounted }) => {
        const connected = mounted && account && chain;
        return (
          <div>
            {!connected ? (
              <button
                onClick={openConnectModal}
                className="px-4 py-1.5 rounded-xl bg-[#F5B731] hover:bg-[#E5A720] text-[#1A1A1A] text-xs font-black border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] hover:shadow-[3px_3px_0_#1A1A1A] transition-shadow"
              >
                Connect Wallet
              </button>
            ) : chain.unsupported ? (
              <button
                onClick={openChainModal}
                className="px-4 py-1.5 rounded-xl bg-[#F06292] hover:bg-[#E05282] text-white text-xs font-black border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] transition-shadow"
              >
                Wrong Network
              </button>
            ) : (
              <button
                onClick={openAccountModal}
                className="px-3 py-1.5 rounded-xl border-2 border-[#D0CFCF] hover:border-[#1A1A1A] text-xs font-bold text-[#888888] hover:text-[#1A1A1A] transition-colors"
                title="Wallet options"
              >
                ···
              </button>
            )}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
