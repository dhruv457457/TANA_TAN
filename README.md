# TANA-TAN 🔮

> **TANA finds the yield. TAN executes it.**

**TANA-TAN** is an AI-powered cross-chain yield optimizer built on LI.FI Earn. It combines natural language intent parsing, real-time vault discovery, proactive yield alerts, and one-click cross-chain execution — making DeFi yield as simple as having a conversation.

Submitted to: **DeFi Mullet Hackathon #1 — AI × Earn Track**

---

## What is TANA-TAN?

| Layer | What it does |
|-------|-------------|
| **TANA** | AI discovery layer — parses your intent, scores vaults by risk + APY stability, recommends a diversified portfolio |
| **TAN** | Execution layer — routes through LI.FI Composer, handles cross-chain swap+bridge+deposit atomically |

The name mirrors LI.FI's own architecture: **Earn Data API (TANA)** + **Composer (TAN)**.

---

## Core Features

### 1. Conversational Yield Intent
Type in plain English. TANA parses your goal into structured vault parameters.

```
"Put 500 USDC into the safest stablecoin vaults above 5% APY"
→ { asset: "USDC", minApy: 0.05, riskTolerance: "safe", amount: 500 }
```

Powered by Claude (Anthropic) via OpenRouter.

### 2. AI Risk Scoring
TANA scores every vault using three signals from the LI.FI Earn API:

```
stabilityScore = 1 - |apy.total - apy30d| / apy30d   (APY consistency)
tvlScore       = normalize(tvl.usd, 0, 50_000_000)    (liquidity depth)  
lockScore      = timeLock === 0 ? 1 : 0               (instant withdrawal)

riskScore = (stability × 0.5) + (tvl × 0.3) + (lock × 0.2)
```

Labels: **🟢 Safe** (>0.7) · **🟡 Balanced** (0.4–0.7) · **🔴 Degen** (<0.4)

### 3. Diversified Portfolio Allocation
TANA doesn't just pick one vault — it splits your deposit across 2–3 vaults based on your risk profile.

```
"Balanced portfolio with 1000 USDC"
→ 50% Morpho USDC Base (Safe, 5.3% APY)
   30% Aave USDC Arbitrum (Balanced, 6.1% APY)  
   20% Euler USDC Ethereum (Balanced, 5.8% APY)
```

### 4. Visual Route Map (The Mullet Moment)
When TAN builds the Composer quote, an animated flow diagram shows exactly what LI.FI is doing behind the scenes:

```
Your Wallet (USDC, Polygon)
        │
        ├──── Bridge via Stargate ──→ Base ──→ Morpho Vault
        │
        ├──── Swap USDC→USDC ────→ Arbitrum ──→ Aave Vault
        │
        └──── Swap + Bridge ──────→ Ethereum ──→ Euler Vault
```

Built with Framer Motion. Clean in the front, wild in the back.

### 5. Proactive Yield Alerts
A Node.js cron job runs every 24 hours:
- Checks your positions via `/v1/earn/portfolio/:address/positions`
- Compares against current top vaults from `/v1/earn/vaults`
- Fires a Telegram alert if your vault drops >1.5% OR a better vault appears >2% above yours

```
🚨 TANA Alert
Your Morpho USDC vault dropped to 3.1% APY.
Found: Euler USDC on Arbitrum at 6.8% APY (+3.7%)
[1-Tap Migrate →]
```

### 6. Portfolio Dashboard
Live positions pulled from LI.FI portfolio endpoint — balances, current APY, USD value, chain.

---

## Tech Stack

### Frontend — Next.js 15 (App Router)
```
app/
├── page.tsx              # Landing + chat interface
├── dashboard/page.tsx    # Portfolio positions
├── layout.tsx            # Root layout
components/
├── ChatInterface.tsx     # Conversational UI
├── VaultCard.tsx         # Vault recommendation card
├── RouteMap.tsx          # Animated Composer route viz
├── PortfolioDashboard.tsx
├── AlertBanner.tsx
lib/
├── lifi.ts               # LI.FI Earn API client
├── composer.ts           # LI.FI Composer (li.quest) client
├── scorer.ts             # Vault risk scoring logic
├── intent.ts             # Claude intent parser
hooks/
├── useVaults.ts
├── usePortfolio.ts
├── useComposerQuote.ts
```

