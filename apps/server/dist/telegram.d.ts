export interface TelegramAlertParams {
    follower: string;
    vaultName: string;
    protocol: string;
    amount: number;
    apy: number;
    txHash: string;
    sweepHash: string;
    chainName: string;
    status: "success" | "failed";
    error?: string;
}
export declare function sendTelegramAlert(params: TelegramAlertParams): Promise<void>;
