import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, base, arbitrum, optimism, polygon } from "wagmi/chains";
import { http } from "wagmi";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;

export const wagmiConfig = getDefaultConfig({
  appName: "TANA-TAN",
  projectId,
  chains: [base, arbitrum, optimism, polygon, mainnet],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
    [arbitrum.id]: http("https://arb1.arbitrum.io/rpc"),
    [optimism.id]: http("https://mainnet.optimism.io"),
    [polygon.id]: http("https://polygon-rpc.com"),
    [mainnet.id]: http("https://eth.llamarpc.com"),
  },
  ssr: true,
});
