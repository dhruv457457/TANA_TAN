You are an expert Web3 Full-Stack Developer helping me win the LI.FI "DeFi Mullet" Hackathon. 

I am building a Next.js App Router application called "TANA-TAN". It is a Social Cross-Chain Yield platform where users can post their DeFi yield strategies, and other users can 1-click "Copy" them. When the Alpha strategist moves their funds, a Node.js backend automatically migrates the followers' funds using LI.FI Composer.

**CRITICAL ARCHITECTURE RULE: STRICTLY NO PIMLICO OR ERC-4337 BUNDLERS.**

To achieve a gasless, frictionless UX without the overhead of paymasters, we are using the **MetaMask Smart Accounts Kit (ERC-7715 & ERC-7710)** with a "Meta-Transaction Relayer" model.

1. The Follower (Delegator) uses MetaMask Advanced Permissions (ERC-7715) to grant a `FunctionCall` scope to our Node.js backend.

2. The Node.js Backend (Delegate) acts as a standard EOA wallet (using a private key). It pays its own L2 gas (e.g., Base/Arbitrum) to broadcast the transaction.

3. The Backend uses Viem's `createWalletClient` extended with `erc7710WalletActions` to call `sendTransactionWithDelegation`. 

**TECH STACK:**

- Next.js (App Router), React, Tailwind, Framer Motion

- Wagmi, Viem

- MetaMask Smart Accounts Kit (`@metamask/smart-accounts-kit`)

- MongoDB (Mongoose) for backend storage

- LI.FI Earn API & Composer API

**THE FEATURES I NEED CODE FOR:**

**1. MongoDB Database Schema (Mongoose)**

Please write the Mongoose models for:

- `Strategy`: Represents a post on the social feed. Fields: `author` (0x address), `vaultAddress`, `chainId`, `protocol`, `content/pitch`, `apy`.

- `Delegation`: Saves the ERC-7715 permission. Fields: `followerAddress`, `strategyId`, `permissionContext` (Hex string), `delegationManager` (Address), `expiry`, `isActive` (boolean).

**2. The Frontend: "Copy Strategy" Flow (ERC-7715)**

Write the React component/hook for the Follower. When they click "Copy", it should:

- Use `walletClient.requestExecutionPermissions` (extended with `erc7715ProviderActions`).

- Request a `FunctionCall` scope targeting the LI.FI Diamond contract and the USDC contract.

- Allow `approve` and the LI.FI swap execution selectors.

- POST the returned `context` and `delegationManager` to a Next.js API route (`/api/delegations`) to save in MongoDB.

**3. The Backend: Auto-Execution Relayer (Node.js EOA)**

Write the Next.js API route (e.g., `/api/execute-strategy`) that acts as the automated relayer. It should:

- Fetch all active `Delegations` from MongoDB for a specific strategy.

- Fetch a swap quote from the LI.FI Composer API (`https://li.quest/v1/quote`).

- Initialize a Viem `WalletClient` using a backend private key EOA, extended with `erc7710WalletActions`.

- Loop through the followers and execute `serverWalletClient.sendTransactionWithDelegation({ to: lifiContract, data: lifiQuoteData, permissionsContext: savedContext, delegationManager: savedManager })`.

Please provide production-ready, clean TypeScript code for these three pillars, ensuring all Viem and MetaMask Smart Accounts Kit imports are correct. this is my idea llm chat so now you can understand what i want to do---
name: smart-accounts-kit
description: Web3 development using MetaMask Smart Accounts Kit. Use when the user wants to build dApps with ERC-4337 smart accounts, send user operations, batch transactions, configure signers (EOA, passkey, multisig), implement gas abstraction with paymasters, create delegations, or request advanced permissions (ERC-7715). Supports Viem integration, multiple signer types (Dynamic, Web3Auth, Wagmi), gasless transactions, and the Delegation Framework.
metadata: {"openclaw":{"emoji":"🦊","homepage":"https://docs.metamask.io/smart-accounts-kit"}}
---
## Quick Reference

This skill file provides quick access to the MetaMask Smart Accounts Kit v0.3.0. For detailed information, refer to the specific reference files.

**📚 Detailed References:**

- [Smart Accounts Reference](./references/smart-accounts.md) - Account creation, implementations, signers
- [Delegations Reference](./references/delegations.md) - Delegation lifecycle, scopes, caveats
- [Advanced Permissions Reference](./references/advanced-permissions.md) - ERC-7715 permissions via MetaMask

## Package Installation

```bash
npm install @metamask/smart-accounts-kit@0.3.0
```

For custom caveat enforcers:

```bash
forge install metamask/delegation-framework@v1.3.0
```

## Core Concepts Summary

### 1. Smart Accounts (ERC-4337)

Three implementation types:

| Implementation | Best For | Key Feature |
|---------------|----------|-------------|
| **Hybrid** (`Implementation.Hybrid`) | Standard dApp users | EOA + passkey signers, most flexible |
| **MultiSig** (`Implementation.MultiSig`) | Treasury/DAO operations | Threshold-based security, Safe-compatible |
| **Stateless7702** (`Implementation.Stateless7702`) | Power users with existing EOA | Keep same address, add smart account features via EIP-7702 |

**Decision Guide:**
- Building for general users? → Hybrid
- Managing treasuries or multi-party control? → MultiSig  
- Upgrading existing EOAs without address change? → Stateless7702

### 2. Delegation Framework (ERC-7710)

Grant permissions from delegator to delegate:

- **Scopes** - Initial authority (spending limits, function calls)
- **Caveats** - Restrictions enforced by smart contracts
- **Types** - Root, open root, redelegation, open redelegation
- **Lifecycle** - Create → Sign → Store → Redeem

### 3. Advanced Permissions (ERC-7715)

Request permissions via MetaMask extension:

- Human-readable UI confirmations
- ERC-20 and native token permissions
- Requires MetaMask Flask 13.5.0+
- User must have smart account

## Quick Code Examples

### Create Smart Account

```typescript
import { Implementation, toMetaMaskSmartAccount } from '@metamask/smart-accounts-kit'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount('0x...')

const smartAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid,
  deployParams: [account.address, [], [], []],
  deploySalt: '0x',
  signer: { account },
})
```

### Create Delegation

```typescript
import { createDelegation } from '@metamask/smart-accounts-kit'
import { parseUnits } from 'viem'

const delegation = createDelegation({
  to: delegateAddress,
  from: delegatorSmartAccount.address,
  environment: delegatorSmartAccount.environment,
  scope: {
    type: 'erc20TransferAmount',
    tokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    maxAmount: parseUnits('10', 6),
  },
  caveats: [
    { type: 'timestamp', afterThreshold: now, beforeThreshold: expiry },
    { type: 'limitedCalls', limit: 5 },
  ],
})
```

### Sign Delegation

```typescript
const signature = await smartAccount.signDelegation({ delegation })
const signedDelegation = { ...delegation, signature }
```

### Redeem Delegation

```typescript
import { createExecution, ExecutionMode } from '@metamask/smart-accounts-kit'
import { DelegationManager } from '@metamask/smart-accounts-kit/contracts'
import { encodeFunctionData, erc20Abi } from 'viem'

const callData = encodeFunctionData({
  abi: erc20Abi,
  args: [recipient, parseUnits('1', 6)],
  functionName: 'transfer',
})

const execution = createExecution({ target: tokenAddress, callData })

const redeemCalldata = DelegationManager.encode.redeemDelegations({
  delegations: [[signedDelegation]],
  modes: [ExecutionMode.SingleDefault],
  executions: [[execution]],
})

// Via smart account
const userOpHash = await bundlerClient.sendUserOperation({
  account: delegateSmartAccount,
  calls: [{ to: delegateSmartAccount.address, data: redeemCalldata }],
})

// Via EOA
const txHash = await delegateWalletClient.sendTransaction({
  to: environment.DelegationManager,
  data: redeemCalldata,
})
```

### Request Advanced Permissions

```typescript
import { erc7715ProviderActions } from '@metamask/smart-accounts-kit/actions'

const walletClient = createWalletClient({
  transport: custom(window.ethereum),
}).extend(erc7715ProviderActions())

const grantedPermissions = await walletClient.requestExecutionPermissions([
  {
    chainId: chain.id,
    expiry: now + 604800,
    signer: {
      type: 'account',
      data: { address: sessionAccount.address },
    },
    permission: {
      type: 'erc20-token-periodic',
      data: {
        tokenAddress,
        periodAmount: parseUnits('10', 6),
        periodDuration: 86400,
        justification: 'Transfer 10 USDC daily',
      },
    },
    isAdjustmentAllowed: true,
  },
])
```

### Redeem Advanced Permissions

```typescript
// Smart account
import { erc7710BundlerActions } from '@metamask/smart-accounts-kit/actions'

const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http(bundlerUrl),
}).extend(erc7710BundlerActions())

const permissionsContext = grantedPermissions[0].context
const delegationManager = grantedPermissions[0].signerMeta.delegationManager

const userOpHash = await bundlerClient.sendUserOperationWithDelegation({
  publicClient,
  account: sessionAccount,
  calls: [
    {
      to: tokenAddress,
      data: calldata,
      permissionsContext,
      delegationManager,
    },
  ],
})

// EOA
import { erc7710WalletActions } from '@metamask/smart-accounts-kit/actions'

const walletClient = createWalletClient({
  account: sessionAccount,
  chain,
  transport: http(),
}).extend(erc7710WalletActions())

const txHash = await walletClient.sendTransactionWithDelegation({
  to: tokenAddress,
  data: calldata,
  permissionsContext,
  delegationManager,
})
```

## Key API Methods

### Smart Accounts

- `toMetaMaskSmartAccount()` - Create smart account
- `aggregateSignature()` - Combine multisig signatures
- `signDelegation()` - Sign delegation
- `signUserOperation()` - Sign user operation
- `signMessage()` / `signTypedData()` - Standard signing

### Delegations

- `createDelegation()` - Create delegation with delegate
- `createOpenDelegation()` - Create open delegation
- `createCaveatBuilder()` - Build caveats array
- `createExecution()` - Create execution struct
- `redeemDelegations()` - Encode redemption calldata
- `signDelegation()` - Sign with private key
- `getSmartAccountsEnvironment()` - Resolve environment
- `deploySmartAccountsEnvironment()` - Deploy contracts
- `overrideDeployedEnvironment()` - Override environment

### Advanced Permissions

- `erc7715ProviderActions()` - Wallet client extension for requesting
- `requestExecutionPermissions()` - Request permissions
- `erc7710BundlerActions()` - Bundler client extension
- `sendUserOperationWithDelegation()` - Redeem with smart account
- `erc7710WalletActions()` - Wallet client extension
- `sendTransactionWithDelegation()` - Redeem with EOA

## Supported ERC-7715 Permission Types

### ERC-20 Token Permissions

| Permission Type | Description |
|----------------|-------------|
| `erc20-token-periodic` | Per-period limit that resets at each period |
| `erc20-token-stream` | Linear streaming with amountPerSecond rate |

### Native Token Permissions

| Permission Type | Description |
|----------------|-------------|
| `native-token-periodic` | Per-period ETH limit that resets |
| `native-token-stream` | Linear ETH streaming with amountPerSecond rate |

## Common Delegation Scopes

### Spending Limits

| Scope                       | Description                   |
| --------------------------- | ----------------------------- |
| `erc20TransferAmount`       | Fixed ERC-20 limit            |
| `erc20PeriodTransfer`       | Per-period ERC-20 limit       |
| `erc20Streaming`            | Linear streaming ERC-20       |
| `nativeTokenTransferAmount` | Fixed native token limit      |
| `nativeTokenPeriodTransfer` | Per-period native token limit |
| `nativeTokenStreaming`      | Linear streaming native       |
| `erc721Transfer`            | ERC-721 (NFT) transfer        |

### Function Calls

| Scope               | Description                        |
| ------------------- | ---------------------------------- |
| `functionCall`      | Specific methods/addresses allowed |
| `ownershipTransfer` | Ownership transfers only           |

## Common Caveat Enforcers

### Target & Method

- `allowedTargets` - Limit callable addresses
- `allowedMethods` - Limit callable methods
- `allowedCalldata` - Validate specific calldata
- `exactCalldata` / `exactCalldataBatch` - Exact calldata match
- `exactExecution` / `exactExecutionBatch` - Exact execution match

### Value & Token

- `valueLte` - Limit native token value
- `erc20TransferAmount` - Limit ERC-20 amount
- `erc20BalanceChange` - Validate ERC-20 balance change
- `erc721Transfer` / `erc721BalanceChange` - ERC-721 restrictions
- `erc1155BalanceChange` - ERC-1155 validation

### Time & Frequency

- `timestamp` - Valid time range (seconds)
- `blockNumber` - Valid block range
- `limitedCalls` - Limit redemption count
- `erc20PeriodTransfer` / `erc20Streaming` - Time-based ERC-20
- `nativeTokenPeriodTransfer` / `nativeTokenStreaming` - Time-based native

### Security & State

- `redeemer` - Limit redemption to specific addresses
- `id` - One-time delegation with ID
- `nonce` - Bulk revocation via nonce
- `deployed` - Auto-deploy contract
- `ownershipTransfer` - Ownership transfer only
- `nativeTokenPayment` - Require payment
- `nativeBalanceChange` - Validate native balance
- `multiTokenPeriod` - Multi-token period limits

## Execution Modes

| Mode            | Chains   | Processing  | On Failure |
| --------------- | -------- | ----------- | ---------- |
| `SingleDefault` | One      | Sequential  | Revert     |
| `SingleTry`     | One      | Sequential  | Continue   |
| `BatchDefault`  | Multiple | Interleaved | Revert     |
| `BatchTry`      | Multiple | Interleaved | Continue   |

## Contract Addresses (v1.3.0)

### Core

| Contract              | Address                                      |
| --------------------- | -------------------------------------------- |
| EntryPoint            | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| SimpleFactory         | `0x69Aa2f9fe1572F1B640E1bbc512f5c3a734fc77c` |
| DelegationManager     | `0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3` |
| MultiSigDeleGatorImpl | `0x56a9EdB16a0105eb5a4C54f4C062e2868844f3A7` |
| HybridDeleGatorImpl   | `0x48dBe696A4D990079e039489bA2053B36E8FFEC4` |

## Critical Rules

### Always Required

1. **Always use caveats** - Never create unrestricted delegations
2. **Deploy delegator first** - Account must be deployed before redeeming
3. **Check smart account status** - ERC-7715 requires user has smart account

### Behavior

4. **Caveats are cumulative** - In delegation chains, restrictions stack
5. **Function call default** - v0.3.0 defaults to NO native token (use `valueLte`)
6. **Batch mode caveat** - No compatible caveat enforcers available

### Requirements

7. **ERC-7715 requirements** - MetaMask Flask 13.5.0+, smart account
8. **Multisig threshold** - Need at least threshold signers
9. **7702 upgrade** - Stateless7702 requires EIP-7702 upgrade first

## Advanced Patterns

### Parallel User Operations (Nonce Keys)

Smart accounts use a 256-bit nonce structure: 192-bit key + 64-bit sequence. Each unique key has its own independent sequence, enabling parallel execution. This is critical for backend services processing multiple delegations concurrently.

#### Installation

For proper nonce handling, install the permissionless SDK alongside the Smart Accounts Kit:

