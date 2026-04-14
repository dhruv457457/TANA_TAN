import mongoose, { Model, Document } from "mongoose";
export interface IStrategy extends Document {
    author: string;
    vaultAddress: string;
    chainId: number;
    protocol: string;
    chainName: string;
    vaultName: string;
    asset: string;
    apy: number;
    tvlUsd: number;
    riskLabel: "Safe" | "Balanced" | "Degen";
    pitch: string;
    followerCount: number;
    totalValueManaged: number;
    isActive: boolean;
    lastTriggeredAt: Date | null;
}
export interface IDelegation extends Document {
    followerAddress: string;
    strategyId: mongoose.Types.ObjectId;
    permissionContext: string;
    delegationManager: string;
    expiry: number;
    chainId: number;
    amount: number;
    isActive: boolean;
    lastExecutedAt: Date | null;
    executionCount: number;
}
export interface IExecutionLog extends Document {
    delegationId: mongoose.Types.ObjectId;
    strategyId: mongoose.Types.ObjectId;
    followerAddress: string;
    txHash: string;
    sweepHash: string;
    amount: number;
    vaultAddress: string;
    chainId: number;
    status: "success" | "failed";
    error: string;
    executedAt: Date;
}
declare global {
    var _mongoModels: {
        Strategy?: Model<IStrategy>;
        Delegation?: Model<IDelegation>;
        ExecutionLog?: Model<IExecutionLog>;
    } | undefined;
}
export declare const Strategy: mongoose.Model<IStrategy, {}, {}, {}, mongoose.Document<unknown, {}, IStrategy, {}, mongoose.DefaultSchemaOptions> & IStrategy & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IStrategy>;
export declare const Delegation: mongoose.Model<IDelegation, {}, {}, {}, mongoose.Document<unknown, {}, IDelegation, {}, mongoose.DefaultSchemaOptions> & IDelegation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IDelegation>;
export declare const ExecutionLog: mongoose.Model<IExecutionLog, {}, {}, {}, mongoose.Document<unknown, {}, IExecutionLog, {}, mongoose.DefaultSchemaOptions> & IExecutionLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IExecutionLog>;
