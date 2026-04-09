import mongoose, { Schema, model, models } from "mongoose";

// ─── Strategy ───────────────────────────────────────────────────────────────
// A yield strategy posted by an alpha user to the social feed

const StrategySchema = new Schema(
  {
    author: { type: String, required: true, lowercase: true }, // 0x address
    vaultAddress: { type: String, required: true, lowercase: true },
    chainId: { type: Number, required: true },
    protocol: { type: String, required: true },
    chainName: { type: String, default: "" },
    vaultName: { type: String, default: "" },
    asset: { type: String, default: "USDC" },
    apy: { type: Number, default: 0 },          // stored as fraction (0.054)
    tvlUsd: { type: Number, default: 0 },
    riskLabel: { type: String, enum: ["Safe", "Balanced", "Degen"], default: "Balanced" },
    pitch: { type: String, default: "" },        // user's description
    followerCount: { type: Number, default: 0 }, // denormalized for leaderboard sort
    totalValueManaged: { type: Number, default: 0 }, // USD sum across all followers
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

StrategySchema.index({ author: 1 });
StrategySchema.index({ followerCount: -1 });
StrategySchema.index({ apy: -1 });
StrategySchema.index({ chainId: 1 });

// ─── Delegation ──────────────────────────────────────────────────────────────
// Saved ERC-7715 permission from a follower — used by backend relayer

const DelegationSchema = new Schema(
  {
    followerAddress: { type: String, required: true, lowercase: true },
    strategyId: { type: Schema.Types.ObjectId, ref: "Strategy", required: true },
    // ERC-7715 returned fields
    permissionContext: { type: String, required: true }, // Hex string
    delegationManager: { type: String, required: true }, // Address
    expiry: { type: Number, required: true },            // Unix timestamp
    chainId: { type: Number, required: true },
    // Amount the follower wants to allocate (in USDC, no decimals)
    amount: { type: Number, default: 100 },
    isActive: { type: Boolean, default: true },
    lastExecutedAt: { type: Date, default: null },
    executionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

DelegationSchema.index({ strategyId: 1, isActive: 1 });
DelegationSchema.index({ followerAddress: 1 });

// ─── Exports ─────────────────────────────────────────────────────────────────
export const Strategy = models.Strategy ?? model("Strategy", StrategySchema);
export const Delegation = models.Delegation ?? model("Delegation", DelegationSchema);
