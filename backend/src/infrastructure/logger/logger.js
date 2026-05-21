import pino from "pino";
import { env } from "../../config/env.js";

export const logger = pino({
  level: process.env.LOG_LEVEL || (env.nodeEnv === "production" ? "info" : "debug"),
  base: {
    service: "dcart-backend",
    env: env.nodeEnv
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "DATABASE_URL",
      "DIRECT_URL",
      "REDIS_URL",
      "databaseUrl",
      "directUrl",
      "password",
      "redisUrl",
      "token",
      "refreshToken"
    ],
    remove: true
  }
});