**Key packages:**
```json
{
  "next": "^15.0.0",
  "react": "^19.0.0",
  "typescript": "^5.0.0",
  "wagmi": "^2.0.0",
  "viem": "^2.0.0",
  "@tanstack/react-query": "^5.0.0",
  "framer-motion": "^11.0.0",
  "zustand": "^5.0.0"
}
```

### Backend — Node.js + Express (TypeScript)
```
src/
├── index.ts              # Express app entry
├── routes/
│   ├── intent.ts         # POST /api/intent — Claude parsing
│   ├── vaults.ts         # GET /api/vaults — proxied + scored
│   ├── quote.ts          # POST /api/quote — Composer quote
│   ├── portfolio.ts      # GET /api/portfolio/:address
│   └── alerts.ts         # GET /api/alerts/:address
├── services/
│   ├── lifiEarn.ts       # LI.FI Earn Data API wrapper
│   ├── lifiComposer.ts   # LI.FI Composer wrapper
│   ├── claude.ts         # Anthropic intent parser
│   ├── scorer.ts         # Vault risk scoring
│   └── telegram.ts       # Telegram bot notifications
├── cron/
│   └── yieldMonitor.ts   # 24h alert cron job
└── types/
    └── index.ts          # Shared TypeScript types
```

**Key packages:**
```json
{
  "express": "^4.18.0",
  "typescript": "^5.0.0",
  "node-cron": "^3.0.0",
  "node-telegram-bot-api": "^0.64.0",
  "axios": "^1.6.0",
  "zod": "^3.22.0",
  "dotenv": "^16.0.0"
}
```

---

## LI.FI Integration Map

### Earn Data API (`https://earn.li.fi`)

| Endpoint | Used for |
|----------|----------|
| `GET /v1/earn/vaults` | Vault discovery + filtering |
| `GET /v1/earn/vaults/:chainId/:address` | Single vault details |
| `GET /v1/earn/chains` | Supported chain list |
| `GET /v1/earn/protocols` | Supported protocol list |
| `GET /v1/earn/portfolio/:address/positions` | User position tracking |

### Composer API (`https://li.quest`)

| Endpoint | Used for |
|----------|----------|
| `GET /v1/quote` | Build deposit transaction (swap+bridge+deposit) |

---

## Intent → Execution Flow

```
User types: "I want safe yield on 500 USDC"
                    │
                    ▼
         Claude parses intent
         { asset: "USDC", amount: 500,
           riskTolerance: "safe", minApy: 0.04 }
                    │
                    ▼
         TANA queries LI.FI Earn API
         GET /v1/earn/vaults?asset=USDC&sortBy=apy
                    │
                    ▼
         Risk scorer ranks vaults
         (stability + TVL + timelock signals)
                    │
                    ▼
         Portfolio allocator picks 2-3 vaults
         [Morpho Base 50%, Aave Arbitrum 30%, Euler ETH 20%]
                    │
                    ▼
         TANA shows recommendation + risk labels
         User clicks "Execute"
                    │
                    ▼
         TAN fetches Composer quotes
         GET /v1/quote for each vault allocation
                    │
                    ▼
         Route Map animates the execution path
         User sees: USDC → Bridge → Vault(s)
                    │
                    ▼
         Wallet signs (wagmi sendTransaction)
                    │
                    ▼
         Position verified via portfolio endpoint
         Dashboard updates live
```

---

## Proactive Alert Architecture

```
Node.js Cron (every 24h)
        │
        ▼
Fetch user positions
GET /v1/earn/portfolio/:address/positions
        │
        ▼
For each position, fetch current vault APY
GET /v1/earn/vaults/:chainId/:address
        │
        ▼
Fetch top 10 vaults for same asset
GET /v1/earn/vaults?asset=USDC&sortBy=apy&limit=10
        │
        ▼
Compare: dropped >1.5% OR better vault >2% above?
        │
   YES  │  NO
        │
        ▼
Send Telegram alert with 1-tap migrate deeplink
```

