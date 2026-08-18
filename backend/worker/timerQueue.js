import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { Queue } from "bullmq";
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const timerConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    return Math.min(times * 1000, 15000);
  }
});

timerConnection.on("error", (err) => {
  console.warn(`[Timer Queue Redis Warning]: ${err.message}`);
});

export const timerQueue = new Queue("timer-jobs", { connection: timerConnection });

/**
 * Initialize the midnight auto-stop scheduled job.
 * Runs at 11:59 PM every night to auto-stop any running timers.
 */
export const initializeTimerScheduler = async () => {
  try {
    await timerQueue.upsertJobScheduler(
      "midnight-timer-autostop",
      {
        pattern: "59 23 * * *",
        tz: "UTC"
      },
      {
        name: "MIDNIGHT_AUTOSTOP",
        data: {}
      }
    );
    console.log("Timer midnight auto-stop scheduler initialized.");
  } catch (error) {
    console.error("Error initializing timer scheduler:", error);
  }
};
