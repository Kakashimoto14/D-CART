import { PrismaClient } from "@prisma/client";
import { logger } from "../infrastructure/logger/logger.js";

const prismaLogLevels =
  process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

export const prisma = new PrismaClient({
  log: prismaLogLevels
});

if (typeof prisma.$use === "function") {
  prisma.$use(async (params, next) => {
    const startedAt = Date.now();

    try {
      return await next(params);
    } finally {
      const durationMs = Date.now() - startedAt;

      if (durationMs >= 500) {
        logger.warn(
          {
            model: params.model,
            action: params.action,
            durationMs
          },
          "Slow Prisma query detected."
        );
      }
    }
  });
}