```bash
npm install permissionless
```

#### How Parallel Nonces Work

ERC-4337 uses a single uint256 nonce where:
- **192 bits** = key identifier (allows parallel streams)
- **64 bits** = sequence number (increments per key)

Each key has an independent sequence, so UserOps with different keys execute in parallel without ordering constraints.

#### Getting Nonce with Permissionless

```typescript
import { getAccountNonce } from 'permissionless'
import { entryPoint07Address } from 'viem/account-abstraction'

// Get nonce for a specific key
const parallelNonce = await getAccountNonce(publicClient, {
  address: smartAccount.address,
  entryPointAddress: entryPoint07Address,
  key: BigInt(Date.now()), // Unique key for parallel execution
})

const userOpHash = await bundlerClient.sendUserOperation({
  account: smartAccount,
  calls: [redeemCalldata],
  nonce: parallelNonce, // Properly encoded 256-bit nonce
})
```

#### Parallel Execution Pattern

```typescript
import { getAccountNonce } from 'permissionless'
import { entryPoint07Address } from 'viem/account-abstraction'

// Execute multiple redemption UserOps in parallel
const redeems = await Promise.all(
  delegations.map(async (delegation, index) => {
    // Generate unique key for this operation
    const nonceKey = BigInt(Date.now()) + BigInt(index * 1000)
    
    // Get properly encoded nonce for this key
    const nonce = await getAccountNonce(publicClient, {
      address: backendSmartAccount.address,
      entryPointAddress: entryPoint07Address,
      key: nonceKey,
    })
    
    const redeemCalldata = DelegationManager.encode.redeemDelegations({
      delegations: [[delegation]],
      modes: [ExecutionMode.SingleDefault],
      executions: [[execution]],
    })
    
    return bundlerClient.sendUserOperation({
      account: backendSmartAccount,
      calls: [{ to: backendSmartAccount.address, data: redeemCalldata }],
      nonce, // Parallel execution enabled via unique key
    })
  })
)
```

#### Without Permissionless (Manual Approach)

The EntryPoint contract encodes nonce as: `sequence | (key << 64)`

If not using permissionless, encode manually:

```typescript
// EntryPoint: nonceSequenceNumber[sender][key] | (uint256(key) << 64)
const key = BigInt(Date.now())
const sequence = 0n // New key starts at sequence 0
const nonce = sequence | (key << 64n)
// Or equivalently: (key << 64n) | sequence
```

However, `getAccountNonce` from permissionless is recommended as it:
- Fetches the current sequence for the key from the EntryPoint
- Properly encodes the 256-bit value
- Handles edge cases and validation

#### Key Points

- **Different keys = parallel execution** — no ordering guarantees between different keys
- **Same key = sequential execution** — sequence increments monotonically per key
- **Use cases:** Backend redemption services, DCA apps, high-frequency trading, batch operations
- **Nonce generation:** `getAccountNonce` returns the full 256-bit nonce properly encoded

#### Common Mistakes

| Mistake | Result |
|---------|--------|
| Reusing same nonce key | Sequential execution (defeats purpose) |
| Using `Date.now()` without offset | Potential collision if multiple ops fire simultaneously |
| Not using `getAccountNonce` | May miss current sequence, causing replacement instead of new op |
| Assuming ordering | Race conditions in dependent operations |

#### Error Handling

```typescript
const results = await Promise.allSettled(redeems)

results.forEach((result, index) => {
  if (result.status === 'rejected') {
    // Check for specific errors
    if (result.reason.message?.includes('AA25')) {
      console.error(`Nonce collision for op ${index}`)
    }
    // Handle or retry
  }
})
```

### Backend Delegation Redemption

For server-side automation (DCA bots, keeper services, automated trading):

```typescript
// 1. Backend creates its own smart account as delegate
const backendAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid,
  deployParams: [backendOwner.address, [], [], []],
  deploySalt: '0x',
  signer: { account: backendOwner },
})

// 2. Backend redeems by sending UserOp FROM its account
const userOpHash = await bundlerClient.sendUserOperation({
  account: backendAccount,
  calls: [{
    to: backendAccount.address,
    data: DelegationManager.encode.redeemDelegations({
      delegations: [[userDelegation]],
      modes: [ExecutionMode.SingleDefault],
      executions: [[swapExecution]],
    })
  }],
})
```

**Use case:** Automated dollar-cost averaging (DCA) bots that redeem swap delegations based on market signals or scheduled intervals.

### Counterfactual Account Deployment

Delegator accounts must be deployed before delegations can be redeemed. The DelegationManager reverts with `0x3db6791c` for counterfactual accounts.

**Solution:** Deploy automatically via first UserOp:

```typescript
// Build redemption calldata
const redeemCalldata = DelegationManager.encode.redeemDelegations({
  delegations: [[signedDelegation]],
  modes: [ExecutionMode.SingleDefault],
  executions: [[execution]],
})

// First redemption deploys the account automatically via initCode
const userOpHash = await bundlerClient.sendUserOperation({
  account: smartAccount, // Will deploy if counterfactual
  calls: [{
    to: smartAccount.address,
    data: redeemCalldata,
    value: 0n,
  }],
})
```

### Session Accounts for AI Agents

For automated services, session accounts act as isolated signers that can only operate within granted delegations. The private key can be generated ephemerally, stored in environment variables, or managed via HSM/server wallets:

```typescript
// Session account created from various sources
const sessionAccount = privateKeyToAccount(
  process.env.SESSION_KEY || generatePrivateKey() || hsmWallet.key
)

// Request delegation from user to session account
const delegation = createDelegation({
  to: sessionAccount.address,
  from: userSmartAccount.address,
  environment,
  scope: { type: 'erc20TransferAmount', tokenAddress, maxAmount: parseUnits('100', 6) },
  caveats: [
    { type: 'timestamp', afterThreshold: now, beforeThreshold: expiry },
    { type: 'limitedCalls', limit: 10 },
  ],
})
// Session account can only act within delegation constraints
```

## Common Patterns

### Pattern 1: ERC-20 with Time Limit

```typescript
const delegation = createDelegation({
  to: delegate,
  from: delegator,
  environment,
  scope: {
    type: 'erc20TransferAmount',
    tokenAddress,
    maxAmount: parseUnits('100', 6),
  },
  caveats: [
    { type: 'timestamp', afterThreshold: now, beforeThreshold: expiry },
    { type: 'limitedCalls', limit: 10 },
    { type: 'redeemer', redeemers: [delegate] },
  ],
})
```

### Pattern 2: Function Call with Value

```typescript
const delegation = createDelegation({
  to: delegate,
  from: delegator,
  environment,
  scope: {
    type: 'functionCall',
    targets: [contractAddress],
    selectors: ['transfer(address,uint256)'],
    valueLte: { maxValue: parseEther('0.1') },
  },
  caveats: [{ type: 'allowedMethods', selectors: ['transfer(address,uint256)'] }],
})
```

### Pattern 3: Periodic Native Token

```typescript
const delegation = createDelegation({
  to: delegate,
  from: delegator,
  environment,
  scope: {
    type: 'nativeTokenPeriodTransfer',
    periodAmount: parseEther('0.01'),
    periodDuration: 86400,
    startDate: now,
  },
})
```

### Pattern 4: Redelegation Chain

```typescript
// Alice → Bob (100 USDC)
const aliceToBob = createDelegation({
  to: bob,
  from: alice,
  environment,
  scope: { type: 'erc20TransferAmount', tokenAddress, maxAmount: parseUnits('100', 6) },
})

// Bob → Carol (50 USDC, subset of authority)
const bobToCarol = createDelegation({
  to: carol,
  from: bob,
  environment,
  scope: { type: 'erc20TransferAmount', tokenAddress, maxAmount: parseUnits('50', 6) },
  parentDelegation: aliceToBob,
  caveats: [{ type: 'timestamp', afterThreshold: now, beforeThreshold: expiry }],
})
```

## Troubleshooting Quick Fixes

| Issue                    | Solution                                                     |
| ------------------------ | ------------------------------------------------------------ |
| Account not deployed     | Use `bundlerClient.sendUserOperation()` to deploy            |
| Invalid signature        | Verify chain ID, delegation manager, signer permissions      |
| Caveat enforcer reverted | Check caveat parameters match execution, verify order        |
| Redemption failed        | Check delegator balance, calldata validity, target contracts |
| ERC-7715 not working     | Upgrade to Flask 13.5.0+, ensure user has smart account      |
| Permission denied        | Handle gracefully, provide manual fallback                   |
| Threshold not met        | Add more signers for multisig                                |
| 7702 not working         | Confirm EOA upgraded via EIP-7702 first                      |

## Error Code Reference

