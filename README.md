# TANA-TAN — Social Cross-Chain Yield Platform

> **DeFi Mullet Hackathon #1 submission** · Track 1: Yield Builder + Track 2: AI × Earn

Business in the front: a Twitter-style social feed where DeFi strategists share their vault positions.
Wild in the back: when an alpha strategist moves funds, followers' positions copy automatically — MetaMask delegations trigger LI.FI Composer, zero clicks from the follower.

---

## What It Does

1. **Social Feed** — Users post their live vault positions as strategies. Others browse, like, and follow with one click.
2. **1-Click Copy Trade** — Follower grants a MetaMask ERC-7715 permission once. Every time the alpha deposits, TANA's backend relayer auto-copies it on-chain using LI.FI Composer.
3. **AI Yield Chat** — Type "put 500 USDC in a safe Base vault above 5% APY". Claude parses the intent, LI.FI Earn finds matching vaults, Composer builds the deposit tx, user signs once.
4. **Portfolio Dashboard** — Live positions with APY, TVL, vault addresses, and one-click withdraw via LI.FI Composer.
5. **Leaderboard** — Top strategists ranked by followers, with live APY enriched from LI.FI Earn.

---

## Architecture

```
apps/
├── web/          Next.js 14 App Router — frontend + all API routes
└── server/       Node.js backend relayer — automated copy-trade execution
```

### LI.FI Integration — Two APIs, Two Roles

| Layer | Base URL | Auth | Role |
|---|---|---|---|
| **Earn Data API** | `earn.li.fi` | none | Vault discovery, APY/TVL data, portfolio positions |
| **Composer API** | `li.quest` | API key | Building deposit + withdraw transactions |

#### LI.FI Files

| File | Purpose |
|---|---|
| `apps/web/lib/lifi.ts` | Core helpers: `fetchVaultDetail`, `fetchComposerQuote`, `getAllVaults` |
| `apps/web/app/api/vaults/route.ts` | Proxy → `earn.li.fi/v1/earn/vaults` (auth + caching) |
| `apps/web/app/api/portfolio/[address]/route.ts` | Fetches portfolio positions, enriches with vault metadata via per-chain batch lookup |
| `apps/web/app/api/quote/route.ts` | Proxy → `li.quest/v1/quote` for deposit transactions |
| `apps/web/app/api/withdraw/route.ts` | LI.FI Composer withdrawal quotes; reads vault `decimals()` on-chain for correct scaling |
| `apps/web/app/api/leaderboard/route.ts` | Batches LI.FI vault lookups by chain — one request per chain for O(1) APY enrichment |
| `apps/server/src/executor.ts` | Server-side LI.FI Composer calls inside automated copy-trade execution |

---

### Copy-Trade Flow (ERC-7715 + ERC-7710 + LI.FI Composer)

```
Follower clicks "Follow & Auto-Copy"
        │
        ▼
walletClient.requestExecutionPermissions()     ← ERC-7715 (MetaMask Flask)
        │   grants erc20-token-periodic permission for USDC
        ▼
POST /api/delegations  →  MongoDB
        │   stores { permissionContext, delegationManager, expiry }
        │
        │   [Alpha deposits into vault — triggers strategy]
        ▼
Node.js Poller — runs every 5 min          ←  apps/server/src/poller.ts
        │   finds delegations where lastExecutedAt < strategy.lastTriggeredAt
        ▼
Executor                                   ←  apps/server/src/executor.ts
        │
        ├── sendTransactionWithDelegation()     ← ERC-7710 (viem + MetaMask SDK)
        │       USDC.transfer(relayer, amount)
        │
        ├── fetchComposerQuote()                ← LI.FI Composer /v1/quote
        │       fromToken=USDC, toToken=vaultAddress
        │
        └── relayer.sendTransaction(composerTx)
                deposits USDC into vault on follower's behalf
```

The backend relayer is a standard EOA (private key). It pays its own L2 gas. **No paymasters, no ERC-4337 bundlers.**

