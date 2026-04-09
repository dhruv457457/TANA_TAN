/**
 * Compile TanaAutoDeposit.sol using the solc npm package.
 * Usage: node scripts/compile-helper.mjs
 *
 * Output: contracts/TanaAutoDeposit.bytecode (hex, no 0x prefix)
 *         contracts/TanaAutoDeposit.abi.json
 */

import { readFileSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try to load solc — install if missing
let solc;
try {
  solc = require("solc");
} catch {
  console.error("solc not found. Run: npm install --save-dev solc");
  process.exit(1);
}

const contractPath = path.join(__dirname, "../contracts/TanaAutoDeposit.sol");
const source = readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: { "TanaAutoDeposit.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

console.log("Compiling TanaAutoDeposit.sol ...");
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors?.some((e) => e.severity === "error")) {
  console.error("Compilation errors:");
  output.errors.forEach((e) => console.error(e.formattedMessage));
  process.exit(1);
}

const contract = output.contracts["TanaAutoDeposit.sol"]["TanaAutoDeposit"];
const bytecode = contract.evm.bytecode.object;
const abi = contract.abi;

const outDir = path.join(__dirname, "../contracts");
writeFileSync(path.join(outDir, "TanaAutoDeposit.bytecode"), bytecode);
writeFileSync(path.join(outDir, "TanaAutoDeposit.abi.json"), JSON.stringify(abi, null, 2));

console.log("✅ Compiled successfully");
console.log("   Bytecode:", bytecode.slice(0, 40) + "...");
console.log("   ABI entries:", abi.length);
console.log("\nNow run: node scripts/deploy-helper.mjs");