Error codes from the MetaMask Delegation Framework contracts. Use a decoder like [calldata.swiss-knife.xyz](https://calldata.swiss-knife.xyz/decoder) to identify error signatures.

### DelegationManager Errors

| Error Code | Error Name | Meaning |
|------------|-----------|---------|
| `0x005ecddb` | `AlreadyDisabled()` | Delegation has already been disabled |
| `0xf2a5f75a` | `AlreadyEnabled()` | Delegation is already enabled |
| `0x1bcaf69f` | `BatchDataLengthMismatch()` | Mismatch in batch array lengths |
| `0x05baa052` | `CannotUseADisabledDelegation()` | Attempting to redeem a disabled delegation |
| `0xf645eedf` | `ECDSAInvalidSignature()` | Invalid ECDSA signature format |
| `0xfce698f7` | `ECDSAInvalidSignatureLength(uint256)` | Signature length is incorrect |
| `0xd78bce0c` | `ECDSAInvalidSignatureS(bytes32)` | Signature S value is invalid |
| `0xac241e11` | `EmptySignature()` | Signature is empty |
| `0xd93c0665` | `EnforcedPause()` | Contract is paused |
| `0xded4370e` | `InvalidAuthority()` | Delegation chain authority validation failed |
| `0xb5863604` | `InvalidDelegate()` | **Caller is not the delegate** — Most common error |
| `0xb9f0f171` | `InvalidDelegator()` | Caller is not the delegator |
| `0x3db6791c` | `InvalidEOASignature()` | EOA signature verification failed |
| `0x155ff427` | `InvalidERC1271Signature()` | Smart contract signature failed |
| `0x118cdaa7` | `OwnableUnauthorizedAccount(address)` | Unauthorized account attempted owner-only action |
| `0x1e4fbdf7` | `OwnableInvalidOwner(address)` | Invalid owner address in ownership transfer |

### DeleGatorCore Errors

| Error Code | Error Name | Meaning |
|------------|-----------|---------|
| `0xd663742a` | `NotEntryPoint()` | Caller is not the EntryPoint contract |
| `0x0796d945` | `NotEntryPointOrSelf()` | Caller is neither EntryPoint nor this contract |
| `0x1a4b3a04` | `NotDelegationManager()` | Caller is not the DelegationManager |
| `0x29c3b7ee` | `NotSelf()` | Caller is not this contract itself |
| `0xb96fcfe4` | `UnsupportedCallType(CallType)` | Execution call type not supported |
| `0x1187dc06` | `UnsupportedExecType(ExecType)` | Execution type not supported |

### Common Caveat Enforcer Errors (Revert Strings)

| Error String | Meaning |
|--------------|---------|
| `AllowedTargetsEnforcer:target-address-not-allowed` | Target contract not in allowed list |
| `AllowedTargetsEnforcer:invalid-terms-length` | Terms length not multiple of 20 bytes |
| `ERC20TransferAmountEnforcer:invalid-terms-length` | Terms must be 52 bytes |
| `ERC20TransferAmountEnforcer:invalid-contract` | Target doesn't match allowed token |
| `ERC20TransferAmountEnforcer:invalid-method` | Method is not `transfer` |
| `ERC20TransferAmountEnforcer:allowance-exceeded` | Transfer exceeds delegated limit |
| `CaveatEnforcer:invalid-call-type` | Must use single call type |
| `CaveatEnforcer:invalid-execution-type` | Must use default execution type |

### Most Common Errors in Production

**`0xb5863604` — InvalidDelegate**
- **Cause:** Caller doesn't match the delegate address in delegation
- **Fix:** Verify `msg.sender` equals the `to` address in the delegation

**`0xb9f0f171` — InvalidDelegator (counterfactual account)**
- **Cause:** Delegator smart account not yet deployed
- **Fix:** First UserOp will auto-deploy via initCode

**`0x05baa052` — CannotUseADisabledDelegation**
- **Cause:** Delegation was disabled by delegator
- **Fix:** Ask delegator to re-enable, or use different delegation

**`0xded4370e` — InvalidAuthority**
- **Cause:** Broken delegation chain (redelegation parent mismatch)
- **Fix:** Ensure redelegation chains are properly ordered (leaf → root)

**`0x1bcaf69f` — BatchDataLengthMismatch**
- **Cause:** Array lengths don't match in `redeemDelegations` call
- **Fix:** Ensure `permissionContexts`, `modes`, `executionCallDatas` have equal length

## Resources

- **NPM:** `@metamask/smart-accounts-kit`
- **Contracts:** `metamask/delegation-framework@v1.3.0`
- **ERC Standards:** ERC-4337, ERC-7710, ERC-7715, ERC-7579
- **MetaMask Flask:** https://metamask.io/flask

## Version Info

- **Toolkit:** 0.3.0
- **Delegation Framework:** 1.3.0
- **Breaking Change:** Function call scope defaults to no native token transfer

---

**For detailed documentation, see t

import { NextRequest, NextResponse } from "next/server"; import { createPublicClient, http } from "viem"; import { base, mainnet, arbitrum, optimism, polygon } from "viem/chains"; const CHAINS: Record<number, Parameters<typeof createPublicClient>[0]["chain"]> = {   1: mainnet,   8453: base,

pasted

5:05 PM

Unable to generate summary; user prompt is empty
Unable to generate summary; user prompt is empty
I can see your TANA-TAN codebase — a solid DeFi yield optimizer built with Next.js, wagmi, LI.FI Earn, and a Claude-powered intent parser. What would you like to do next?


--- name: smart-accounts-kit description: Web3 development using MetaMask Smart Accounts Kit. Use when the user wants to build dApps with ERC-4337 smart accounts, send user operations, batch transactions, configure signers (EOA, passkey, multisig), implement gas abstraction with paymasters, create

pasted


# Smart Accounts Reference ## Overview MetaMask Smart Accounts are ERC-4337 compliant smart contract accounts supporting programmable behavior, multi-signature approvals, automated transaction batching, and custom security policies. Unlike traditional wallets, they use smart contracts to gover

pasted


# Delegations Reference ## Overview Delegation is the ability for a MetaMask smart account to grant permission to another smart account or EOA to perform specific executions on its behalf. The account granting permission is the **delegator**, the account receiving permission is the **delegate*

pasted


# Advanced Permissions (ERC-7715) Reference ## Overview Advanced Permissions (ERC-7715) enable dapps to request fine-grained permissions from MetaMask users to execute transactions on their behalf. Permissions are requested directly via the MetaMask browser extension with human-readable confir

pasted


# DeFi Mullet Hackathon #1 — Builder Guide > **This file is designed for both humans and LLM coding agents.** > Drop this file into your agent (Cursor, Codex, Claude Code, Windsurf, etc.) and ask it to guide you through the hackathon step by step. --- ## 🤖 Instructions for LLM Agents Y

pasted


# MetaMask Smart Accounts Kit documentation > Complete documentation for MetaMask Smart Accounts Kit This file contains all documentation content in a single document following the llmstxt.org standard. ## Advanced Permissions (ERC-7715) The Smart Accounts Kit supports Advanced Permiss

pasted

5:10 PM

The user prompt is empty, so I cannot determine the primary language. However, based on the thinking block being in English, here is the summary: Synthesized account abstraction integration strategy for yield optimizer
The user prompt is empty, so I cannot determine the primary language. However, based on the thinking block being in English, here is the summary: Synthesized account abstraction integration strategy for yield optimizer
You've got the full MetaMask Smart Accounts Kit docs loaded. Now let me understand what you want to add to TANA-TAN specifically.


You said what feature of metamask we gonna use here Gemini said To make MetaYield work flawlessly and win the judges over, we are going to combine four bleeding-edge features from the MetaMask Smart Accounts Kit. This specific combination is what allows us to build a completely non-custodial

pasted

You are an expert Web3 Full-Stack Developer helping me win the LI.FI "DeFi Mullet" Hackathon. 
I am building a Next.js App Router application called "TANA-TAN". It is a Social Cross-Chain Yield platform where users can post their DeFi yield strategies, and other users can 1-click "Copy" them. When the Alpha strategist moves their funds, a Node.js backend automatically migrates the followers' funds using LI.FI Composer.
**CRITICAL ARCHITECTURE RULE: STRICTLY NO PIMLICO OR ERC-4337 BUNDLERS.**
To achieve a gasless, frictionless UX without the overhead of paymasters, we are using the **MetaMask Smart Accounts Kit (ERC-7715 & ERC-7710)** with a "Meta-Transaction Relayer" model.
1. The Follower (Delegator) uses MetaMask Advanced Permissions (ERC-7715) to grant a FunctionCall scope to our Node.js backend.
2. The Node.js Backend (Delegate) acts as a standard EOA wallet (using a private key). It pays its own L2 gas (e.g., Base/Arbitrum) to broadcast the transaction.
3. The Backend uses Viem's createWalletClient extended with erc7710WalletActions to call sendTransactionWithDelegation. 
**TECH STACK:**
- Next.js (App Router), React, Tailwind, Framer Motion
- Wagmi, Viem
- MetaMask Smart Accounts Kit (@metamask/smart-accounts-kit)
- MongoDB (Mongoose) for backend storage
- LI.FI Earn API & Composer API
**THE FEATURES I NEED CODE FOR:**
**1. MongoDB Database Schema (Mongoose)**
Please write the Mongoose models for:
- Strategy: Represents a post on the social feed. Fields: author (0x address), vaultAddress, chainId, protocol, content/pitch, apy.
- Delegation: Saves the ERC-7715 permission. Fields: followerAddress, strategyId, permissionContext (Hex string), delegationManager (Address), expiry, isActive (boolean).
**2. The Frontend: "Copy Strategy" Flow (ERC-7715)**
Write the React component/hook for the Follower. When they click "Copy", it should:
- Use walletClient.requestExecutionPermissions (extended with erc7715ProviderActions).
- Request a FunctionCall scope targeting the LI.FI Diamond contract and the USDC contract.
- Allow approve and the LI.FI swap execution selectors.
- POST the returned context and delegationManager to a Next.js API route (/api/delegations) to save in MongoDB.
**3. The Backend: Auto-Execution Relayer (Node.js EOA)**
Write the Next.js API route (e.g., /api/execute-strategy) that acts as the automated relayer. It should:
- Fetch all active Delegations from MongoDB for a specific strategy.
- Fetch a swap quote from the LI.FI Composer API (https://li.quest/v1/quote).
- Initialize a Viem WalletClient using a backend private key EOA, extended with erc7710WalletActions.
- Loop through the followers and execute serverWalletClient.sendTransactionWithDelegation({ to: lifiContract, data: lifiQuoteData, permissionsContext: savedContext, delegationManager: savedManager }).
Please provide production-ready, clean TypeScript code for these three pillars, ensuring all Viem and MetaMask Smart Accounts Kit imports are correct. this is my idea llm chat so now you can understand what i want to do

Show more
5:11 PM

You are out of free messages until 9:30 PM
Upgrade

You said what feature of metamask we gonna use here Gemini said To make MetaYield work flawlessly and win the judges over, we are going to combine four bleeding-edge features from the MetaMask Smart Accounts Kit. This specific combination is what allows us to build a completely non-custodial

pasted


You are an expert Web3 Full-Stack Developer helping me win the LI.FI "DeFi Mullet" Hackathon. 

I am building a Next.js App Router application called "TANA-TAN". It is a Social Cross-Chain Yield platform where users can post their DeFi yield strategies, and other users can 1-click "Copy" them. When the Alpha strategist moves their funds, a Node.js backend automatically migrates the followers' funds using LI.FI Composer.

**CRITICAL ARCHITECTURE RULE: STRICTLY NO PIMLICO OR ERC-4337 BUNDLERS.**

To achieve a gasless, frictionless UX without the overhead of paymasters, we are using the **MetaMask Smart Accounts Kit (ERC-7715 & ERC-7710)** with a "Meta-Transaction Relayer" model.

1. The Follower (Delegator) uses MetaMask Advanced Permissions (ERC-7715) to grant a `FunctionCall` scope to our Node.js backend.

2. The Node.js Backend (Delegate) acts as a standard EOA wallet (using a private key). It pays its own L2 gas (e.g., Base/Arbitrum) to broadcast the transaction.

3. The Backend uses Viem's `createWalletClient` extended with `erc7710WalletActions` to call `sendTransactionWithDelegation`. 

**TECH STACK:**

- Next.js (App Router), React, Tailwind, Framer Motion

- Wagmi, Viem

- MetaMask Smart Accounts Kit (`@metamask/smart-accounts-kit`)

- MongoDB (Mongoose) for backend storage

- LI.FI Earn API & Composer API

**THE FEATURES I NEED CODE FOR:**

**1. MongoDB Database Schema (Mongoose)**

Please write the Mongoose models for:

- `Strategy`: Represents a post on the social feed. Fields: `author` (0x address), `vaultAddress`, `chainId`, `protocol`, `content/pitch`, `apy`.

- `Delegation`: Saves the ERC-7715 permission. Fields: `followerAddress`, `strategyId`, `permissionContext` (Hex string), `delegationManager` (Address), `expiry`, `isActive` (boolean).

**2. The Frontend: "Copy Strategy" Flow (ERC-7715)**

Write the React component/hook for the Follower. When they click "Copy", it should:

- Use `walletClient.requestExecutionPermissions` (extended with `erc7715ProviderActions`).

- Request a `FunctionCall` scope targeting the LI.FI Diamond contract and the USDC contract.

- Allow `approve` and the LI.FI swap execution selectors.

- POST the returned `context` and `delegationManager` to a Next.js API route (`/api/delegations`) to save in MongoDB.

**3. The Backend: Auto-Execution Relayer (Node.js EOA)**

Write the Next.js API route (e.g., `/api/execute-strategy`) that acts as the automated relayer. It should:

- Fetch all active `Delegations` from MongoDB for a specific strategy.

- Fetch a swap quote from the LI.FI Composer API (`https://li.quest/v1/quote`).

- Initialize a Viem `WalletClient` using a backend private key EOA, extended with `erc7710WalletActions`.

- Loop through the followers and execute `serverWalletClient.sendTransactionWithDelegation({ to: lifiContract, data: lifiQuoteData, permissionsContext: savedContext, delegationManager: savedManager })`.

Please provide production-ready, clean TypeScript code for these three pillars, ensuring all Viem and MetaMask Smart Accounts Kit imports are correct. this is my idea llm chat so now you can understand what i want to do

Claude is AI and can make mistakes. Please double-check responses.
Pasted content
12.91 KB •411 lines
•
Formatting may be inconsistent from source
# Smart Accounts Reference

## Overview

MetaMask Smart Accounts are ERC-4337 compliant smart contract accounts supporting programmable behavior, multi-signature approvals, automated transaction batching, and custom security policies. Unlike traditional wallets, they use smart contracts to govern account logic.

## Account Abstraction (ERC-4337)

### Core Concepts

| Concept                  | Description                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| **User Operation**       | Package of instructions signed by user, specifying executions for the smart account                    |
| **Bundler**              | Service that collects user operations, packages them into a single transaction, and submits to network |
| **Entry Point Contract** | Validates and processes bundled user operations                                                        |
| **Paymasters**           | Entities that handle gas fee payments on behalf of users                                               |

### Smart Account Flow

1. **Account Setup** - Deploy smart contract with ownership/security settings
2. **User Operation Creation** - Create and sign operation with necessary details
3. **Bundlers and Mempool** - Submit to special mempool where bundlers package operations
4. **Validation and Execution** - Entry point contract validates and executes operations

## Implementation Types

### 1. Hybrid Smart Account

**Reference:** `Implementation.Hybrid`

Flexible implementation supporting both EOA owner and any number of passkey (WebAuthn/P256) signers.

**Deploy Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `owner` | `Hex` | Owner's account address (can be zero address) |
| `p256KeyIds` | `Hex[]` | Array of key identifiers for passkey signers |
| `p256XValues` | `bigint[]` | Array of public key x-values for passkey signers |
| `p256YValues` | `bigint[]` | Array of public key y-values for passkey signers |

**Signers Supported:**

- Viem Account (private key)
- Viem Wallet Client
- WebAuthnAccount (passkey) - requires Ox SDK

**Example - Account Signer:**

```typescript
import { Implementation, toMetaMaskSmartAccount } from '@metamask/smart-accounts-kit'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount('0x...')

const smartAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid,
  deployParams: [account.address, [], [], []],
  deploySalt: '0x',
  signer: { account },
})
```

**Example - Wallet Client Signer:**

```typescript
const addresses = await walletClient.getAddresses()
const owner = addresses[0]

const smartAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid,
  deployParams: [owner, [], [], []],
  deploySalt: '0x',
  signer: { walletClient },
})
```

**Example - Passkey Signer:**

```typescript
import { toWebAuthnAccount } from 'viem/account-abstraction'
import { Address, PublicKey } from 'ox'
import { toHex } from 'viem'

// After creating WebAuthn credential
const credential = await createWebAuthnCredential({ name: 'MetaMask smart account' })
const webAuthnAccount = toWebAuthnAccount({ credential })

// Deserialize compressed public key
const publicKey = PublicKey.fromHex(credential.publicKey)
const owner = Address.fromPublicKey(publicKey)

const smartAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid,
  deployParams: [owner, [toHex(credential.id)], [publicKey.x], [publicKey.y]],
  deploySalt: '0x',
  signer: { webAuthnAccount, keyId: toHex(credential.id) },
})
```

### 2. Multisig Smart Account

**Reference:** `Implementation.MultiSig`

Supports multiple signers with configurable threshold. Valid signature requires signatures from at least threshold signers.

**Deploy Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `signers` | `Hex[]` | Array of EOA signer addresses |
| `threshold` | `bigint` | Number of signers required for valid signature |

**Signers Supported:**

- Multiple Viem Accounts
- Multiple Viem Wallet Clients
- Combination of both

**Example:**

```typescript
const owners = [account1.address, account2.address]
const signer = [{ account: account1 }, { walletClient: walletClient2 }]
const threshold = 2n

const smartAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.MultiSig,
  deployParams: [owners, threshold],
  deploySalt: '0x',
  signer,
})
```

**Note:** Number of signers in signatories must be at least equal to threshold.

### 3. Stateless 7702 Smart Account

**Reference:** `Implementation.Stateless7702`

EOA upgraded to support smart account functionality via EIP-7702. Enables EOAs to perform smart account operations including delegations.

**Note:** Does not handle upgrade process - requires EIP-7702 upgrade first.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | `Address` | Yes | Address of the upgraded EOA |

**Signers Supported:**

- Viem Account
- Viem Wallet Client

**Example - Account Signer:**

```typescript
const smartAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Stateless7702,
  address: account.address, // Address of upgraded EOA
  signer: { account },
})
```

## API Methods

### toMetaMaskSmartAccount()

Creates a MetaMaskSmartAccount instance.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `client` | `Client` | Yes | Viem Client to retrieve smart account data |
| `implementation` | `TImplementation` | Yes | Implementation type (Hybrid, MultiSig, Stateless7702) |
| `signer` | `SignerConfigByImplementation<TImplementation>` | Yes | Signers (Account, WalletClient, or WebAuthnAccount) |
| `environment` | `SmartAccountsEnvironment` | No | Environment to resolve smart contracts |
| `deployParams` | `DeployParams<TImplementation>` | Required if `address` not provided | Parameters for deployment |
| `deploySalt` | `Hex` | Required if `address` not provided | Salt for deployment |
| `address` | `Address` | Required for Stateless7702 or if deployParams/deploySalt not provided | Existing smart account address |

### aggregateSignature()

Aggregates multiple partial signatures into single combined multisig signature.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `signatures` | `PartialSignature[]` | Collection of partial signatures to merge |

**Example:**

```typescript
import { aggregateSignature } from '@metamask/smart-accounts-kit'

const aggregatedSignature = aggregateSignature({
  signatures: [
    { signer: aliceAccount.address, signature: aliceSignature, type: 'ECDSA' },
    { signer: bobAccount.address, signature: bobSignature, type: 'ECDSA' },
  ],
})
```

### encodeCalls()

Encodes calls for execution by smart account.

- Single call directly to smart account → returns call data directly
- Multiple calls or calls to other addresses → creates executions for `execute` function
- Execution mode: `SingleDefault` for single call, `BatchDefault` for multiple

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `calls` | `Call[]` | List of calls to encode |

### getFactoryArgs()

Returns factory address and factory data for deploying smart account.

```typescript
const { factory, factoryData } = await smartAccount.getFactoryArgs()
```

### getNonce()

Returns nonce for smart account.

```typescript
const nonce = await smartAccount.getNonce()
```

### signDelegation()

Signs delegation and returns signature.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `delegation` | `Omit<Delegation, "signature">` | Yes | Unsigned delegation object |
| `chainId` | `number` | No | Chain ID where Delegation Manager is deployed |

**Example:**

```typescript
const signature = await smartAccount.signDelegation({ delegation })
```

### signMessage()

Generates EIP-191 signature using smart account signer.

**Parameters:** See Viem signMessage parameters

**Example:**

```typescript
const signature = await smartAccount.signMessage({ message: 'hello world' })
```

### signTypedData()

Generates EIP-712 signature using smart account signer.

**Parameters:** See Viem signTypedData parameters

**Example:**

```typescript
const signature = await smartAccount.signTypedData({
  domain,
  types,
  primaryType: "Mail",
  message: { ... },
})
```

### signUserOperation()

Signs user operation with smart account signer.

**Parameters:** See Viem signUserOperation parameters

**Example:**

```typescript
const userOpSignature = await smartAccount.signUserOperation({
  callData: '0xdeadbeef',
  callGasLimit: 141653n,
  maxFeePerGas: 15000000000n,
  maxPriorityFeePerGas: 2000000000n,
  nonce: 0n,
  preVerificationGas: 53438n,
  sender: '0xE911628bF8428C23f179a07b081325cAe376DE1f',
  verificationGasLimit: 259350n,
  signature: '0x',
})
```

## Configuration

### Bundler & Paymaster Setup

```typescript
import { createBundlerClient, createPaymasterClient } from 'viem/account-abstraction'
import { http } from 'viem'

const paymasterClient = createPaymasterClient({
  transport: http('https://your-paymaster-url.com'),
})

const bundlerClient = createBundlerClient({
  transport: http('https://your-bundler-url.com'),
  paymaster: paymasterClient,
  chain,
})
```

**Note:** Paymaster is optional, but without it, smart contract account must have funds to pay gas.

### Environment

**SmartAccountsEnvironment** defines contract addresses for interacting with Delegation Framework.

**Auto-resolve from smart account:**

```typescript
const environment: SmartAccountsEnvironment = smartAccount.environment
```

**Manual resolve:**

```typescript
import { getSmartAccountsEnvironment } from '@metamask/smart-accounts-kit'
const environment = getSmartAccountsEnvironment(chain.id)
```

**Deploy custom environment:**

```typescript
import { deploySmartAccountsEnvironment } from '@metamask/smart-accounts-kit/utils'

const environment = await deploySmartAccountsEnvironment(walletClient, publicClient, chain)
```

**Override deployed environment:**

```typescript
import { overrideDeployedEnvironment } from '@metamask/smart-accounts-kit/utils'

overrideDeployedEnvironment(chain.id, '1.3.0', environment)
```

## Deployment

**Deploy Smart Account:**

```typescript
const userOpHash = await bundlerClient.sendUserOperation({
  account: smartAccount,
  calls: [{ to: smartAccount.address, value: 0n, data: '0x' }],
})
```

**Important:** Account must be deployed before creating delegations.

## Signer Guides

### EOA Wallets

- Use `privateKeyToAccount` from viem/accounts
- Or use Wallet Client with custom transport

### Passkeys (WebAuthn)

- Install Ox SDK
- Use `createWebAuthnCredential` and `toWebAuthnAccount`
- Convert public key to address using Ox utilities

### Embedded Wallets (Privy, Dynamic)

- Follow wallet provider documentation
- Use exported accounts with smart account kit

## Best Practices

1. **Always deploy before delegating** - Undeployed accounts cannot redeem delegations
2. **Choose appropriate implementation** - Hybrid for flexibility, Multisig for security, 7702 for EOA upgrades
3. **Secure signers** - Protect private keys and passkey credentials
4. **Test on testnets** - Validate flows before mainnet deployment
5. **Monitor nonce** - Track account state for operation ordering
6. **Gas management** - Use paymasters or ensure account has sufficient funds

## Troubleshooting

| Issue                | Solution                                                       |
| -------------------- | -------------------------------------------------------------- |
| Account not deployed | Deploy via `sendUserOperation` before creating delegations     |
| Invalid signature    | Check chain ID, delegation manager address, signer permissions |
| Threshold not met    | Ensure enough signers provided for multisig                    |
| Passkey not working  | Verify Ox SDK installed, credential properly created           |
| 7702 not functioning | Confirm EOA upgraded via EIP-7702 first                        |

## Related Concepts

- **Delegator Accounts** - Smart accounts that create delegations (see Delegations Reference)
- **Advanced Permissions** - ERC-7715 permissions via MetaMask extension (see Advanced Permissions Reference)
- **Caveat Enforcers** - Smart contracts enforcing delegation rules (see Caveats Reference in Delegations)
# Delegations Reference

## Overview

Delegation is the ability for a MetaMask smart account to grant permission to another smart account or EOA to perform specific executions on its behalf. The account granting permission is the **delegator**, the account receiving permission is the **delegate**.

The toolkit follows **ERC-7710** for smart contract delegation and uses **caveat enforcers** to apply rules and restrictions.

## Delegation Framework Components

### Core Components

| Component              | Description                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| **Delegator Core**     | Logic for ERC-4337 compliant delegator accounts                      |
| **Delegation Manager** | Validates delegations and triggers executions on behalf of delegator |
| **Caveat Enforcers**   | Smart contracts enforcing rules and restrictions on delegations      |

### Delegation Manager Process

When redeeming delegations, the Delegation Manager performs these steps:

1. Validates input data (delegations, modes, executions lengths match)
2. Decodes and validates delegation (caller is delegate, no empty signatures)
3. Verifies delegation signatures (ECDSA for EOAs, `isValidSignature` for contracts)
4. Validates delegation chain authority, ensures not disabled
5. Executes `beforeHook` for each caveat
6. Calls `executeFromExecutor` to perform execution
7. Executes `afterHook` for each caveat
8. Emits `RedeemedDelegation` events

## Delegation Types

### Root Delegation

- Delegator delegates their own authority
- First delegation in any chain
- Use `createDelegation()` to create

**Example:**

```typescript
const delegation = createDelegation({
  to: delegateAddress,
  from: delegatorAddress,
  environment,
  scope: {
    type: 'erc20TransferAmount',
    tokenAddress,
    maxAmount: parseUnits('100', 6),
  },
})
```

### Open Root Delegation

- Root delegation without specified delegate
- Any account can redeem
- Use `createOpenDelegation()` to create
- **Warning:** Use carefully to prevent misuse

### Redelegation

- Delegate re-grants permissions they received
- Creates chain of delegations across trusted parties
- Use `createDelegation()` with `parentDelegation` parameter

**Example:**

```typescript
// Alice delegates to Bob
const aliceToBob = createDelegation({
  to: bobAddress,
  from: aliceAddress,
  environment,
  scope: { type: 'erc20TransferAmount', tokenAddress, maxAmount: parseUnits('100', 6) },
})

// Bob redelegates to Carol (limited to 50 USDC)
const bobToCarol = createDelegation({
  to: carolAddress,
  from: bobAddress, // Bob is delegator in this delegation
  environment,
  scope: { type: 'erc20TransferAmount', tokenAddress, maxAmount: parseUnits('50', 6) },
  parentDelegation: aliceToBob, // References Alice's delegation to Bob
})
```

### Open Redelegation

- Redelegation without specified delegate
- Any account can redeem
- Use `createOpenDelegation()` with `parentDelegation`
- **Warning:** Use carefully

## Delegation Scopes

Scopes define the initial authority of a delegation.

### Spending Limit Scopes

#### ERC-20 Periodic Transfer

Ensures per-period limit for ERC-20 transfers. Allowance resets each period.

```typescript
const delegation = createDelegation({
  scope: {
    type: 'erc20PeriodTransfer',
    tokenAddress: '0xb4aE654Aca577781Ca1c5DE8FbE60c2F423f37da',
    periodAmount: parseUnits('10', 6), // 10 tokens per period
    periodDuration: 86400, // 1 day
    startDate: Math.floor(Date.now() / 1000),
  },
  from: delegatorAddress,
  to: delegateAddress,
  environment,
})
```

#### ERC-20 Streaming

Linear streaming transfer limit. Blocked until start time, then releases initial amount and accrues linearly.

```typescript
const delegation = createDelegation({
  scope: {
    type: 'erc20Streaming',
    tokenAddress,
    initialAmount: parseUnits('1', 6),
    maxAmount: parseUnits('10', 6),
    amountPerSecond: parseUnits('0.1', 6),
    startTime: Math.floor(Date.now() / 1000),
  },
  from: delegatorAddress,
  to: delegateAddress,
  environment,
})
```

#### ERC-20 Transfer Amount

Simple fixed transfer limit.

```typescript
const delegation = createDelegation({
  scope: {
    type: 'erc20TransferAmount',
    tokenAddress: '0xc11F3a8E5C7D16b75c9E2F60d26f5321C6Af5E92',
    maxAmount: parseUnits('1', 6),
  },
  from: delegatorAddress,
  to: delegateAddress,
  environment,
})
```

#### ERC-721 Transfer

Limits delegation to ERC-721 (NFT) transfers only.

```typescript
const delegation = createDelegation({
  scope: {
    type: 'erc721Transfer',
    tokenAddress: '0x3fF528De37cd95b67845C1c55303e7685c72F319',
    tokenId: 1n,
  },
  from: delegatorAddress,
  to: delegateAddress,
  environment,
})
```

#### Native Token Periodic Transfer

Per-period limit for native token (ETH) transfers.

```typescript
const delegation = createDelegation({
  scope: {
    type: 'nativeTokenPeriodTransfer',
    periodAmount: parseEther('0.01'),
    periodDuration: 86400,
    startDate: Math.floor(Date.now() / 1000),
  },
  from: delegatorAddress,
  to: delegateAddress,
  environment,
})
```

#### Native Token Streaming

Linear streaming limit for native tokens.

```typescript
const delegation = createDelegation({
  scope: {
    type: 'nativeTokenStreaming',
    initialAmount: parseEther('0.01'),
    maxAmount: parseEther('0.1'),
    amountPerSecond: parseEther('0.0001'),
    startTime: Math.floor(Date.now() / 1000),
  },
  from: delegatorAddress,
  to: delegateAddress,
  environment,
})
```

#### Native Token Transfer Amount

Fixed limit for native token transfers.

```typescript
const delegation = createDelegation({
  scope: {
    type: 'nativeTokenTransferAmount',
    maxAmount: parseEther('0.001'),
  },
  from: delegatorAddress,
  to: delegateAddress,
  environment,
})
```

### Function Call Scopes

#### Function Call

Defines specific methods, addresses, and calldata allowed.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `targets` | `Address[]` | Yes | Allowed addresses |
| `selectors` | `MethodSelector[]` | Yes | Allowed method selectors (4-byte hex, ABI signature, or ABI function object) |
| `allowedCalldata` | `AllowedCalldataBuilderConfig[]` | No | Allowed calldata portions |
| `exactCalldata` | `ExactCalldataBuilderConfig` | No | Exact calldata required |
| `valueLte` | `ValueLteBuilderConfig` | No | Maximum native token value (default: 0, meaning no native token transfer) |

**⚠️ Breaking Change in v0.3.0:** Function call scope defaults to NO native token transfer. Use `valueLte` to allow.

```typescript
const delegation = createDelegation({
  scope: {
    type: 'functionCall',
    targets: ['0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'], // USDC
    selectors: ['approve(address,uint256)'],
    valueLte: { maxValue: parseEther('0.1') }, // Allow up to 0.1 ETH
  },
  from: delegatorAddress,
  to: delegateAddress,
  environment,
})
```

#### Ownership Transfer

Restricts to ownership transfer calls only.

```typescript
const delegation = createDelegation({
  scope: {
    type: 'ownershipTransfer',
    contractAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
  from: delegatorAddress,
  to: delegateAddress,
  environment,
})
```

## Caveat Enforcers

Caveat enforcers are Solidity contracts implementing the `ICaveatEnforcer` interface with four hooks:

### Hook Functions

```solidity
interface ICaveatEnforcer {
  function beforeAllHook(bytes calldata _terms, bytes calldata _args, ModeCode _mode, bytes calldata _executionCalldata, bytes32 _delegationHash, address _delegator, address _redeemer) external;
  function beforeHook(bytes calldata _terms, bytes calldata _args, ModeCode _mode, bytes calldata _executionCalldata, bytes32 _delegationHash, address _delegator, address _redeemer) external;
  function afterHook(bytes calldata _terms, bytes calldata _args, ModeCode _mode, bytes calldata _executionCalldata, bytes32 _delegationHash, address _delegator, address _redeemer) external;
  function afterAllHook(bytes calldata _terms, bytes calldata _args, ModeCode _mode, bytes calldata _executionCalldata, bytes32 _delegationHash, address _delegator, address _redeemer) external;
}
```

**⚠️ IMPORTANT:** Without caveats, delegations have infinite authority. Always use caveat enforcers.

### Available Caveat Types

#### Target & Method Restrictions

**allowedTargets** - Limit callable addresses

```typescript
const caveats = [
  {
    type: 'allowedTargets',
    targets: ['0xc11F3a8E5C7D16b75c9E2F60d26f5321C6Af5E92'],
  },
]
```

**allowedMethods** - Limit callable methods

```typescript
const caveats = [
  {
    type: 'allowedMethods',
    selectors: ['0xa9059cbb', 'transfer(address,uint256)'],
  },
]
```

**allowedCalldata** - Validate specific calldata

```typescript
const value = encodeAbiParameters([{ type: 'string' }, { type: 'uint256' }], ['Hello', 12345n])

const caveats = [
  {
    type: 'allowedCalldata',
    startIndex: 4,
    value,
  },
]
```

**exactCalldata** - Exact calldata match

```typescript
const caveats = [
  {
    type: 'exactCalldata',
    calldata: '0x1234567890abcdef',
  },
]
```

**exactCalldataBatch** - Batch exact calldata

```typescript
const caveats = [
  {
    type: 'exactCalldataBatch',
    executions: [{ target, value, callData }],
  },
]
```

**exactExecution** - Exact execution match

```typescript
const caveats = [
  {
    type: 'exactExecution',
    target: '0xb4aE654Aca577781Ca1c5DE8FbE60c2F423f37da',
    value: parseEther('1'),
    callData: '0x',
  },
]
```

**exactExecutionBatch** - Batch exact execution

```typescript
const caveats = [
  {
    type: 'exactExecutionBatch',
    executions: [
      { target, value: parseEther('1'), callData: '0x' },
      { target, value: 0n, callData: '0x' },
    ],
  },
]
```

#### Value & Token Restrictions

**valueLte** - Limit native token value

```typescript
const caveats = [
  {
    type: 'valueLte',
    maxValue: parseEther('0.01'),
  },
]
```

**erc20TransferAmount** - Limit ERC-20 amount

```typescript
const caveats = [
  {
    type: 'erc20TransferAmount',
    tokenAddress,
    maxAmount: parseUnits('10', 6),
  },
]
```

**erc20BalanceChange** - Validate ERC-20 balance change

```typescript
const caveats = [
  {
    type: 'erc20BalanceChange',
    tokenAddress,
    recipient: '0x3fF528De37cd95b67845C1c55303e7685c72F319',
    balance: 1000000n,
    changeType: BalanceChangeType.Increase,
  },
]
```

**erc721Transfer** - Restrict ERC-721 transfers

```typescript
const caveats = [
  {
    type: 'erc721Transfer',
    tokenAddress,
    tokenId: 1n,
  },
]
```

**erc721BalanceChange** - Validate ERC-721 balance change

```typescript
const caveats = [
  {
    type: 'erc721BalanceChange',
    tokenAddress,
    recipient,
    balance: 1n,
    changeType: BalanceChangeType.Increase,
  },
]
```

**erc1155BalanceChange** - Validate ERC-1155 balance change

```typescript
const caveats = [
  {
    type: 'erc1155BalanceChange',
    tokenAddress,
    recipient,
    tokenId: 1n,
    balance: 1000000n,
    changeType: BalanceChangeType.Increase,
  },
]
```

#### Time & Frequency Restrictions

**timestamp** - Valid time range

```typescript
const caveats = [
  {
    type: 'timestamp',
    afterThreshold: currentTime + 3600, // 1 hour from now
    beforeThreshold: currentTime + 86400, // 1 day later
  },
]
```

**blockNumber** - Valid block range

```typescript
const caveats = [
  {
    type: 'blockNumber',
    afterThreshold: 19426587n,
    beforeThreshold: 0n, // No upper limit
  },
]
```

**limitedCalls** - Limit redemption count

```typescript
const caveats = [
  {
    type: 'limitedCalls',
    limit: 1, // One-time use
  },
]
```

**erc20PeriodTransfer** - Per-period ERC-20 limits

```typescript
const caveats = [
  {
    type: 'erc20PeriodTransfer',
    tokenAddress,
    periodAmount: parseUnits('1', 18),
    periodDuration: 86400,
    startDate: Math.floor(Date.now() / 1000),
  },
]
```

**erc20Streaming** - Linear streaming ERC-20

```typescript
const caveats = [
  {
    type: 'erc20Streaming',
    tokenAddress,
    initialAmount: parseUnits('1', 18),
    maxAmount: parseUnits('10', 18),
    amountPerSecond: parseUnits('0.00001', 18),
    startTime: Math.floor(Date.now() / 1000),
  },
]
```

**nativeTokenPeriodTransfer** - Per-period native limits

```typescript
const caveats = [
  {
    type: 'nativeTokenPeriodTransfer',
    periodAmount: parseEther('1'),
    periodDuration: 86400,
    startDate: Math.floor(Date.now() / 1000),
  },
]
```

**nativeTokenStreaming** - Linear streaming native

```typescript
const caveats = [
  {
    type: 'nativeTokenStreaming',
    initialAmount: parseEther('0.01'),
    maxAmount: parseEther('0.5'),
    amountPerSecond: parseEther('0.00001'),
    startTime: Math.floor(Date.now() / 1000),
  },
]
```

#### Security & State Restrictions

**redeemer** - Limit redemption to specific addresses

```typescript
const caveats = [
  {
    type: 'redeemer',
    redeemers: ['0xb4aE654Aca577781Ca1c5DE8FbE60c2F423f37da'],
  },
]
```

**id** - One-time delegation with ID

```typescript
const caveats = [
  {
    type: 'id',
    id: 123456,
  },
]
```

**nonce** - Bulk revocation via nonce

```typescript
const caveats = [
  {
    type: 'nonce',
    nonce: '0x1',
  },
]
```

**deployed** - Auto-deploy contract if needed

```typescript
const caveats = [
  {
    type: 'deployed',
    contractAddress: '0xc11F3a8E5C7D16b75c9E2F60d26f5321C6Af5E92',
    salt: '0x0e3e8e2381fde0e8515ed47ec9caec8ba2bc12603bc2b36133fa3e3fa4d88587',
    bytecode: '0x...',
  },
]
```

**ownershipTransfer** - Ownership transfer only

```typescript
const caveats = [
  {
    type: 'ownershipTransfer',
    contractAddress: '0xc11F3a8E5C7D16b75c9E2F60d26f5321C6Af5E92',
  },
]
```

**nativeTokenPayment** - Require payment to redeem

```typescript
const caveats = [
  {
    type: 'nativeTokenPayment',
    recipient: '0x3fF528De37cd95b67845C1c55303e7685c72F319',
    amount: parseEther('0.001'),
  },
]
```

**nativeBalanceChange** - Validate native balance change

```typescript
const caveats = [
  {
    type: 'nativeBalanceChange',
    recipient: '0x3fF528De37cd95b67845C1c55303e7685c72F319',
    balance: parseEther('1'),
    changeType: BalanceChangeType.Increase,
  },
]
```

**argsEqualityCheck** - Validate args equality

```typescript
const caveats = [
  {
    type: 'argsEqualityCheck',
    args: '0xf2bef872456302645b7c0bb59dcd96ffe6d4a844f311ebf95e7cf439c9393de2',
  },
]
```

**multiTokenPeriod** - Multi-token period limits

```typescript
const caveats = [
  {
    type: 'multiTokenPeriod',
    tokenPeriodConfigs: [
      {
        token: '0xb4aE654Aca577781Ca1c5DE8FbE60c2F423f37da',
        periodAmount: parseUnits('1', 18),
        periodDuration: 86400,
        startDate: Math.floor(Date.now() / 1000),
      },
      {
        token: zeroAddress, // Native token
        periodAmount: parseEther('0.01'),
        periodDuration: 3600,
        startDate: Math.floor(Date.now() / 1000),
      },
    ],
  },
]
```

**specificActionERC20TransferBatch** - Specific action + ERC-20 transfer batch

```typescript
const caveats = [
  {
    type: 'specificActionERC20TransferBatch',
    tokenAddress: '0xb4aE654Aca577781Ca1c5DE8FbE60c2F423f37da',
    recipient: '0x027aeAFF3E5C33c4018FDD302c20a1B83aDCD96C',
    amount: parseUnits('1', 18),
    target: '0xb49830091403f1Aa990859832767B39c25a8006B',
    calldata: '0x1234567890abcdef',
  },
]
```

## Execution Modes (ERC-7579)

When redeeming delegations, specify execution mode:

| Mode            | Chains   | Processing  | On Revert     |
| --------------- | -------- | ----------- | ------------- |
| `SingleDefault` | One      | Sequential  | Stop (revert) |
| `SingleTry`     | One      | Sequential  | Continue      |
| `BatchDefault`  | Multiple | Interleaved | Stop (revert) |
| `BatchTry`      | Multiple | Interleaved | Continue      |

**Note:** Batch mode does not currently have compatible caveat enforcers.

## API Methods

### createDelegation()

Creates delegation with specific delegate.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `from` | `Hex` | Yes | Address granting delegation |
| `to` | `Hex` | Yes | Address receiving delegation |
| `scope` | `ScopeConfig` | Yes | Delegation scope defining authority |
| `environment` | `SmartAccountsEnvironment` | Yes | Environment for contract addresses |
| `caveats` | `Caveats` | No | Caveats refining authority |
| `parentDelegation` | `Delegation \| Hex` | No | Parent delegation for chains |
| `salt` | `Hex` | No | Salt for delegation hash |

### createOpenDelegation()

Creates open delegation redeemable by any account.

**Parameters:** Same as createDelegation except `to` is omitted.

### createCaveatBuilder()

Builds array of caveats.

```typescript
import { createCaveatBuilder } from '@metamask/smart-accounts-kit/utils'

const caveatBuilder = createCaveatBuilder(environment)
caveatBuilder.addCaveat('allowedTargets', ['0x...'])
caveatBuilder.addCaveat('timestamp', { afterThreshold: now, beforeThreshold: expiry })

const caveats = caveatBuilder.build()
```

**Config:**

```typescript
const caveatBuilder = createCaveatBuilder(environment, {
  allowInsecureUnrestrictedDelegation: true, // Allow empty caveats (not recommended)
})
```

### createExecution()

Creates ExecutionStruct instance.

```typescript
const execution = createExecution({
  target: '0xe3C818389583fDD5cAC32f548140fE26BcEaE907',
  value: parseEther('0.01'),
  callData: '0x',
})
```

### redeemDelegations()

Encodes calldata for redeeming delegations.

```typescript
import { DelegationManager } from '@metamask/smart-accounts-kit/contracts'

const redeemCalldata = DelegationManager.encode.redeemDelegations({
  delegations: [[signedDelegation]],
  modes: [ExecutionMode.SingleDefault],
  executions: [[execution]],
})
```

### signDelegation()

Signs delegation with private key.

```typescript
import { signDelegation } from '@metamask/smart-accounts-kit'

const signature = signDelegation({
  privateKey,
  delegation,
  chainId: sepolia.id,
  delegationManager: environment.DelegationManager,
})
```

### disableDelegation()

Encodes calldata to disable delegation.

```typescript
const disableData = DelegationManager.encode.disableDelegation({ delegation })
```

### encodeDelegations() / decodeDelegations()

Encode/decode delegations to/from ABI-encoded hex.

```typescript
import { encodeDelegations, decodeDelegations } from '@metamask/smart-accounts-kit/utils'

const encoded = encodeDelegations([delegation])
const decoded = decodeDelegations(encoded)
```

### getDelegationHashOffchain()

Returns delegation hash.

```typescript
import { getDelegationHashOffchain } from '@metamask/smart-accounts-kit/utils'

const hash = getDelegationHashOffchain(delegation)
```

## Delegation Lifecycle

### 1. Create Delegation

```typescript
const delegation = createDelegation({
  to: delegateAddress,
  from: delegatorSmartAccount.address,
  environment: delegatorSmartAccount.environment,
  scope: {
    type: 'erc20TransferAmount',
    tokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    maxAmount: parseUnits('10', 6),
  },
})
```

### 2. Sign Delegation

```typescript
const signature = await delegatorSmartAccount.signDelegation({ delegation })
const signedDelegation = { ...delegation, signature }
```

### 3. Store Delegation

Store signed delegation for later retrieval (off-chain storage, database, etc.)

### 4. Redeem Delegation

```typescript
// Create execution
const callData = encodeFunctionData({
  abi: erc20Abi,
  args: [recipient, parseUnits('1', 6)],
  functionName: 'transfer',
})

const execution = createExecution({ target: tokenAddress, callData })

// Prepare redeem calldata
const redeemCalldata = DelegationManager.encode.redeemDelegations({
  delegations: [[signedDelegation]],
  modes: [ExecutionMode.SingleDefault],
  executions: [[execution]],
})

// Redeem via smart account user operation
const userOpHash = await bundlerClient.sendUserOperation({
  account: delegateSmartAccount,
  calls: [{ to: delegateSmartAccount.address, data: redeemCalldata }],
})

// Or redeem via EOA transaction
const txHash = await delegateWalletClient.sendTransaction({
  to: environment.DelegationManager,
  data: redeemCalldata,
})
```

## Attenuating Authority with Redelegations

Caveats in delegation chains are **accumulative** - they stack:

- Each delegation inherits restrictions from parent
- New caveats can add restrictions but cannot remove existing ones
- Delegate can only redelegate with equal or lesser authority

**Example:**

1. Alice delegates 100 USDC to Bob
2. Bob redelegates 50 USDC to Carol (cannot increase to 200 USDC)
3. Bob adds time constraint: only valid for 1 week
4. Carol has: max 50 USDC AND 1 week time limit

## Best Practices

1. **Always use caveats** - Never create delegations without restrictions
2. **Combine caveats** - Use multiple for comprehensive restrictions
3. **Consider caveat order** - State-changing caveats matter (payment before balance check)
4. **Validate parameters** - Use `allowedCalldata` to enforce function parameters
5. **Time constraints** - Apply `timestamp` or `blockNumber` for time-bound permissions
6. **Limit redeemers** - Use `redeemer` to restrict who can execute
7. **Periodic limits** - Use period transfer caveats for recurring permissions
8. **Test on testnets** - Always validate flows before mainnet

## Troubleshooting

| Issue                    | Solution                                              |
| ------------------------ | ----------------------------------------------------- |
| Account not deployed     | Deploy delegator before creating delegations          |
| Invalid signature        | Check chain ID, delegation manager address, signer    |
| Caveat enforcer reverted | Verify caveat parameters match execution, check order |
| Redemption failed        | Check delegator balance, execution calldata validity  |
| Authority exceeded       | Ensure redelegation caveats are more restrictive      |

## Contract Addresses (v1.3.0)

### Core Contracts

| Contract              | Address                                      |
| --------------------- | -------------------------------------------- |
| EntryPoint            | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| SimpleFactory         | `0x69Aa2f9fe1572F1B640E1bbc512f5c3a734fc77c` |
| DelegationManager     | `0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3` |
| MultiSigDeleGatorImpl | `0x56a9EdB16a0105eb5a4C54f4C062e2868844f3A7` |
| HybridDeleGatorImpl   | `0x48dBe696A4D990079e039489bA2053B36E8FFEC4` |

### Caveat Enforcer Addresses

See [v0.3.0 changelog](https://docs.metamask.io/smart-accounts-kit/changelog/0.3.0/) for full list of enforcer contract addresses.

## Related Concepts

- **Smart Accounts** - Accounts that create delegations (see Smart Accounts Reference)
- **Advanced Permissions** - ERC-7715 permissions via MetaMask (see Advanced Permissions Reference)
- **Custom Enforcers** - Build custom caveat enforcers by implementing ICaveatEnforcer# Advanced Permissions (ERC-7715) Reference

## Overview

Advanced Permissions (ERC-7715) enable dapps to request fine-grained permissions from MetaMask users to execute transactions on their behalf. Permissions are requested directly via the MetaMask browser extension with human-readable confirmations.

**Key Benefits:**

- Eliminates need for users to approve every transaction
- Enables transaction execution without active wallet connection
- Human-readable permission UI in MetaMask
- Users can modify permission parameters (if allowed)

**⚠️ Requirements:**

- MetaMask Flask 13.5.0+ (or later stable versions with ERC-7715 support)
- User must be upgraded to MetaMask Smart Account

## ERC-7715 Technical Overview

### Core Method: `wallet_grantPermissions`

ERC-7715 defines this JSON-RPC method for requesting wallet permissions.

**Required Parameters:**
| Parameter | Description |
|-----------|-------------|
| `signer` | Entity requesting/managing permission (wallet signer, account signer, etc.) |
| `chainId` | Chain where permission is requested |
| `expiry` | Timestamp when permission expires (seconds) |
| `permission` | Permission configuration (type-specific data) |
| `isAdjustmentAllowed` | Whether user can modify requested permission |

### Signer Types

**Account Signer** (most common example):

- Session account created solely to request/redeem permissions
- Can be smart account or EOA
- Contains no tokens (only for signing)
- Granted permissions via ERC-7710 delegation

```typescript
signer: {
  type: "account",
  data: {
    address: sessionAccount.address,
  },
}
```

### How It Works

1. Dapp requests permission via `wallet_grantPermissions`
2. MetaMask displays human-readable confirmation UI
3. User approves (optionally modifying parameters)
4. MetaMask creates ERC-7710 delegation internally
5. Session account receives permission to execute on user's behalf
6. Session account redeems permission to execute transactions

## Advanced Permissions vs Regular Delegations

| Feature                | Regular Delegations                    | Advanced Permissions                 |
| ---------------------- | -------------------------------------- | ------------------------------------ |
| Signing                | Dapp constructs and requests signature | Via MetaMask extension               |
| Human Readable         | No (dapp provides context)             | Yes (rich UI in MetaMask)            |
| Constraints            | Dapp responsibility                    | Enforced by MetaMask                 |
| User Modification      | No                                     | Yes (if `isAdjustmentAllowed: true`) |
| Smart Account Required | For delegator                          | For user (permission target)         |

**Example UI:**
ERC-20 periodic permission displays:

- Start time
- Amount per period
- Period duration
- Token information

## Supported Permission Types

### ERC-20 Token Permissions

#### ERC-20 Periodic Permission

Allows periodic transfers of ERC-20 tokens up to specified amount per period.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `"erc20-token-periodic"` | Permission type |
| `tokenAddress` | `Address` | ERC-20 token contract |
| `periodAmount` | `bigint` | Max amount per period (wei format) |
| `periodDuration` | `number` | Period duration in seconds |
| `justification` | `string` | Human-readable description |

**Example:**

```typescript
const grantedPermissions = await walletClient.requestExecutionPermissions([
  {
    chainId: sepolia.id,
    expiry: Math.floor(Date.now() / 1000) + 604800, // 1 week
    signer: {
      type: 'account',
      data: { address: sessionAccount.address },
    },
    permission: {
      type: 'erc20-token-periodic',
      data: {
        tokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        periodAmount: parseUnits('10', 6), // 10 USDC
        periodDuration: 86400, // 1 day
        justification: 'Permission to transfer 10 USDC every day',
      },
    },
    isAdjustmentAllowed: true,
  },
])
```

#### ERC-20 Streaming Permission

Ensures a linear streaming transfer limit for ERC-20 tokens. Tokens accrue linearly at the configured rate, up to the maximum allowed amount.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `"erc20-token-stream"` | Permission type |
| `tokenAddress` | `Address` | ERC-20 token contract |
| `amountPerSecond` | `bigint` | The rate at which tokens accrue per second |
| `initialAmount` | `bigint` | The initial amount that can be transferred at start time (default: 0) |
| `maxAmount` | `bigint` | The maximum total amount that can be unlocked (default: no limit) |
| `startTime` | `number` | The start timestamp in seconds (default: current time) |
| `justification` | `string` | Human-readable description |

**Example:**

```typescript
permission: {
  type: "erc20-token-stream",
  data: {
    tokenAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    amountPerSecond: parseUnits("0.0001", 6), // 0.0001 USDC per second
    justification: "Permission to stream USDC continuously",
  },
}
```

### Native Token Permissions

#### Native Token Periodic Permission

Allows periodic transfers of native token (ETH) up to specified amount per period.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `"native-token-periodic"` | Permission type |
| `periodAmount` | `bigint` | Max amount per period (wei) |
| `periodDuration` | `number` | Period duration in seconds |
| `justification` | `string` | Human-readable description |

**Example:**

```typescript
permission: {
  type: "native-token-periodic",
  data: {
    periodAmount: parseEther("0.01"), // 0.01 ETH per period
    periodDuration: 86400, // 1 day
    justification: "Permission to transfer 0.01 ETH daily",
  },
}
```

#### Native Token Streaming Permission

Ensures a linear streaming transfer limit for native tokens (ETH). ETH accrues linearly at the configured rate, up to the maximum allowed amount.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `"native-token-stream"` | Permission type |
| `amountPerSecond` | `bigint` | The rate at which ETH accrues per second |
| `initialAmount` | `bigint` | The initial amount that can be transferred at start time (default: 0) |
| `maxAmount` | `bigint` | The maximum total amount that can be unlocked (default: no limit) |
| `startTime` | `number` | The start timestamp in seconds (default: current time) |
| `justification` | `string` | Human-readable description |

**Example:**

```typescript
permission: {
  type: "native-token-stream",
  data: {
    amountPerSecond: parseEther("0.00001"), // 0.00001 ETH per second
    justification: "Permission to stream ETH continuously",
  },
}
```

## Advanced Permissions Lifecycle

### Step 1: Setup Wallet Client

```typescript
import { createWalletClient, custom } from 'viem'
import { erc7715ProviderActions } from '@metamask/smart-accounts-kit/actions'

const walletClient = createWalletClient({
  transport: custom(window.ethereum),
}).extend(erc7715ProviderActions())
```

### Step 2: Setup Public Client

```typescript
import { createPublicClient, http } from 'viem'
import { sepolia as chain } from 'viem/chains'

const publicClient = createPublicClient({
  chain,
  transport: http(),
})
```

### Step 3: Setup Session Account

**Smart Account:**

```typescript
import { toMetaMaskSmartAccount, Implementation } from '@metamask/smart-accounts-kit'

const sessionAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid,
  deployParams: [account.address, [], [], []],
  deploySalt: '0x',
  signer: { account },
})
```

**EOA:**

```typescript
import { privateKeyToAccount } from 'viem/accounts'

const sessionAccount = privateKeyToAccount('0x...')
```

### Step 4: Check User Smart Account Status

**For MetaMask Flask 13.9.0+:**

- Advanced Permissions support automatic upgrade
- No manual upgrade needed

**For earlier versions:**

```typescript
const addresses = await walletClient.requestAddresses()
const address = addresses[0]

const code = await publicClient.getCode({ address })

if (code) {
  const delegatorAddress = `0x${code.substring(8)}` // Remove 0xef0100 prefix
  const statelessDelegatorAddress = getSmartAccountsEnvironment(chain.id).implementations
    .EIP7702StatelessDeleGatorImpl

  const isAccountUpgraded =
    delegatorAddress.toLowerCase() === statelessDelegatorAddress.toLowerCase()

  if (!isAccountUpgraded) {
    // Prompt user to upgrade or upgrade programmatically
  }
}
```

**Why upgrade required?**

- Under the hood, ERC-7715 creates an ERC-7710 delegation
- ERC-7710 delegation requires MetaMask Smart Account

### Step 5: Request Permissions

```typescript
const currentTime = Math.floor(Date.now() / 1000)
const expiry = currentTime + 604800 // 1 week

const grantedPermissions = await walletClient.requestExecutionPermissions([
  {
    chainId: chain.id,
    expiry,
    signer: {
      type: 'account',
      data: { address: sessionAccount.address },
    },
    permission: {
      type: 'erc20-token-periodic',
      data: {
        tokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        periodAmount: parseUnits('10', 6),
        periodDuration: 86400,
        justification: 'Permission to transfer 10 USDC every day',
      },
    },
    isAdjustmentAllowed: true,
  },
])
```

### Step 6: Setup Client for Redemption

**Smart Account (Bundler Client):**

```typescript
import { createBundlerClient } from 'viem/account-abstraction'
import { erc7710BundlerActions } from '@metamask/smart-accounts-kit/actions'

const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http('https://your-bundler-rpc.com'),
  paymaster: true,
}).extend(erc7710BundlerActions())
```

**EOA (Wallet Client):**

```typescript
import { createWalletClient, http } from 'viem'
import { erc7710WalletActions } from '@metamask/smart-accounts-kit/actions'

const sessionAccountWalletClient = createWalletClient({
  account: sessionAccount,
  chain,
  transport: http(),
}).extend(erc7710WalletActions())
```

### Step 7: Redeem Permissions

**Extract from permission response:**

```typescript
const permissionsContext = grantedPermissions[0].context
const delegationManager = grantedPermissions[0].signerMeta.delegationManager
```

**Smart Account Redemption:**

```typescript
const calldata = encodeFunctionData({
  abi: erc20Abi,
  args: [recipient, parseUnits('1', 6)],
  functionName: 'transfer',
})

const userOpHash = await bundlerClient.sendUserOperationWithDelegation({
  publicClient,
  account: sessionAccount,
  calls: [
    {
      to: tokenAddress,
      data: calldata,
      permissionsContext,
      delegationManager,
    },
  ],
  maxFeePerGas: 1n,
  maxPriorityFeePerGas: 1n,
})
```

**EOA Redemption:**

```typescript
const txHash = await sessionAccountWalletClient.sendTransactionWithDelegation({
  to: tokenAddress,
  data: calldata,
  permissionsContext,
  delegationManager,
})
```

## API Methods

### Wallet Client Actions

#### requestExecutionPermissions()

Requests Advanced Permissions from MetaMask extension.

**Requirements:**

- Wallet Client must be extended with `erc7715ProviderActions()`
- User must have MetaMask Flask 13.5.0+

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `chainId` | `number` | Yes | Chain ID for permission |
| `expiry` | `number` | Yes | Expiration timestamp (seconds) |
| `permission` | `SupportedPermissionParams` | Yes | Permission configuration |
| `signer` | `SignerParam` | Yes | Account receiving permission |
| `isAdjustmentAllowed` | `boolean` | Yes | Allow user modification |
| `address` | `Address` | No | Wallet address to request from |

**Returns:**

```typescript
{
  context: Hex,              // Encoded permissions context
  signerMeta: {
    delegationManager: Address,  // Delegation Manager address
    // ... other metadata
  },
  // ... other permission details
}
```

#### sendTransactionWithDelegation()

Sends transaction to redeem delegated permissions (EOA only).

**Requirements:**

- Wallet Client must be extended with `erc7710WalletActions()`

**Additional Parameters (beyond standard sendTransaction):**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `delegationManager` | `Address` | Yes | Delegation Manager address |
| `permissionsContext` | `Hex` | Yes | Encoded calldata from permission response |

**Example:**

```typescript
const hash = await walletClient.sendTransactionWithDelegation({
  to: tokenAddress,
  value: 0n,
  data: calldata,
  permissionsContext,
  delegationManager,
})
```

### Bundler Client Actions

#### sendUserOperationWithDelegation()

Sends user operation to redeem delegated permissions (Smart Account only).

**Requirements:**

- Bundler Client must be extended with `erc7710BundlerActions()`

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `publicClient` | `PublicClient` | Yes | For reading chain state |
| `account` | `SmartAccount` | Yes | Session account |
| `calls` | `Call[]` | Yes | Calls to execute |
| `calls[].permissionsContext` | `Hex` | Yes | From permission response |
| `calls[].delegationManager` | `Address` | Yes | From permission response |

**Example:**

```typescript
const userOpHash = await bundlerClient.sendUserOperationWithDelegation({
  publicClient,
  account: sessionAccount,
  calls: [
    {
      to: tokenAddress,
      data: calldata,
      permissionsContext,
      delegationManager,
    },
  ],
  maxFeePerGas: 1n,
  maxPriorityFeePerGas: 1n,
})
```

## Configuration

### Extending Clients

**Wallet Client for Requesting Permissions:**

```typescript
import { erc7715ProviderActions } from '@metamask/smart-accounts-kit/actions'

const walletClient = createWalletClient({
  transport: custom(window.ethereum),
}).extend(erc7715ProviderActions())
```

**Wallet Client for EOA Redemption:**

```typescript
import { erc7710WalletActions } from '@metamask/smart-accounts-kit/actions'

const walletClient = createWalletClient({
  account: sessionAccount,
  transport: http(),
  chain,
}).extend(erc7710WalletActions())
```

**Bundler Client for Smart Account Redemption:**

```typescript
import { erc7710BundlerActions } from '@metamask/smart-accounts-kit/actions'

const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http(bundlerUrl),
  paymaster: true,
}).extend(erc7710BundlerActions())
```

## Best Practices

### Permission Design

1. **Appropriate Time Limits** - Set reasonable expiry times
2. **Justification Messages** - Clear descriptions help users understand
3. **Allow Adjustment** - Set `isAdjustmentAllowed: true` for better UX
4. **Periodic over Allowance** - Use periodic for recurring operations
5. **Test Amounts** - Use small amounts for testing

### Security

1. **Session Account Isolation** - Keep session accounts separate from user accounts
2. **No Token Storage** - Session accounts should not hold tokens
3. **Expiry Management** - Monitor and refresh expiring permissions
4. **Permission Validation** - Verify granted permissions match request
5. **Error Handling** - Handle permission denial gracefully

### Implementation

1. **Check Smart Account Status** - Verify or upgrade user before requesting
2. **Permission Caching** - Store granted permissions for reuse
3. **Batch Operations** - Group multiple calls when possible
4. **Gas Management** - Use paymasters for better UX
5. **Fallback Handling** - Provide manual transaction fallback

## Troubleshooting

| Issue                    | Solution                                                                |
| ------------------------ | ----------------------------------------------------------------------- |
| MetaMask not showing UI  | Verify Flask 13.5.0+ installed                                          |
| Permission request fails | Check user upgraded to smart account                                    |
| Redemption fails         | Verify permissionsContext and delegationManager extracted correctly     |
| Gas estimation fails     | Ensure paymaster configured or account has funds                        |
| Invalid permission type  | Use supported types (erc20-token-periodic, erc20-token-stream, native-token-periodic, native-token-stream) |
| Expired permission       | Request new permission with updated expiry                              |
| User denied permission   | Provide fallback UI for manual approval                                 |

## Integration Examples

### DeFi Dapp Integration

**Scenario:** Dapp wants to swap user tokens daily

```typescript
// 1. Setup
const walletClient = createWalletClient({
  transport: custom(window.ethereum),
}).extend(erc7715ProviderActions())

// 2. Request daily swap permission
const grantedPermissions = await walletClient.requestExecutionPermissions([{
  chainId: chain.id,
  expiry: now + 30 * 86400, // 30 days
  signer: { type: "account", data: { address: sessionAccount.address } },
  permission: {
    type: "erc20-token-periodic",
    data: {
      tokenAddress: USDC_ADDRESS,
      periodAmount: parseUnits("100", 6),
      periodDuration: 86400,
      justification: "Daily automated token swaps",
    },
  },
  isAdjustmentAllowed: true,
}])

// 3. Daily automated redemption (backend/schedule)
const userOpHash = await bundlerClient.sendUserOperationWithDelegation({
  publicClient,
  account: sessionAccount,
  calls: [{
    to: DEX_ROUTER,
    data: encodeSwapData(...),
    permissionsContext: grantedPermissions[0].context,
    delegationManager: grantedPermissions[0].signerMeta.delegationManager,
  }],
})
```

### Gaming Dapp Integration

**Scenario:** Game needs to make micro-transactions for user

```typescript
// Request small periodic native token allowance
const grantedPermissions = await walletClient.requestExecutionPermissions([
  {
    chainId: chain.id,
    expiry: now + 7 * 86400, // 1 week
    signer: { type: 'account', data: { address: sessionAccount.address } },
    permission: {
      type: 'native-token-periodic',
      data: {
        periodAmount: parseEther('0.001'), // Small amount
        periodDuration: 3600, // Hourly
        justification: 'In-game purchases and fees',
      },
    },
    isAdjustmentAllowed: true,
  },
])
```

## Resources

- **ERC-7715 Spec:** https://eips.ethereum.org/EIPS/eip-7715
- **ERC-7710 Spec:** https://eips.ethereum.org/EIPS/eip-7710
- **MetaMask Flask:** Required for Advanced Permissions
- **Smart Accounts Kit:** `@metamask/smart-accounts-kit`

## Related Concepts

- **Smart Accounts** - User must be upgraded to smart account
- **Delegations** - Underlying mechanism (ERC-7710)
- **> **This file is designed for both humans and LLM coding agents.**
> Drop this file into your agent (Cursor, Codex, Claude Code, Windsurf, etc.) and ask it to guide you through the hackathon step by step.

---

## 🤖 Instructions for LLM Agents

You are a hackathon coach for the **DeFi Mullet Hackathon #1**. Your job is to guide the participant through every phase — from registration to final submission. Follow this protocol:

### Interaction Flow

1. **Onboard** — Greet the participant. Ask if they've registered. If not, send them to the registration link. Confirm key dates.
2. **Discover** — Ask what the participant is interested in building (or brainstorm with them). Help them pick a track.
3. **Plan** — Based on the chosen track, outline a minimal viable project scope that can be built in ~5 days.
4. **Build** — Help scaffold the project, write code, integrate the Earn API, and debug issues.
5. **Submit** — Before the deadline, remind them of ALL submission requirements: working demo, tweet, write-up, and Google Form. Help them draft the tweet and write-up.

### Behavior Rules

- Always be aware of the current date. If it is past April 14, inform the participant that submissions are closed.
- When the participant asks "what should I build?", use the **Track Ideas & Brainstorm** section below to spark ideas. Ask follow-up questions about their skills, interests, and available time.
- When helping with code, always use the **Earn API Reference** section below as your technical source of truth. Pay special attention to the two-layer architecture (Earn Data API + Composer) and their different auth requirements.
- **This document may not be 100% accurate.** When in doubt, always prioritize the actual API responses over the examples in this file. Encourage the participant to call the endpoints directly and inspect the real response structure. If the participant reports that something in this doc doesn't match the actual API behavior, trust the API.
- Proactively remind the participant about common pitfalls (see **Common Pitfalls** section).
- When it's April 13 or later, switch to "submission mode": prioritize helping them record a demo, draft the tweet thread, and fill out the submission form.

---

## 📌 Hackathon Overview

| Field | Details |
|---|---|
| **Name** | DeFi Mullet Hackathon #1 — Builder Edition |
| **Tagline** | Business in the front, yield in the back. |
| **Prize Pool** | $5,000 USDC across 17 prizes |
| **Duration** | April 8 → April 14, 2026 (5-day build sprint) |
| **Format** | Online, async, global |
| **Team Size** | 1–4 people (solo is fine) |
| **Organizer** | [LI.FI](https://li.fi/) |

### What is the "DeFi Mullet"?

Users see a simple one-click deposit. Developers know what powers it — 20+ protocols, multi-chain execution, and an entire infrastructure layer. Clean in the front, wild in the back.

---

## 📅 Key Dates & Deadlines

```
April 8 ......... Registration opens + Hackathon begins
                   API docs & starter templates go live
April 8–13 ...... Build sprint (5 days)
April 13 ........ ⚠️  Recommended: finalize demo video & draft tweet
April 14 ........ ⏰ SUBMISSION DAY
~April 21 ....... 🏆 Winners announced
```

### Submission Windows (April 14)

You MUST post your submission tweet within one of these windows:

| Window | Timezone | Time |
|---|---|---|
| **Global** | Eastern Time (ET) | April 14, 09:00 AM – 12:00 PM |
| **APAC** | UTC+8 | April 14, 09:00 AM – 12:00 PM |

Choose the window that matches your region. Tweets posted outside these windows will NOT be accepted.

**Pro tip:** Write your tweet and record your demo by April 13. Use X's scheduled post feature to auto-publish on April 14 morning.

---

## ✅ Step-by-Step Participation Checklist

Use this as your master checklist. Ask your coding agent to track your progress.

### Phase 1: Register (Day 0)
- [ ] Fill out the registration form: https://forms.gle/RFLGG8RiEKC3AqnQA
- [ ] Join the Telegram builder group: https://t.me/lifibuilders
- [ ] (Optional, for Chinese speakers) Add WeChat: **brucexu-eth**, reply "DeFi Mullet"
- [ ] Get your **Composer API key** from [LI.FI Partner Portal](https://portal.li.fi/) — needed for `/v1/quote` calls
- [ ] Note: The **Earn Data API** (`/v1/earn/*`) currently requires no authentication

### Phase 2: Choose Your Track (Day 0–1)
- [ ] Read the track descriptions below
- [ ] Brainstorm project ideas (use the idea prompts below, or ask your agent)
- [ ] Pick ONE track for your submission
- [ ] Define your MVP scope (what is the smallest working version?)

### Phase 3: Build (Day 1–5)
- [ ] Set up your project repo
- [ ] Integrate the two API layers:
  - [ ] **Earn Data API** (`earn.li.fi`) — vault discovery, portfolio & positions (no auth needed)
  - [ ] **Composer** (`li.quest`) — transaction building & execution (API key required)
- [ ] Build your product layer on top
- [ ] Test with real funds (small amounts — see FAQ on test funds)
- [ ] Deploy or prepare a screen-recorded demo

### Phase 4: Submit (Day 5 — April 14)
- [ ] Record a demo video showing your project working
- [ ] Write your submission tweet/thread including ALL required elements (see below)
- [ ] Schedule your tweet for your region's submission window
- [ ] Write a brief project description (what it does, how it uses Earn, what's next)
- [ ] Fill out the submission Google Form: https://forms.gle/1PCvD9BymH1EyRmV8

---

## 🏁 Tracks

Each track has a description, example ideas, and brainstorm prompts your agent can use to help you pick a direction.

---

### 🏗️ Track 1: Yield Builder

**Build a yield product** — dashboard, aggregator, portfolio manager, treasury tool, or integrate Earn into an existing project.

**Example ideas:**
- A unified dashboard comparing APY (base/reward/total + 1d/7d/30d trends) across 20+ protocols with one-click deposit via Composer
- A stablecoin treasury tool that filters vaults by `tags: ["stablecoin"]` and auto-allocates to highest yield
- A portfolio manager showing all positions via `/v1/earn/portfolio` with rebalancing suggestions
- An "Earn" module integrated into your existing DeFi app (only the integration is judged)

**Brainstorm prompts (ask the participant):**
- What kind of assets do you hold? (stablecoins, ETH, etc.)
- If you could build one tool to manage your own yield, what would it do?
- What's the most annoying part of using yield protocols today?

---

### 🤖 Track 2: AI × Earn

**AI-powered yield tools** — agents, chatbots, LLM-driven analysis, natural language DeFi.

**Example ideas:**
- An agent that accepts commands like "put my USDC into the safest vault above 5% APY on Arbitrum" — calls `/v1/earn/vaults` to discover, `/v1/quote` to build tx, and executes
- A position monitor that reads `/v1/earn/portfolio` and auto-rebalances when better opportunities appear
- An LLM-powered risk scoring system that uses vault `tags`, `protocol` metadata, and APY `base` vs `reward` breakdown
- A chat interface where users describe goals in plain English and the agent builds a yield strategy

**Brainstorm prompts:**
- What decision would you want an AI to make for you in DeFi?
- How would you describe your ideal yield strategy in one sentence?
- What data sources (beyond the Earn API) would make your agent smarter?

---

### 🎨 Track 3: DeFi UX Challenge

**Make DeFi yield as simple as a savings account.** Best UX wins.

**Example ideas:**
- A single "Earn" button flow — 3 taps from open to deposited, powered by Composer's any-token cross-chain deposits
- A mobile-first deposit experience designed for non-crypto users
- A portfolio view using `/v1/earn/portfolio` that makes yield feel as familiar as checking a bank balance
- An onboarding wizard that guides first-time users into their first vault

**Brainstorm prompts:**
- If your non-technical friend wanted to earn yield, what would they struggle with?
- What's the fewest number of steps you can reduce the deposit flow to?
- How would you explain "vault" and "APY" without using those words?

---

### 🔧 Track 4: Developer Tooling

**Build tools for other builders** — SDKs, CLI tools, plugins, frameworks, starter templates.

**Example ideas:**
- A TypeScript SDK wrapper that abstracts Earn Data API + Composer into 3 function calls
- A Hardhat plugin for testing vault integrations locally
- A CLI tool: `earn deposit --chain base --token USDC --amount 500 --strategy safest`
- A Postman/Bruno collection with pre-configured requests for all Earn endpoints
- A starter template with wallet connection, Earn Data API, Composer, and UI components pre-wired

**Brainstorm prompts:**
- What friction did you hit when you first looked at the Earn API?
- What tool do you wish existed right now?
- What would make another builder's hackathon experience 10x better?

---

### 🃏 Track 5: Open Track

**Anything creative using the Earn API.** Surprise the judges.

**Example ideas:**
- A Telegram bot: `/earn 500 USDC` → calls `/v1/earn/vaults` → finds best vault → `/v1/quote` → executes
- A Discord bot for DAO treasury management
- On-chain analytics dashboard showing yield trends across protocols and chains
- A yield-based game (e.g., "Yield Wars" — compete for best strategy)
- Generative art powered by live APY data

**Brainstorm prompts:**
- What's the weirdest thing you could build with a yield API?
- What platform do you spend the most time on? Can you bring yield there?
- If yield data were a creative medium, what would you make?

---

## 🔧 Earn API Reference

> **⚠️ Source of truth disclaimer:** This document provides API examples based on the endpoints at the time of writing. The actual API may have been updated since then. **Always treat the real API response as the primary source of truth.** If your coding agent generates code that doesn't match what the API actually returns, call the endpoint yourself (e.g., `curl https://earn.li.fi/v1/earn/vaults | head`), inspect the response, and use that. For definitive reference, check the [official LI.FI docs](https://docs.li.fi).

### Architecture: Two Separate Services

LI.FI Earn is a **unified DeFi yield API** built as two independent services:

```
┌──────────────────────────────────────────────────────────────┐
│                        LI.FI Earn                            │
│                                                              │
│  Service 1: Earn Data API                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Base URL:  https://earn.li.fi       (production)       │  │
│  │ Auth:      NONE (no API key needed)                    │  │
│  │ Rate Limit: 100 requests per minute                    │  │
│  │                                                        │  │
│  │ Endpoints:                                             │  │
│  │   GET /v1/earn/vaults        — discover vaults         │  │
│  │   GET /v1/earn/vaults/:network/:address — vault detail │  │
│  │   GET /v1/earn/chains        — supported chains        │  │
│  │   GET /v1/earn/protocols     — supported protocols     │  │
│  │   GET /v1/earn/portfolio/:addr/positions — user positions│ │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Service 2: Composer (Transaction Execution)                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Base URL:  https://li.quest                            │  │
│  │ Auth:      API key from LI.FI Partner Portal           │  │
│  │            → https://portal.li.fi/                     │  │
│  │                                                        │  │
│  │ Endpoint:                                              │  │
│  │   GET /v1/quote              — build transaction       │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

⚠️ **Important:** These are two different base URLs with different auth requirements. Don't mix them up.

### The Core Flow

```
User wants top APY for USDC
        │
        ▼
   ┌─────────┐  GET earn.li.fi/v1/earn/vaults        ┌──────────────┐
   │  Your   │ ──────────────────────────────────►   │ Earn Data API │
   │  App    │ ◄──────────────────────────────────   │  (no auth)    │
   │         │  { data: [{vault, apy, tvl}, ...],    └──────────────┘
   │         │    nextCursor, total }
   │         │
   │         │  User picks vault & clicks "Deposit"
   │         │
   │         │  GET li.quest/v1/quote                 ┌──────────────┐
   │         │ ──────────────────────────────────►   │   Composer    │
   │         │ ◄──────────────────────────────────   │  (API key)    │
   │         │  { transactionRequest }                └──────────────┘
   └─────────┘
        │
        ▼  Send tx to wallet → 1-click sign → done
```

---

### Service 1: Earn Data API

**Base URL:** `https://earn.li.fi` (production) or `https://earn-dev.li.fi` (dev)
**Auth:** None required
**Rate Limit:** 100 requests per minute
**Full docs:** [docs.li.fi/earn/overview](https://docs.li.fi/earn/overview)

#### `GET /v1/earn/vaults` — Discover Vaults

List all supported vaults with filtering and pagination.

| Parameter | Type | Description |
|---|---|---|
| `chainId` | number | Filter by chain ID (e.g., `1` for Ethereum, `8453` for Base) |
| `asset` | string | Filter by underlying asset address |
| `minTvl` | number | Minimum TVL in USD |
| `sortBy` | string | Sort field (e.g., `apy`, `tvl`) |

**Example request:**

```
GET https://earn.li.fi/v1/earn/vaults?chainId=8453
```

**Example response (actual structure from API):**

```json
{
  "data": [
    {
      "address": "0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183",
      "network": "Base",
      "chainId": 8453,
      "slug": "8453-0xbeef010f9cb27031ad51e3333f9af9c6b1228183",
      "name": "STEAKUSDC",
      "description": "",
      "protocol": {
        "name": "morpho-v1",
        "url": "https://app.morpho.org/base/vault/0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183"
      },
      "underlyingTokens": [
        {
          "address": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
          "symbol": "USDC",
          "decimals": 6
        }
      ],
      "lpTokens": [],
      "tags": ["stablecoin", "single"],
      "analytics": {
        "apy": {
          "base": 3.77472,
          "reward": 0,
          "total": 3.77472
        },
        "apy1d": 3.74527,
        "apy7d": null,
        "apy30d": 3.7388,
        "tvl": {
          "usd": "270595698"
        },
        "updatedAt": "2026-04-07T23:02:48.074Z"
      },
      "isTransactional": true,
      "isRedeemable": true,
      "depositPacks": [
        { "name": "morpho-zaps", "stepsType": "instant" }
      ],
      "redeemPacks": [
        { "name": "morpho-zaps", "stepsType": "instant" }
      ]
    }
  ],
  "nextCursor": "8453-0xbeef010f9cb27031ad51e3333f9af9c6b1228183",
  "total": 672
}
```

**Key fields explained:**

| Field | Description |
|---|---|
| `address` | Vault contract address (use as `toToken` in Composer) |
| `network` | Human-readable chain name (e.g., "Ethereum", "Base", "Arbitrum") |
| `chainId` | Numeric chain ID (e.g., 1, 8453, 42161) |
| `slug` | Unique vault identifier: `{chainId}-{address}` |
| `name` | Vault display name |
| `protocol.name` | Protocol identifier (e.g., "morpho-v1", "aave-v3", "euler-v2") |
| `protocol.url` | Link to the protocol's UI for this vault |
| `underlyingTokens` | Array of tokens the vault accepts (address, symbol, decimals) |
| `tags` | Labels like `"stablecoin"`, `"single"`, `"multi"`, `"il-risk"` |
| `analytics.apy.base` | Base yield APY (%) |
| `analytics.apy.reward` | Reward/incentive APY (%) — can be `null` |
| `analytics.apy.total` | Total APY = base + reward (%) |
| `analytics.apy1d` | 1-day APY snapshot |
| `analytics.apy7d` | 7-day APY average (can be `null`) |
| `analytics.apy30d` | 30-day APY average |
| `analytics.tvl.usd` | Total value locked in USD (string) |
| `isTransactional` | Whether deposits are supported via Composer |
| `isRedeemable` | Whether withdrawals are supported via Composer |
| `depositPacks` | Available deposit methods (e.g., `"morpho-zaps"`, `"aave-zaps"`) |
| `redeemPacks` | Available withdrawal methods |
| `nextCursor` | Pagination cursor — pass as query param for next page |
| `total` | Total number of vaults matching your query |

**Pagination:** The API returns paginated results. Use `nextCursor` from the response as a query parameter to fetch the next page.

**⚠️ APY values can be `null`** — especially `apy7d` for newer vaults. Always handle nulls in your code.

#### `GET /v1/earn/vaults/:network/:address` — Single Vault Detail

Returns full metadata for a specific vault.

#### `GET /v1/earn/chains` — Supported Chains

Returns list of all chains supported by Earn.

#### `GET /v1/earn/protocols` — Supported Protocols

Returns list of all supported protocols with metadata.

#### `GET /v1/earn/portfolio/:userAddress/positions` — User Portfolio

All DeFi positions for a given wallet address.

**Example response:**

```json
{
  "positions": [
    {
      "chainId": 1,
      "protocolName": "morpho",
      "asset": {
        "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "name": "Morpho USDC Vault",
        "symbol": "USDC",
        "decimals": 6
      },
      "balanceUsd": "34.05",
      "balanceNative": "0.016"
    }
  ]
}
```

---

### Service 2: Composer (Transaction Execution)

**Base URL:** `https://li.quest`
**Auth:** API key from [LI.FI Partner Portal](https://portal.li.fi/) — include in request headers
**Full docs:** [docs.li.fi/composer/overview](https://docs.li.fi/composer/overview)

Composer orchestrates multi-step DeFi flows (swap → bridge → deposit) into a **single ready-to-sign transaction**.

#### `GET /v1/quote` — Build Transaction

**⚠️ This is a GET request with query parameters, NOT a POST.**

**Example: Deposit USDC into a Morpho vault on Base**

```
GET https://li.quest/v1/quote
  ?fromChain=8453
  &toChain=8453
  &fromToken=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
  &toToken=0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183
  &fromAddress=0xYOUR_WALLET
  &toAddress=0xYOUR_WALLET
  &fromAmount=1000000
```

**Parameters explained:**

| Parameter | Description |
|---|---|
| `fromChain` | Chain ID where user's tokens are (e.g., `8453` for Base) |
| `toChain` | Chain ID where the vault is |
| `fromToken` | Address of the token user is depositing from (from `underlyingTokens[].address`) |
| `toToken` | **Vault address** — the vault's `address` field IS the `toToken` |
| `fromAddress` | User's wallet address |
| `toAddress` | User's wallet address |
| `fromAmount` | Amount in smallest unit (e.g., `1000000` = 1 USDC with 6 decimals) |

**Response includes:**
- Gas estimate
- Slippage protection
- Ready-to-sign `transactionRequest`

#### What Composer Can Do

| Scenario | Description |
|---|---|
| **Same-chain deposit** | USDC on Base → Morpho vault on Base (single tx) |
| **Cross-chain deposit** | USDC on Arbitrum → Morpho vault on Base (bridge + deposit in one tx) |
| **Any-token deposit** | ETH on Ethereum → USDC vault on Base (swap + bridge + deposit) |
| **Withdrawals** | Exit vault position back to any token on any chain (if `isRedeemable: true`) |

This is the "mullet" — the user sees one click, Composer handles the multi-step DeFi plumbing behind the scenes.

---

### Typical Full Integration Flow

```
Step 1: Call GET https://earn.li.fi/v1/earn/vaults
        → No auth needed
        → Returns { data: [...vaults], nextCursor, total }
        → Display vault list to user (name, protocol, APY, TVL, tags)

Step 2: User picks a vault
        → Call GET https://earn.li.fi/v1/earn/vaults/:network/:address
        → Show vault detail page

Step 3: User clicks "Deposit"
        → Check vault's isTransactional === true
        → Call GET https://li.quest/v1/quote (with API key!)
        → fromToken = vault's underlyingTokens[0].address
        → toToken = vault's address
        → Composer builds full transaction (swap + bridge + deposit if needed)
        → Returns ready-to-sign transactionRequest
        → User signs in wallet (1-click)

Step 4: User checks portfolio
        → Call GET https://earn.li.fi/v1/earn/portfolio/:userAddress/positions
        → No auth needed
        → Shows all positions with current value
```

---

### Supported Chains (21)

Arbitrum, Avalanche, Base, Berachain, BNB Chain, Celo, Ethereum, Gnosis Chain, HyperEVM, Katana, Linea, Mantle, MegaETH, Monad, OP Mainnet, Polygon POS, Scroll, Soneium, Sonic, Unichain, World Chain

### Supported Protocols (20+)

| Protocol | Data API | Composer |
|---|---|---|
| Aave V3 | ✅ | ✅ |
| Avon | ✅ | ✅ |
| Concrete | — | ✅ |
| Ethena | ✅ | ✅ |
| Etherfi | ✅ | ✅ |
| Euler V2 | ✅ | ✅ |
| Felix Vanilla | — | ✅ |
| Fluid | ✅ | ✅ |
| Hyperlend (HyperEVM) | ✅ | ✅ |
| Hypurrfi | ✅ | ✅ |
| Kelp | ✅ | ✅ |
| Kinetiq (kHYPE) | ✅ | ✅ |
| Maple | ✅ | ✅ |
| Morpho V1 & V2 | ✅ | ✅ |
| Neverland | ✅ | ✅ |
| Pendle | ✅ | ✅ |
| Spark | ✅ | ✅ |
| Tokemak (autoUSD) | — | ✅ |
| Upshift | ✅ | ✅ |
| USDai | ✅ | ✅ |
| YO | ✅ | ✅ |

**Note:** Some protocols are Composer-only (can deposit but no data in Earn Data API). Protocol names in API responses use lowercase identifiers like `"morpho-v1"`, `"aave-v3"`, `"euler-v2"`, `"ethena-usde"`, `"ether.fi-stake"`.

### Technical Details

| Item | Value |
|---|---|
| **Earn Data API** | |
| Base URL (production) | `https://earn.li.fi` |
| Base URL (dev) | `https://earn-dev.li.fi` |
| Authentication | None required |
| Rate Limit | 100 requests per minute |
| Total Vaults | 672+ (paginated, use `nextCursor`) |
| APY Update Frequency | Periodic sync (not real-time) |
| APY Time Ranges | Current (`total`/`base`/`reward`) + 1d, 7d, 30d snapshots |
| **Composer** | |
| Base URL | `https://li.quest` |
| Authentication | API key from [LI.FI Partner Portal](https://portal.li.fi/) |
| Docs | [docs.li.fi/composer/overview](https://docs.li.fi/composer/overview) |
| **General** | |
| Earn Data Docs | [docs.li.fi/earn/overview](https://docs.li.fi/earn/overview) |

---

## ⚠️ Common Pitfalls

These are the most frequent mistakes. Review before building:

| Pitfall | What goes wrong | How to avoid |
|---|---|---|
| **Using wrong base URL** | Calls fail or return wrong data | Earn Data API → `earn.li.fi`. Composer → `li.quest`. Don't swap them. |
| **Adding auth to Earn Data API** | Unnecessary; may cause confusion | Earn Data API has no auth. Only Composer needs an API key. |
| **Missing API key on Composer** | Quote requests rejected | Get key from [portal.li.fi](https://portal.li.fi/), include in Composer requests |
| **POST instead of GET for /quote** | Request fails | Composer's `/v1/quote` is a **GET** with query params, not POST |
| **Wrong toToken for deposits** | Quote returns wrong result | `toToken` = the vault's `address` field, not the underlying token |
| **Ignoring pagination** | Only seeing first page of 672+ vaults | Use `nextCursor` from response to fetch all pages |
| **Not handling null APY values** | App crashes | `apy7d` and `apy.reward` can be `null` — always have fallbacks |
| **TVL is a string** | Type error | `analytics.tvl.usd` is a string like `"270595698"`, not a number. Parse it. |
| **Decimal mismatch** | Deposit 1 USDC but send 1e18 | Check `underlyingTokens[].decimals`. USDC = 6, ETH/wstETH = 18 |
| **Stale quote** | Transaction reverts | Build and execute the tx promptly. Don't let quotes sit for minutes |
| **No gas token** | Transaction can't be sent | Wallet needs native token (ETH, MATIC, etc.) for gas |
| **Chain mismatch** | Wallet on wrong network | Wallet must be on `fromChain` when signing |
| **Depositing into non-transactional vault** | No quote available | Check `isTransactional === true` before calling Composer |
| **Hitting rate limit** | 429 errors | Earn Data API allows 100 req/min. Cache vault lists, don't poll aggressively |
| **Submitting outside window** | Entry rejected | Schedule your tweet for April 14 within your region's window |

---

## 🏆 Prizes

| Prize | Amount (USDC) |
|---|---|
| 🏆 Grand Prize (best overall) | $800 |
| 🥇 1st place per track (×5) | $400 each |
| 🥈 2nd place per track (×5) | $200 each |
| 🥉 3rd place per track (×5) | $100 each |
| 🌟 Best Launch Day Content | $400 |

**Total: $5,000 USDC across 17 prizes.**

This is an early builder edition — the participant pool is small, and the odds of winning are high.

### Judging Criteria

| Dimension | Weight |
|---|---|
| API Integration | 35% |
| Innovation | 25% |
| Product Completeness | 20% |
| Presentation | 20% |

Multiple judges score independently; scores are averaged.

---

## 📤 Submission Requirements

Every submission has **4 parts**. ALL are required.

### 1. Working Project
A deployed web app OR a screen-recorded demo video showing the project working with real execution. Static mockups, Figma files, and slide decks do NOT count.

### 2. Public Tweet on X (Twitter)
Must be posted **during your region's submission window** on April 14.

Your tweet/thread MUST include:
- Project name + what it does
- Demo video or demo link
- Live app link OR GitHub repo link
- Track you're entering
- Tag @lifiprotocol and:
  - Tag @kenny_io if in English
  - Tag @brucexu_eth if in Chinese

### 3. Brief Write-Up
Cover these points:
- What your project does
- How it uses the Earn API (both Data API and Composer)
- What you'd build next
- Any feedback on the API experience

### 4. Submission Google Form
Fill out the form with your project details, links, and feedback: https://forms.gle/1PCvD9BymH1EyRmV8

---

## 💬 Support & Community

| Channel | Link |
|---|---|
| Telegram (all hackers) | https://t.me/lifibuilders |
| WeChat (APAC / Chinese) | Add **brucexu-eth**, reply "DeFi Mullet" |
| API Docs (Earn Data) | [docs.li.fi/earn/overview](https://docs.li.fi/earn/overview) |
| API Docs (Composer) | [docs.li.fi/composer/overview](https://docs.li.fi/composer/overview) |
| Partner Portal (Composer API key) | [portal.li.fi](https://portal.li.fi/) |

Daily office hours are scheduled across time zones. Post async questions in the community channel anytime — the DevRel team monitors throughout the week.

---

## ❓ FAQ

**Can I participate solo?**
Yes. Teams of 1–4 are welcome.

**Can I submit to multiple tracks?**
No. One submission per team. Pick the track where your project is strongest.

**Can I integrate Earn into an existing project?**
Yes. Only the Earn integration will be judged.

**Do I need real funds?**
Yes — submissions should demonstrate real execution. The team will airdrop small amounts of test funds upon request in the builder group.

**What counts as a "working project"?**
It should run. Deployed app is ideal; a solid screen-recorded demo showing real functionality also works. Static mockups and Figma prototypes don't count.

**What is "Best Launch Day Content"?**
A special $400 prize for the best tweet/thread — judged on content quality, clarity, and engagement. Separate from track prizes, so you can win both.

**How are prizes paid?**
In USDC, within 1–2 weeks of the winner announcement (~April 21). Winners will be contacted for wallet addresses.

**Will there be more hackathons?**
Yes. This is edition #1 (Builder Edition). A larger Ecosystem Edition with partner involvement and a bigger prize pool is planned. Strong builders from #1 get early access.

---

## 🚀 Quick-Start for Coding Agents

If you're a coding agent helping a participant, here's the fastest path to a working project:

```
1. Create or use the current folder, git init, and find a good starter template like Next.js
2. Install dependencies: npm install
3. Get Composer API key from https://portal.li.fi/ and set in .env
4. Note: Earn Data API needs no key — just call it directly
5. Run the dev server: npm run dev
6. The starter template has:
   - Wallet connection (wagmi/RainbowKit)
   - Earn Data API vault discovery (pre-wired)
   - Composer quote + deposit flow
   - Basic UI
7. Your job: customize the product layer on top
```

### Minimum Viable Integration

The absolute minimum to have a working Earn integration:

```typescript
// ============================================================
// Two services, two base URLs, two different auth requirements
// ============================================================

// Service 1: Earn Data API — NO AUTH NEEDED
const EARN_API = 'https://earn.li.fi';

// Service 2: Composer — API KEY REQUIRED
const COMPOSER_API = 'https://li.quest';
const COMPOSER_API_KEY = 'YOUR_KEY_FROM_PORTAL_LI_FI';

// ──────────────────────────────────────────────
// Step 1: Discover vaults (Earn Data API, no auth)
// ──────────────────────────────────────────────
const res = await fetch(`${EARN_API}/v1/earn/vaults?chainId=8453`);
const { data: vaults, total } = await res.json();

// Find a good stablecoin vault
const usdcVaults = vaults.filter(v =>
  v.underlyingTokens.some(t => t.symbol === 'USDC') &&
  v.isTransactional === true
);

const vault = usdcVaults.sort((a, b) =>
  b.analytics.apy.total - a.analytics.apy.total
)[0];

console.log(`Best: ${vault.name} on ${vault.network}`);
console.log(`  Protocol: ${vault.protocol.name}`);
console.log(`  APY: ${vault.analytics.apy.total}% (base: ${vault.analytics.apy.base}%, reward: ${vault.analytics.apy.reward ?? 0}%)`);
console.log(`  TVL: $${Number(vault.analytics.tvl.usd).toLocaleString()}`);
console.log(`  Tags: ${vault.tags.join(', ')}`);

// ──────────────────────────────────────────────
// Step 2: Build transaction via Composer (API key required)
// ──────────────────────────────────────────────
// ⚠️ This is a GET request, NOT POST
const quoteParams = new URLSearchParams({
  fromChain: String(vault.chainId),
  toChain: String(vault.chainId),
  fromToken: vault.underlyingTokens[0].address,  // e.g., USDC address
  toToken: vault.address,                          // vault address = toToken
  fromAddress: '0xYOUR_WALLET',
  toAddress: '0xYOUR_WALLET',
  fromAmount: '1000000'                            // 1 USDC (6 decimals)
});

const quote = await fetch(
  `${COMPOSER_API}/v1/quote?${quoteParams}`,
  {
    headers: { 'x-lifi-api-key': COMPOSER_API_KEY }
  }
).then(r => r.json());

// Step 3: Execute — send quote.transactionRequest via user's wallet

// ──────────────────────────────────────────────
// Step 4: Verify position (Earn Data API, no auth)
// ──────────────────────────────────────────────
const positions = await fetch(
  `${EARN_API}/v1/earn/portfolio/0xYOUR_WALLET/positions`
).then(r => r.json());
```

⚠️ **Always check the official docs for exact endpoint details:** [docs.li.fi](https://docs.li.fi)

---

## 🧠 Agent Decision Tree

Use this to guide the participant based on where they are:

```
START
├── Not registered?
│   → Send to registration form
│   → Help join Telegram/WeChat
│   → Help get Composer API key from portal.li.fi
│   → Confirm: Earn Data API needs no auth
│
├── Registered but no idea?
│   → Ask: "What's your background? (frontend / backend / full-stack / AI / design?)"
│   → Ask: "What excites you more: building a product, an AI agent, a beautiful UX, or a dev tool?"
│   → Based on answers, suggest 2–3 specific ideas from the track list
│   → Help narrow to ONE idea with a clear MVP scope
│
├── Has an idea but hasn't started?
│   → Help define MVP scope (what's the smallest working version?)
│   → Help clone the starter template
│   → Walk through the two-service architecture:
│       • Earn Data API (earn.li.fi, no auth) for discovery + portfolio
│       • Composer (li.quest, API key) for transaction execution
│   → Set up the project structure
│
├── Building?
│   → Help with API integration
│   → Check: are they using the right base URL for each service?
│   → Check: are they using GET (not POST) for /v1/quote?
│   → Check: are they handling null APY values and string TVL?
│   → Check: are they using vault.address as toToken?
│   → Debug issues (check Common Pitfalls first)
│   → Review code and suggest improvements
│   → Remind about submission requirements when relevant
│
├── Day 4–5 (April 13–14)?
│   → Switch to SUBMISSION MODE:
│   → "Have you recorded your demo?"
│   → "Have you drafted your tweet?"
│   → "Have you filled out the Google Form?"
│   → Help draft the tweet thread
│   → Help write the project description
│   → Remind about the submission window time
│
└── After April 14?
    → Submissions are closed.
    → Encourage them to keep building and join future editions.
```