---

### AI Yield Chat Flow

```
User: "safe USDC yield on Base above 5%"
        │
        ▼
POST /api/intent  →  Claude (intent parsing)
        │   returns { asset, amount, riskTolerance, minApy, chainIds }
        ▼
GET earn.li.fi/v1/earn/vaults?chainId=8453
        │   filter + score (apps/web/lib/scorer.ts)
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
| Social feed | `apps/web/app/page.tsx`, `components/StrategyCard.tsx`, `app/api/strategies/route.ts` |
| AI chat | `components/ChatInterface.tsx`, `app/api/intent/route.ts`, `lib/intent.ts`, `lib/scorer.ts` |
| Manual deposit | `components/ManualDepositWithdraw.tsx`, `app/api/quote/route.ts` |
| Portfolio | `components/PortfolioDashboard.tsx`, `app/api/portfolio/[address]/route.ts` |
| Copy trade (frontend) | `hooks/useCopyStrategy.ts`, `app/api/delegations/route.ts` |
| Copy trade (backend) | `apps/server/src/executor.ts`, `apps/server/src/poller.ts` |
| Withdraw | `app/api/withdraw/route.ts`, `hooks/useWithdraw.ts` |
| Leaderboard | `app/api/leaderboard/route.ts`, `app/dashboard/page.tsx` |
| Profile + social | `components/EditProfileModal.tsx`, `app/api/profile/[address]/route.ts` |
| LI.FI helpers | `apps/web/lib/lifi.ts`, `apps/web/lib/logos.ts` |
| DB models | `apps/server/src/models.ts` — Strategy, Delegation, ExecutionLog |

---

## Why Social Copy-Trading Wins

Most yield aggregators are solo. You find a vault, deposit, and hope. TANA-TAN makes yield **social and self-executing**:

- **Alpha follows alpha.** When a trusted strategist moves 10k USDC from Aave to a Morpho vault at 16% APY, every follower copies that move automatically — same block, zero gas from the follower.
- **Non-custodial by design.** The backend never holds funds. MetaMask ERC-7715 grants a time-limited, amount-limited transfer permission. The relayer only redeems it when the alpha triggers. The follower can revoke at any time.
- **Cross-chain ready.** LI.FI Composer handles any-token → any-vault routing. A follower on Arbitrum with ETH can auto-copy an alpha depositing USDC into a Base Morpho vault — one permission grant covers it.
- **Transparent track record.** Strategy cards show live APY, TVL, follower count, and full execution history. You can verify before you follow.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, Tailwind CSS, Framer Motion |
| Web3 | wagmi, viem, MetaMask Smart Accounts Kit (ERC-7715 + ERC-7710) |
| Yield data | LI.FI Earn API (`earn.li.fi`) |
| Transactions | LI.FI Composer (`li.quest`) |
| AI | Anthropic Claude — intent parsing |
| Database | MongoDB (Mongoose) |
| Backend relayer | Node.js + node-cron (5-min polling) |
| Alerts | Telegram bot |

---

## How We Used LI.FI Earn + Composer

| Feature | LI.FI Endpoint |
|---|---|
| Vault discovery (AI + manual deposit) | `GET earn.li.fi/v1/earn/vaults?chainId=X` |
| Live APY + TVL on strategy cards | `GET earn.li.fi/v1/earn/vaults?chainId=X` batched per chain |
| Portfolio positions | `GET earn.li.fi/v1/earn/portfolio/{addr}/positions` |
| Deposit (manual + automated copy) | `GET li.quest/v1/quote?fromToken=USDC&toToken={vaultAddr}` |
| Withdraw | `GET li.quest/v1/quote?fromToken={vaultAddr}&toToken=USDC` |

The key insight: **`vault.address` from the Earn API is used directly as `toToken` in Composer.** One address = vault contract = share token. LI.FI Composer resolves the multi-step flow (approve → deposit or swap → bridge → deposit) into a single ready-to-sign transaction. That's the DeFi Mullet.
