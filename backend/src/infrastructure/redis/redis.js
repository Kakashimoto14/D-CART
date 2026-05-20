import Redis from "ioredis";
import { env } from "../../config/env.js";
import { logger } from "../logger/logger.js";

let commandClient = null;
let subscriberClient = null;

export const initializeRedis = async () => {
  if (!env.redisEnabled) {
    logger.info("Redis is disabled. Running without Redis-backed services.");
    return null;
  }

  if (commandClient) {
    return commandClient;
  }

  try {
    commandClient = new Redis(env.redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true
    });

    subscriberClient = commandClient.duplicate({
      lazyConnect: true
    });

    commandClient.on("error", (error) => {
      logger.warn({ error }, "Redis command client error.");
    });

    subscriberClient.on("error", (error) => {
      logger.warn({ error }, "Redis subscriber client error.");
    });

    await commandClient.connect();
    await subscriberClient.connect();
    logger.info("Redis connected. Redis-backed queues and realtime adapters are enabled.");
    return commandClient;
  } catch (error) {
    logger.warn(
      { error },
      "Redis is enabled but unavailable. Continuing without Redis-backed services."
    );
    await closeRedis();
    return null;
  }
};

export const getRedis = () => commandClient;
export const getRedisSubscriber = () => subscriberClient;

export const closeRedis = async () => {
  await Promise.all(
    [commandClient, subscriberClient]
      .filter(Boolean)
      .map((client) => client.quit().catch(() => client.disconnect()))
  );

  commandClient = null;
  subscriberClient = null;
};
