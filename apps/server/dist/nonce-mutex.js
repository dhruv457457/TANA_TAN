// In-memory per-wallet mutex — no Redis needed for hackathon
// Prevents race conditions when multiple strategies need to execute concurrently
const locks = new Map();
export async function withLock(key, fn) {
    // Wait for existing lock on this key
    while (locks.has(key)) {
        await locks.get(key);
    }
    // Acquire new lock — create a promise that resolves when we get the lock
    let releaseFn;
    const lock = new Promise((resolve) => {
        releaseFn = resolve;
    });
    locks.set(key, lock);
    try {
        return await fn();
    }
    finally {
        locks.delete(key);
        releaseFn();
    }
}
