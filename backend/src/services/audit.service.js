import { prisma } from "../config/prisma.js";
import { getRequestContext } from "../infrastructure/http/request-context.js";
import { logger } from "../infrastructure/logger/logger.js";

export class AuditService {
  async record({
    action,
    entityType,
    entityId = null,
    actorUserId,
    before = null,
    after = null,
    metadata = null
  }) {
    try {
      const context = getRequestContext();

      await prisma.auditLog.create({
        data: {
          action,
          entityType,
          entityId: entityId ? String(entityId) : null,
          actorUserId: actorUserId ?? context?.userId ?? null,
          beforeJson: before,
          afterJson: after,
          ipAddress: context?.ipAddress || null,
          metadataJson: metadata
        }
      });
    } catch (error) {
      logger.error({ error, action, entityType, entityId }, "Failed to persist audit log.");
    }
  }
}
