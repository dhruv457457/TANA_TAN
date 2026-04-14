export declare function withLock<T>(key: string, fn: () => Promise<T>): Promise<T>;
