// In-process sliding-window rate limiter.
// Fine for single-instance deploys (Vercel serverless functions share no memory
// between instances, so this is per-instance protection — good enough to stop
// naive spam. For distributed rate-limiting, swap the store for Redis/Upstash).

type Entry = { count: number; windowStart: number };

const store = new Map<string, Entry>();

// Clean up stale keys every 5 minutes so memory doesn't grow unbounded.
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
let pruneTimer: ReturnType<typeof setInterval> | null = null;

function ensurePruner(windowMs: number) {
  if (pruneTimer) {
    return;
  }
  pruneTimer = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, entry] of store) {
      if (entry.windowStart < cutoff) {
        store.delete(key);
      }
    }
  }, PRUNE_INTERVAL_MS);
  // Don't hold the process open
  if (pruneTimer.unref) {
    pruneTimer.unref();
  }
}

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterMs: number };

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  ensurePruner(windowMs);

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (entry.count >= limit) {
    const retryAfterMs = windowMs - (now - entry.windowStart);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, retryAfterMs: 0 };
}
