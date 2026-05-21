import { Worker } from "bullmq";
import { env } from "../../config/env.js";
import { InventoryService } from "../../services/inventory.service.js";
import { NotificationService } from "../../services/notification.service.js";
import { logger } from "../logger/logger.js";
import { getRedis, isRedisReady } from "../redis/redis.js";

const inventoryService = new InventoryService();
const notificationService = new NotificationService();

const workerDefinitions = [
  {
    name: "notifications",
    processor: async (job) => {
      await notificationService.processJob(job.name, job.data);
    }
  },
  {
    name: "payments-webhook",
    processor: async (job) => {
      logger.info({ queue: "payments-webhook", jobId: job.id, jobName: job.name }, "Payments webhook retry job received.");
    }
  },
  {
    name: "reservation-expiry",
    processor: async (job) => {
      if (job.name !== "inventory.reservation.expire") {
        logger.info({ queue: "reservation-expiry", jobId: job.id, jobName: job.name }, "Skipping unknown reservation job.");
        return;
      }

      await inventoryService.expireReservationIfNeeded(Number(job.data.reservationId));
    }
  },
  {
    name: "inventory-alerts",
    processor: async (job) => {
      logger.info({ queue: "inventory-alerts", jobId: job.id, jobName: job.name }, "Inventory alert job received.");
    }
  },
  {
    name: "receipts",
    processor: async (job) => {
      logger.info({ queue: "receipts", jobId: job.id, jobName: job.name }, "Receipt job received.");
    }
  },
  {
    name: "analytics-rollups",
    processor: async (job) => {
      logger.info({ queue: "analytics-rollups", jobId: job.id, jobName: job.name }, "Analytics rollup job received.");
    }
  },
  {
    name: "delivery-eta-refresh",
    processor: async (job) => {
      logger.info({ queue: "delivery-eta-refresh", jobId: job.id, jobName: job.name }, "Delivery ETA refresh job received.");
    }
  }
];

const workers = [];

export const initializeWorkers = () => {
  if (!env.queueEnabled) {
    logger.info("Queue disabled. Running without background queue workers.");
    return workers;
  }

  if (!env.redisEnabled) {
    logger.warn("Queue enabled but Redis is disabled. Queue workers are unavailable.");
    return workers;
  }

  const connection = getRedis();
  if (!connection || !isRedisReady()) {
    logger.warn("Queue enabled but Redis is not connected. Queue workers are unavailable.");
    return workers;
  }

  if (workers.length > 0) {
    return workers;
  }

  logger.info("Queue enabled. Initializing background queue workers.");

  for (const definition of workerDefinitions) {
    const worker = new Worker(definition.name, definition.processor, {
      connection,
      concurrency: 5
    });

    worker.on("completed", (job) => {
      logger.info(
        {
          queue: definition.name,
          jobId: job.id,
          jobName: job.name
        },
        "Queue job completed."
      );
    });

    worker.on("failed", (job, error) => {
      logger.error({ queue: definition.name, jobId: job?.id, error }, "Queue job failed.");
    });

    workers.push(worker);
  }

  return workers;
};

export const closeWorkers = async () => {
  await Promise.all(workers.map((worker) => worker.close()));
  workers.length = 0;
};
