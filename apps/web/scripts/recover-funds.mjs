import { createWalletClient, createPublicClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

import path from "path";
import { fileURLToPath } from "url";

// Load .env from the root


// Configuration
const CONTRACT_ADDRESS = process.env.TANA_AUTO_DEPOSIT ?? process.env.NEXT_PUBLIC_TANA_AUTO_DEPOSIT;
const USDC_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const RECIPIENT = "0x8dd782e70683Eec48B0c4c8081c5a365598dD2Ab"; // follower — return stuck USDC
const AMOUNT = "0.01";

const ABI = [
  {
    type: "function",
    name: "recover",
    inputs: [
      { name: "token", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

async function main() {
  const pk = process.env.BACKEND_PRIVATE_KEY;
  if (!pk) {
    console.error("❌ BACKEND_PRIVATE_KEY missing in .env");
    process.exit(1);
  }
  if (!CONTRACT_ADDRESS) {
    console.error("❌ TANA_AUTO_DEPOSIT missing in .env");
    process.exit(1);
  }

  const account = privateKeyToAccount(pk);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http("https://mainnet.base.org"),
  });
  const publicClient = createPublicClient({
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  console.log(`🚀 Calling recover on ${CONTRACT_ADDRESS}...`);
  console.log(`💰 Sending ${AMOUNT} USDC to ${RECIPIENT}`);

  try {
    const { request } = await publicClient.simulateContract({
      account,
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "recover",
      args: [USDC_ADDRESS, RECIPIENT, parseUnits(AMOUNT, 6)],
    });

    const hash = await walletClient.writeContract(request);

    console.log("✅ Transaction sent! Hash:", hash);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("🎊 Recovery Successful!");
  } catch (error) {
    console.error("❌ Recovery failed:", error.message);
  }
}

main();