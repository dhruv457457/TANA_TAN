import mongoose, { Schema, model, models } from "mongoose";

// ─── Strategy ───────────────────────────────────────────────────────────────
const StrategySchema = new Schema(
  {
    author: { type: String, required: true, lowercase: true },
    vaultAddress: { type: String, required: true, lowercase: true },
    chainId: { type: Number, required: true },
    protocol: { type: String, required: true },
    protocolLogoUri: { type: String, default: "" },
    chainName: { type: String, default: "" },
    vaultName: { type: String, default: "" },
    asset: { type: String, default: "USDC" },
    apy: { type: Number, default: 0 },
    tvlUsd: { type: Number, default: 0 },
    riskLabel: { type: String, enum: ["Safe", "Balanced", "Degen"], default: "Balanced" },
    pitch: { type: String, default: "" },
    followerCount: { type: Number, default: 0 },
    totalValueManaged: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastTriggeredAt: { type: Date, default: null },
    likes: { type: [String], default: [] },        // array of wallet addresses
    imageUrl: { type: String, default: "" },        // Cloudinary image for the post
  },
  { timestamps: true }
);

StrategySchema.index({ author: 1 });
StrategySchema.index({ followerCount: -1 });
StrategySchema.index({ apy: -1 });
StrategySchema.index({ chainId: 1 });

// ─── Delegation ──────────────────────────────────────────────────────────────
const DelegationSchema = new Schema(
  {
    followerAddress: { type: String, required: true, lowercase: true },
    strategyId: { type: Schema.Types.ObjectId, ref: "Strategy", required: true },
    permissionContext: { type: String, required: true },
    delegationManager: { type: String, required: true },
    expiry: { type: Number, required: true },
    chainId: { type: Number, required: true },
    amount: { type: Number, default: 100 },
    isActive: { type: Boolean, default: true },
    lastExecutedAt: { type: Date, default: null },
    executionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

DelegationSchema.index({ strategyId: 1, isActive: 1 });
DelegationSchema.index({ followerAddress: 1 });

// ─── ExecutionLog ───────────────────────────────────────────────────────────
const ExecutionLogSchema = new Schema(
  {
    delegationId: { type: Schema.Types.ObjectId, ref: "Delegation", required: true },
    strategyId: { type: Schema.Types.ObjectId, ref: "Strategy", required: true },
    followerAddress: { type: String, required: true, lowercase: true },
    txHash: { type: String, default: "" },
    sweepHash: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    vaultAddress: { type: String, default: "" },
    chainId: { type: Number, default: 8453 },
    status: { type: String, enum: ["success", "failed"], default: "success" },
    error: { type: String, default: "" },
    executedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ExecutionLogSchema.index({ followerAddress: 1, executedAt: -1 });
ExecutionLogSchema.index({ strategyId: 1, executedAt: -1 });

// ─── UserProfile ─────────────────────────────────────────────────────────────
const UserProfileSchema = new Schema(
  {
    address: { type: String, required: true, lowercase: true, unique: true },
    displayName: { type: String, default: "" },
    bio: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    twitterHandle: { type: String, default: "" },
    websiteUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

UserProfileSchema.index({ address: 1 }, { unique: true });

// ─── Exports ─────────────────────────────────────────────────────────────────
export const Strategy = models.Strategy ?? model("Strategy", StrategySchema);
export const Delegation = models.Delegation ?? model("Delegation", DelegationSchema);
export const ExecutionLog = models.ExecutionLog ?? model("ExecutionLog", ExecutionLogSchema);
export const UserProfile = models.UserProfile ?? model("UserProfile", UserProfileSchema);
