# TANA-TAN — Social Cross-Chain Yield Platform

> **DeFi Mullet Hackathon #1 submission** · Track 1: Yield Builder + Track 2: AI × Earn

Business in the front: a Twitter-style social feed where DeFi strategists share their vault positions.  
Wild in the back: when an alpha strategist moves funds, followers' positions copy automatically — driven by LI.FI's powerful APIs with MetaMask delegations for automation.

---

## What It Does

1. **Social Feed** — Users post their live vault positions as strategies. Others browse, like, and follow with one click.
2. **AI Yield Chat** — Type "put 500 USDC in a safe Base vault above 5% APY". Claude parses the intent, LI.FI Earn finds matching vaults, Composer builds the deposit tx, user signs once.
3. **1-Click Copy Trade** — Follower grants a MetaMask ERC-7715 Advanced Permission once. TANA's backend relayer uses LI.FI Composer to auto-copy deposits on-chain.
4. **Portfolio Dashboard** — Live positions with APY, TVL, vault addresses, and one-click withdraw via LI.FI Composer.
5. **Leaderboard** — Top strategists ranked by followers, with live APY enriched from LI.FI Earn.

---

## The Core: LI.FI Earn + Composer

This project is built on top of **LI.FI's two APIs** — Earn for data, Composer for transactions. The advanced permissions system (via MetaMask) exists to automate the Composer calls.

### LI.FI Earn API (`earn.li.fi`)

Vault discovery, real-time APY/TVL, portfolio positions — all comes from LI.FI Earn:

```typescript
// apps/web/lib/lifi.ts
const { data } = await earnClient.get("/v1/earn/vaults", {
  params: { chainId: 8453, asset: "USDC", sortBy: "apy", limit: 50 }
});
// Returns: vault address, name, protocol, APY (base/reward/total), TVL, chainId
```

**What we use it for:**
- AI yield chat vault search
- Leaderboard APY enrichment (batch-fetched per chain)
- Portfolio position lookup (`/v1/earn/portfolio/{address}/positions`)
- Real-time APY display on every strategy card

### LI.FI Composer API (`li.quest`)

The transaction builder — takes any token → any token/vault and returns a ready-to-sign transaction:

```typescript
// apps/web/lib/lifi.ts
const quote = await composerClient.get("/v1/quote", {
  params: {
    fromChain: "8453",
    toChain: "8453",
    fromToken: USDC_ADDRESS,
    toToken: vaultAddress,  // vault contract = share token
    fromAmount: "500000000",  // 500 USDC
    fromAddress: userAddress,
    toAddress: userAddress,
    integrator: "tana-tan",
  }
});
// Returns: transactionRequest (to, data, value) — user signs once
```

**What we use it for:**
- Manual deposits (one-click from strategy card)
- AI chat deposits (after Claude picks a vault)
- Withdrawals (fromToken = vault, toToken = USDC)
- **Automated copy-trades** — backend calls Composer after redeeming MetaMask permission

### The Key Insight

The vault address from Earn API (`0x1234...`) is used directly as `toToken` in Composer. One address = vault contract = share token. Composer resolves the full multi-step flow (approve → deposit, or swap → bridge → deposit) into a single ready-to-sign transaction.

---

## MetaMask Advanced Permissions (ERC-7715 + ERC-7710)

These permissions enable the **automated** part — they let the backend trigger Composer calls without the user signing every time.

### How it works

**ERC-7715 — Permission Request (follower side)**

The follower approves a single MetaMask popup granting a time-limited, amount-limited USDC transfer permission to TANA's backend:

```typescript
// hooks/useCopyStrategy.ts
const grantedPermissions = await walletClient.requestExecutionPermissions([{
  chainId: chain.id,
  expiry: Math.floor(Date.now() / 1000) + 30 * 86400,  // 30 days
  signer: { type: "account", data: { address: BACKEND_ADDRESS } },
  permission: {
    type: "erc20-token-periodic",
    data: {
      tokenAddress: USDC_ADDRESS,
      periodAmount: parseUnits(String(amount), 6),
      periodDuration: 86400,
      justification: "Auto-copy this DeFi yield strategy",
    },
  },
  isAdjustmentAllowed: true,
}]);
// permissionContext + delegationManager saved to MongoDB
```

**ERC-7710 — Permission Redemption (backend relayer)**

The backend EOA redeems the permission and then calls LI.FI Composer to deposit on follower's behalf:

