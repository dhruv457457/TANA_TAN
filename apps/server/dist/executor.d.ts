export interface ExecutionResult {
    follower: string;
    txHash?: string;
    sweepHash?: string;
    error?: string;
    status: "success" | "failed";
    vault?: {
        name: string;
        protocol: string;
        apy: number;
        tvl: number;
        tags: string[];
        isTransactional: boolean;
        isRedeemable: boolean;
        verifiedByLiFi: boolean;
    };
    positionAfter?: {
        balanceUsd: string;
        verifiedByLiFi: boolean;
    };
}
export declare function executeStrategy(strategyId: string, executorAddress: string, lastTriggeredAt?: Date): Promise<ExecutionResult[]>;
