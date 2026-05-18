import "dotenv/config";
import { prisma } from "./config/prisma.js";
import { logger } from "./infrastructure/logger/logger.js";
import { closeWorkers, initializeWorkers } from "./infrastructure/queue/workers.js";
import { closeRedis, initializeRedis } from "./infrastructure/redis/redis.js";

const startWorker = async () => {
  try {
    await prisma.$connect();
    await initializeRedis();
    initializeWorkers();
    logger.info("D'Cart worker started.");
  } catch (error) {
    logger.error({ error }, "Failed to start worker.");
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  logger.info({ signal }, "Shutting down worker.");
  await Promise.allSettled([closeWorkers(), closeRedis(), prisma.$disconnect()]);
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startWorker();
