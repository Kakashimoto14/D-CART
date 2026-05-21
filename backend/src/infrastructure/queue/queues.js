import { Queue } from "bullmq";
import { env } from "../../config/env.js";
import { logger } from "../logger/logger.js";
import { getRedis, isRedisReady } from "../redis/redis.js";

const names = [
  "notifications",
  "payments-webhook",
  "reservation-expiry",
  "inventory-alerts",
  "receipts",
  "analytics-rollups",
  "delivery-eta-refresh"
];

const queueRegistry = new Map();

export const initializeQueues = () => {
  if (!env.queueEnabled) {
    logger.info("Queue disabled. Running without background queue producers.");
    return {};
  }

  if (!env.redisEnabled) {
    logger.warn("Queue enabled but Redis is disabled. Queue producers are unavailable.");
    return {};
  }

  const connection = getRedis();
  if (!connection || !isRedisReady()) {
    logger.warn("Queue enabled but Redis is not connected. Queue producers are unavailable.");
    return {};
  }

  if (queueRegistry.size === 0) {
    logger.info("Queue enabled. Initializing background queue producers.");
  }

  for (const name of names) {
    if (!queueRegistry.has(name)) {
      queueRegistry.set(
        name,
        new Queue(name, {
          connection,
          defaultJobOptions: {
            removeOnComplete: 500,
            removeOnFail: 1000,
            attempts: 5,
            backoff: {
              type: "exponential",
              delay: 1000
            }
          }
        })
      );
    }
  }

  return Object.fromEntries(queueRegistry.entries());
};

export const getQueue = (name) => queueRegistry.get(name) || null;

export const getQueueStats = async () => {
  if (!env.queueEnabled) {
    return {
      enabled: false,
      queues: {},
      totals: {
        waiting: 0,
        active: 0,
        delayed: 0,
        failed: 0
      }
    };
  }

  const entries = Array.from(queueRegistry.entries());
  if (entries.length === 0) {
    return {
      enabled: false,
      queues: {},
      totals: {
        waiting: 0,
        active: 0,
        delayed: 0,
        failed: 0
      }
    };
  }

  const queueStats = await Promise.all(
    entries.map(async ([name, queue]) => {
      const counts = await queue.getJobCounts(
        "waiting",
        "active",
        "delayed",
        "completed",
        "failed",
        "paused"
      );

      return [name, counts];
    })
  );

  const queues = Object.fromEntries(queueStats);
  const totals = queueStats.reduce(
    (aggregate, [, counts]) => ({
      waiting: aggregate.waiting + (counts.waiting || 0),
      active: aggregate.active + (counts.active || 0),
      delayed: aggregate.delayed + (counts.delayed || 0),
      failed: aggregate.failed + (counts.failed || 0)
    }),
    {
      waiting: 0,
      active: 0,
      delayed: 0,
      failed: 0
    }
  );

  return {
    enabled: true,
    queues,
    totals
  };
};

export const closeQueues = async () => {
  await Promise.all(Array.from(queueRegistry.values()).map((queue) => queue.close()));
  queueRegistry.clear();
};
