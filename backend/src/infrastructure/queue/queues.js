import { Queue } from "bullmq";
import { env } from "../../config/env.js";
import { getRedis } from "../redis/redis.js";

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
  if (!env.redisEnabled) {
    return {};
  }

  const connection = getRedis();
  if (!connection) {
    throw new Error("Redis must be initialized before queues.");
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
  if (!env.redisEnabled) {
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
