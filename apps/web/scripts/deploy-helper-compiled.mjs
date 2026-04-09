import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envPath = path.join(__dirname, "../.env");
const envContent = readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
}

const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const bytecodeHex = readFileSync(path.join(__dirname, "../contracts/TanaAutoDeposit.bytecode"), "utf8").trim();

const ABI = [
  { type: "constructor", inputs: [{ name: "_usdc", type: "address" }], stateMutability: "nonpayable" },
  { type: "function", name: "setVault", inputs: [{ name: "follower", type: "address" }, { name: "vault", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "sweep", inputs: [{ name: "follower", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "shares", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "followerVault", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "owner", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
];

const pk = process.env.BACKEND_PRIVATE_KEY;
if (!pk) { console.error("BACKEND_PRIVATE_KEY not set"); process.exit(1); }

const account = privateKeyToAccount(pk);
const walletClient = createWalletClient({ account, chain: base, transport: http("https://mainnet.base.org") });
const publicClient = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });

console.log("Deploying TanaAutoDeposit from:", account.address);

const hash = await walletClient.deployContract({
  abi: ABI,
  bytecode: `0x${bytecodeHex}`,
  args: [USDC_BASE],
});

console.log("Deploy tx:", hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("\n✅ TanaAutoDeposit deployed at:", receipt.contractAddress);
console.log("\nAdd to .env:");
console.log(`NEXT_PUBLIC_TANA_AUTO_DEPOSIT=${receipt.contractAddress}`);
console.log(`TANA_AUTO_DEPOSIT=${receipt.contractAddress}`);
