// In-memory per-wallet mutex — no Redis needed for hackathon
// Prevents race conditions when multiple strategies need to execute concurrently

type UnlockFn = (() => void) | ((value?: unknown) => void);
const locks = new Map<string, Promise<UnlockFn>>();

export async function withLock<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  // Wait for existing lock on this key
  while (locks.has(key)) {
    await locks.get(key);
  }

  // Acquire new lock — create a promise that resolves when we get the lock
  let releaseFn!: UnlockFn;
  const lock = new Promise<UnlockFn>((resolve) => {
    releaseFn = resolve as UnlockFn;
  });
  locks.set(key, lock);

  try {
    return await fn();
  } finally {
    locks.delete(key);
    releaseFn();
  }
}