```typescript
// apps/server/src/executor.ts

// 1. Transfer USDC from follower to relayer (via ERC-7710)
const txHash = await backendWalletClient.sendTransactionWithDelegation({
  to: USDC_ADDRESS,
  data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [relayer, amountIn] }),
  permissionsContext: delegation.permissionContext,
  delegationManager: delegation.delegationManager,
});

// 2. Build Composer quote for vault deposit
const quote = await fetchComposerQuote({
  fromChainId: chainId,
  toChainId: chainId,
  fromTokenAddress: USDC_ADDRESS,
  toTokenAddress: vaultAddress,
  fromAmount: amountIn,
  fromAddress: relayer,
  toAddress: follower,
  integrator: "tana-tan",
});

// 3. Execute deposit on follower's behalf
await relayer.sendTransaction(quote.transactionRequest);
```

**Requirements:** MetaMask Flask 13.5.0+ · User must have a MetaMask Smart Account (ERC-7702 upgraded EOA)

### Permission Lifecycle in Code

| Step | File | What happens |
|---|---|---|
| 1. Request permission | [`hooks/useCopyStrategy.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/hooks/useCopyStrategy.ts) | `requestExecutionPermissions()` via ERC-7715 |
| 2. Save to DB | [`app/api/delegations/route.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/app/api/delegations/route.ts) | Stores `permissionContext + delegationManager` in MongoDB |
| 3. Alpha triggers | [`app/api/strategies/[id]/like/route.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/app/api/strategies/%5Bid%5D/like/route.ts) | Sets `strategy.lastTriggeredAt` |
| 4. Poller detects | [`apps/server/src/poller.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/server/src/poller.ts) | Finds delegations where `lastExecutedAt < lastTriggeredAt` |
| 5. Execute copy | [`apps/server/src/executor.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/server/src/executor.ts) | ERC-7710 → LI.FI Composer deposit |
| 6. Revoke | [`hooks/useRevokeDelegation.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/hooks/useRevokeDelegation.ts) | Follower can revoke at any time |

---

## Architecture

```
apps/
├── web/          Next.js 14 App Router — frontend + all API routes
└── server/       Node.js backend relayer — automated copy-trade execution
```

### LI.FI Files