---

## Project Structure

```
tana-tan/
├── apps/
│   ├── web/                    # Next.js 15 frontend
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── hooks/
│   │   └── package.json
│   └── server/                 # Node.js Express backend
│       ├── src/
│       └── package.json
├── packages/
│   └── types/                  # Shared TypeScript types
│       └── index.ts
├── .env.example
├── turbo.json                  # Turborepo (optional)
└── README.md
```

---

## Environment Variables

```env
# Frontend (apps/web/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=

# Backend (apps/server/.env)
PORT=3001
LIFI_API_KEY=                    # From li.fi/plans
ANTHROPIC_API_KEY=               # Or OpenRouter key
TELEGRAM_BOT_TOKEN=              # From @BotFather
NODE_ENV=development
```

---

## Getting Started

```bash
# Clone
git clone https://github.com/dhruv457457/tana-tan
cd tana-tan

# Install dependencies
npm install

# Set up env
cp .env.example apps/web/.env.local
cp .env.example apps/server/.env
# Fill in your API keys

# Run both apps
npm run dev
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

---

## Design Language

**Modern cream aesthetic** — clean white/cream surfaces, bold yellow accents, playful but professional.

```
Background:   #FAF6EE (cream)
Surface:      #FFFFFF (white)
Border:       #1A1A1A (black, 2px solid)
Accent:       #F5B731  (TANA — discovery/gold)
Accent2:      #4CAF82  (success/green)
Accent3:      #F06292  (withdraw/pink)
Text:         #1A1A1A (primary)
Muted:        #888888 (secondary)
Font:         "Plus Jakarta Sans" + "Syne" (display)
```

Risk labels use color-coded chips:
- 🟢 Safe → `#4CAF82`
- 🟡 Balanced → `#F5B731`
- 🔴 Degen → `#F06292`

**Social Features:**
- User profile pages at `/profile/[address]`
- Strategy feed with trending leaderboard
- Click on author to view their profile
- Follow/unfollow strategies with one click
- Auto-execution when alpha moves funds

---

## Judging Criteria Alignment

| Dimension | Weight | How TANA-TAN covers it |
|-----------|--------|------------------------|
| API Integration | 35% | All 5 Earn endpoints + Composer quote. Portfolio tracking. Cron uses portfolio API. |
| Innovation | 25% | Risk scoring using apy30d stability signal. Proactive alerts. Visual route map. Split TANA/TAN identity mirroring LI.FI's own two-layer architecture. |
| Product Completeness | 20% | Full flow: intent → discover → score → allocate → execute → verify → alert |
| Presentation | 20% | Cream UI with animated route visualization, profile pages, trending leaderboard |

---

## Submission Checklist

- [ ] Working demo deployed (Vercel + Railway)
- [ ] Demo video recorded (showing full intent→execution→alert flow)
- [ ] Tweet scheduled for April 14, APAC window (9AM–12PM UTC+8 = 11:30AM–2:30PM IST)
- [ ] Tweet includes: project name, demo video, GitHub, track, @lifiprotocol @brucexu_eth
- [ ] Write-up: what it does, how Earn API is used, what's next, API feedback
- [ ] Google Form submitted: https://forms.gle/1PCvD9BymH1EyRmV8

---

## What's Next (Post-Hackathon)

- Smart contract vault positions (on-chain strategy storage)
- Email/push notifications alongside Telegram
- Auto-rebalance with single approval (Account Abstraction)
- Historical yield performance charts
- Multi-wallet portfolio aggregation

---

## Built With

- [LI.FI Earn API](https://docs.li.fi/earn/overview) — vault discovery, portfolio tracking
- [LI.FI Composer](https://li.quest) — cross-chain swap+bridge+deposit execution
- [Anthropic Claude](https://anthropic.com) — natural language intent parsing
- [Next.js 15](https://nextjs.org) — frontend framework
- [wagmi v2](https://wagmi.sh) — wallet connection + tx execution
- [Framer Motion](https://www.framer.com/motion/) — route visualization animations
- [node-cron](https://github.com/node-cron/node-cron) — proactive alert scheduler

---

*TANA finds the yield. TAN executes it.*