import Redis from "ioredis";
import { env } from "../../config/env.js";
import { logger } from "../logger/logger.js";

let commandClient = null;
let subscriberClient = null;

const redactRedisError = (error) => ({
  name: error?.name,
  code: error?.code,
  message: error?.message
});

const createRedisOptions = () => ({
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableReadyCheck: true,
  ...(env.redisUrl.startsWith("rediss://")
    ? {
        tls: {}
      }
    : {})
});

export const initializeRedis = async () => {
  if (!env.redisEnabled) {
    logger.info("Redis disabled. Running without Redis-backed services.");
    return null;
  }

  if (commandClient) {
    return commandClient;
  }

  try {
    commandClient = new Redis(env.redisUrl, createRedisOptions());

    subscriberClient = commandClient.duplicate(createRedisOptions());

    commandClient.on("error", (error) => {
      logger.warn({ error: redactRedisError(error) }, "Redis command client error.");
    });

    subscriberClient.on("error", (error) => {
      logger.warn({ error: redactRedisError(error) }, "Redis subscriber client error.");
    });

    await commandClient.connect();
    await subscriberClient.connect();
    logger.info(
      {
        transport: env.redisUrl.startsWith("rediss://") ? "rediss" : "redis"
      },
      "Redis connected."
    );
    return commandClient;
  } catch (error) {
    logger.warn(
      {
        error: redactRedisError(error),
        transport: env.redisUrl.startsWith("rediss://") ? "rediss" : "redis"
      },
      "Redis unavailable. Running without Redis-backed services."
    );
    await closeRedis();
    return null;
  }
};

export const getRedis = () => commandClient;
export const getRedisSubscriber = () => subscriberClient;
export const getRedisStatus = () => commandClient?.status || "disconnected";
export const isRedisReady = () => getRedisStatus() === "ready";

export const closeRedis = async () => {
  await Promise.all(
    [commandClient, subscriberClient]
      .filter(Boolean)
      .map((client) => client.quit().catch(() => client.disconnect()))
  );

  commandClient = null;
  subscriberClient = null;
};
