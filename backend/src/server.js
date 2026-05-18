import "dotenv/config";
import { createServer } from "node:http";
import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { logger } from "./infrastructure/logger/logger.js";
import { closeQueues, initializeQueues } from "./infrastructure/queue/queues.js";
import { closeRedis, initializeRedis } from "./infrastructure/redis/redis.js";
import { initializeSocketServer } from "./realtime/socket.js";

const startServer = async () => {
  try {
    await prisma.$connect();
    await initializeRedis();
    initializeQueues();
    const httpServer = createServer(app);
    initializeSocketServer(httpServer);

    httpServer.listen(env.port, () => {
      logger.info({ port: env.port }, "D'Cart backend listening.");
    });
  } catch (error) {
    logger.error({ error }, "Failed to start backend server.");
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  logger.info({ signal }, "Shutting down backend.");
  await Promise.allSettled([closeQueues(), closeRedis(), prisma.$disconnect()]);
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer();
