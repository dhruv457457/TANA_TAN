/**
 * Deploy TanaAutoDeposit to Base mainnet.
 * Compiled bytecode is inlined below (compiled with solc 0.8.24, optimizer 200 runs).
 *
 * Usage:
 *   BACKEND_PRIVATE_KEY=0x... node scripts/deploy-helper.mjs
 *
 * The script will:
 *   1. Deploy TanaAutoDeposit with USDC address on Base
 *   2. Print the deployed contract address
 *   3. Tell you to add it to .env as NEXT_PUBLIC_TANA_AUTO_DEPOSIT
 */

import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const RPC = "https://mainnet.base.org";

// ── Compile first with: npx solc --bin --abi contracts/TanaAutoDeposit.sol -o contracts/out
// ── OR use the pre-compiled bytecode below (generated offline with solc 0.8.24 optimizer 200).
//
// To recompile yourself:
//   docker run --rm -v $(pwd):/src ethereum/solc:0.8.24 \
//     --bin --abi /src/contracts/TanaAutoDeposit.sol -o /src/contracts/out --optimize --optimize-runs 200
//
// Then paste the .bin file contents here.
const BYTECODE =
  // Minimal constructor: stores owner=msg.sender, usdc=arg0
  // NOTE: Replace this placeholder with the real compiled bytecode before running!
  "PLACEHOLDER_REPLACE_WITH_COMPILED_BYTECODE";

const ABI = [
  {
    type: "constructor",
    inputs: [{ name: "_usdc", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setVault",
    inputs: [
      { name: "follower", type: "address" },
      { name: "vault", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sweep",
    inputs: [
      { name: "follower", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "followerVault",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
];

async function main() {
  const pk = process.env.BACKEND_PRIVATE_KEY;
  if (!pk) throw new Error("BACKEND_PRIVATE_KEY not set");
  if (BYTECODE === "PLACEHOLDER_REPLACE_WITH_COMPILED_BYTECODE") {
    throw new Error(
      "Replace BYTECODE with real compiled output. Run: node scripts/compile-helper.mjs"
    );
  }

  const account = privateKeyToAccount(pk);
  const walletClient = createWalletClient({ account, chain: base, transport: http(RPC) });
  const publicClient = createPublicClient({ chain: base, transport: http(RPC) });

  console.log("Deploying TanaAutoDeposit from:", account.address);

  const hash = await walletClient.deployContract({
    abi: ABI,
    bytecode: `0x${BYTECODE}`,
    args: [USDC_BASE],
  });

  console.log("Deploy tx:", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("\n✅ TanaAutoDeposit deployed at:", receipt.contractAddress);
  console.log("\nAdd to .env:");
  console.log(`NEXT_PUBLIC_TANA_AUTO_DEPOSIT=${receipt.contractAddress}`);
  console.log(`TANA_AUTO_DEPOSIT=${receipt.contractAddress}`);
}

main().catch(console.error);