| File | Purpose |
|---|---|
| [`apps/web/lib/lifi.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/lib/lifi.ts) | Core helpers: `fetchVaults`, `fetchVaultDetail`, `fetchPortfolioPositions`, `fetchComposerQuote` |
| [`app/api/vaults/route.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/app/api/vaults/route.ts) | Proxy → `earn.li.fi/v1/earn/vaults` (adds API key + caching) |
| [`app/api/portfolio/[address]/route.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/app/api/portfolio/%5Baddress%5D/route.ts) | Fetches portfolio positions, enriches with vault metadata via per-chain batch lookup |
| [`app/api/quote/route.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/app/api/quote/route.ts) | Proxy → `li.quest/v1/quote` for deposit transactions |
| [`app/api/withdraw/route.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/app/api/withdraw/route.ts) | LI.FI Composer withdrawal quotes; reads vault `decimals()` on-chain for correct scaling |
| [`app/api/leaderboard/route.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/app/api/leaderboard/route.ts) | Batches LI.FI vault lookups by chain — one request per chain for O(1) APY enrichment |
| [`apps/server/src/executor.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/server/src/executor.ts) | Server-side LI.FI Composer calls inside automated copy-trade execution |

---

### Copy-Trade Flow

```
Follower clicks "Follow & Auto-Copy"
        │
        ▼
walletClient.requestExecutionPermissions()     ← ERC-7715 (MetaMask Flask)
    erc20-token-periodic permission for USDC → backend EOA
        ▼
POST /api/delegations  →  MongoDB
    stores { permissionContext, delegationManager, expiry }
        │
        │   [Alpha deposits into vault]
        ▼
Node.js Poller — every 5 min          ←  apps/server/src/poller.ts
    finds delegations where lastExecutedAt < strategy.lastTriggeredAt
        ▼
Executor                              ←  apps/server/src/executor.ts
        │
        ├── sendTransactionWithDelegation()    ← ERC-7710 (viem + MetaMask SDK)
        │       USDC.transfer(relayer, amount)
        │
        ├── fetchComposerQuote()               ← LI.FI Composer /v1/quote
        │       fromToken=USDC, toToken=vaultAddress
        │
        └── relayer.sendTransaction(composerTx)
                deposits USDC into vault on follower's behalf
```

**The backend relayer is a plain EOA.** It pays its own L2 gas (Base fees are ~$0.001). No paymasters, no bundlers, no ERC-4337.

---

### AI Yield Chat Flow

```
User: "safe USDC yield on Base above 5%"
        │
        ▼
POST /api/intent  →  Claude (intent parsing)
    returns { asset, amount, riskTolerance, minApy, chainIds }
        ▼
GET earn.li.fi/v1/earn/vaults?chainId=8453
        │   filter + risk-score vaults  ←  apps/web/lib/scorer.ts
        ▼
GET li.quest/v1/quote  (per selected vault)
        │   builds ready-to-sign deposit transaction
        ▼
User signs once in MetaMask  →  funds deposited
```

---

### Full Module Map

| Module | Key Files |
|---|---|
| Social feed | [`app/page.tsx`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/app/page.tsx) · [`components/StrategyCard.tsx`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/components/StrategyCard.tsx) · [`app/api/strategies/route.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/app/api/strategies/route.ts) |
| AI chat | [`components/ChatInterface.tsx`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/components/ChatInterface.tsx) · [`app/api/intent/route.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/app/api/intent/route.ts) · [`lib/scorer.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/lib/scorer.ts) |
| Manual deposit | [`components/ManualDepositWithdraw.tsx`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/components/ManualDepositWithdraw.tsx) · [`app/api/quote/route.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/app/api/quote/route.ts) |
| Portfolio | [`components/PortfolioDashboard.tsx`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/components/PortfolioDashboard.tsx) · [`app/api/portfolio/[address]/route.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/app/api/portfolio/%5Baddress%5D/route.ts) |
| Copy trade | [`hooks/useCopyStrategy.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/hooks/useCopyStrategy.ts) · [`server/src/executor.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/server/src/executor.ts) · [`server/src/poller.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/server/src/poller.ts) |
| Withdraw | [`app/api/withdraw/route.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/app/api/withdraw/route.ts) · [`hooks/useWithdraw.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/hooks/useWithdraw.ts) |
| Leaderboard | [`app/api/leaderboard/route.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/app/api/leaderboard/route.ts) · [`app/dashboard/page.tsx`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/app/dashboard/page.tsx) |
| Profile | [`components/EditProfileModal.tsx`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/components/EditProfileModal.tsx) · [`app/api/profile/[address]/route.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/app/api/profile/%5Baddress%5D/route.ts) |
| LI.FI helpers | [`lib/lifi.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/lib/lifi.ts) · [`lib/logos.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/web/lib/logos.ts) |
| DB models | [`server/src/models.ts`](https://github.com/dhruv457457/TANA_TAN/blob/main/apps/server/src/models.ts) — Strategy, Delegation, ExecutionLog |

---

## Why Social Copy-Trading Wins

Most yield aggregators are solo experiences. You find a vault, deposit, and hope. TANA-TAN makes yield **social and self-executing**:

- **Alpha follows alpha.** When a trusted strategist moves USDC from Aave to a Morpho vault at 16% APY, every follower copies that move automatically — same block, zero gas from the follower.
- **Non-custodial by design.** The backend never holds funds. ERC-7715 grants a time-limited, amount-limited permission. The follower can revoke at any time from their MetaMask.
- **Cross-chain ready.** LI.FI Composer handles any-token → any-vault routing. A follower on Arbitrum with ETH can auto-copy an alpha depositing USDC into a Base Morpho vault — one permission covers it.
- **Transparent track record.** Strategy cards show live APY, TVL, follower count, and full execution history on-chain. You verify before you follow.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, Tailwind CSS, Framer Motion |
| Yield data & transactions | LI.FI Earn API + LI.FI Composer API |
| Web3 | wagmi, viem, MetaMask Smart Accounts Kit (ERC-7715 + ERC-7710) |
| AI | Anthropic Claude — intent parsing |
| Database | MongoDB (Mongoose) |
| Backend relayer | Node.js + node-cron (5-min polling) |

---

## How We Used LI.FI

| Feature | LI.FI Endpoint |
|---|---|
| Vault discovery (AI + manual deposit) | `GET earn.li.fi/v1/earn/vaults?chainId=X` |
| Live APY + TVL on strategy cards | `GET earn.li.fi/v1/earn/vaults?chainId=X` batched per chain |
| Portfolio positions | `GET earn.li.fi/v1/earn/portfolio/{addr}/positions` |
| Deposit (manual + automated copy) | `GET li.quest/v1/quote?fromToken=USDC&toToken={vaultAddr}` |
| Withdraw | `GET li.quest/v1/quote?fromToken={vaultAddr}&toToken=USDC` |

**The DeFi Mullet:** Vault address from Earn API = `toToken` in Composer. One address = vault contract = share token. Composer resolves approve → deposit into a single ready-to-sign transaction.