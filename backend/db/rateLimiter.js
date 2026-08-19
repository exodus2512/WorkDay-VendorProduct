/**
 * Token Bucket Database Rate Limiter
 * Ensures that the application does not exceed the maximum allowed queries per second (QPS)
 * to the database. Spikes in traffic will be queued and processed at the maximum allowed rate.
 */
class DatabaseRateLimiter {
  constructor(queriesPerSecond) {
    this.qps = queriesPerSecond;
    this.tokens = queriesPerSecond;
    this.lastRefillTime = Date.now();
    this.queue = [];
    this.timeoutId = null;
  }

  /**
   * Request permission to execute a query. Returns a promise that resolves
   * when a token becomes available.
   */
  async acquire() {
    this._refill();

    // Fast path: if tokens are available, consume one and return immediately
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return Promise.resolve();
    }

    // Slow path: queue the request until a token is available
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this._scheduleQueueProcessing();
    });
  }

  /**
   * Internal: Refills tokens based on how much time has passed
   */
  _refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    
    if (elapsed > 0) {
      const tokensToAdd = (elapsed / 1000) * this.qps;
      this.tokens = Math.min(this.qps, this.tokens + tokensToAdd);
      this.lastRefillTime = now;
    }
  }

  /**
   * Internal: Schedules the next queue processing tick based on the exact
   * millisecond when the next token will become available.
   */
  _scheduleQueueProcessing() {
    // If a timeout is already active, or there's nothing in the queue, do nothing
    if (this.timeoutId || this.queue.length === 0) return;

    // Calculate time until exactly 1 token is available
    const tokensNeeded = 1 - this.tokens;
    const timeNeededMs = tokensNeeded > 0 ? (tokensNeeded / this.qps) * 1000 : 0;
    
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this._refill();

      // Drain as many queued requests as we have tokens for
      while (this.queue.length > 0 && this.tokens >= 1) {
        this.tokens -= 1;
        const resolve = this.queue.shift();
        resolve(); // Grant permission to execute
      }

      // If the queue is still not empty (because we exhausted newly refilled tokens), schedule the next check
      if (this.queue.length > 0) {
        this._scheduleQueueProcessing();
      }
    }, Math.max(1, timeNeededMs));
  }
}

// Default to 50 QPS unless defined in environment
const MAX_DB_QPS = process.env.MAX_DB_QPS ? parseInt(process.env.MAX_DB_QPS, 10) : 50;

// Export a singleton rate limiter instance
export const dbRateLimiter = new DatabaseRateLimiter(MAX_DB_QPS);
