import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { ROLES } from "../constants/roles.js";
import { buildUserEntity } from "../models/buildUserEntity.js";
import { AppError } from "../utils/AppError.js";
import { generateAccessToken } from "../utils/jwt.js";
import { normalizeEmail } from "../utils/normalizeEmail.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { AuditService } from "./audit.service.js";
import { EmailService } from "./email.service.js";

const emailService = new EmailService();
const auditService = new AuditService();

export class AuthService {
  hashToken(token) {
    return createHash("sha256").update(token).digest("hex");
  }

  buildSessionMetadata(metadata = {}) {
    return {
      deviceInfo: metadata.userAgent || null,
      ipAddress: metadata.ipAddress || null
    };
  }

  async createSession(user, metadata = {}) {
    const refreshToken = randomBytes(48).toString("hex");
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ...this.buildSessionMetadata(metadata)
      }
    });

    return {
      accessToken: generateAccessToken({ sub: user.id, role: user.role }),
      refreshToken
    };
  }

  async buildAuthenticatedResponse(user, metadata = {}, auditEntry = null) {
    const entity = buildUserEntity(user);
    const session = await this.createSession(user, metadata);

    if (auditEntry) {
      await auditService.record({
        entityType: "user",
        entityId: user.id,
        actorUserId: user.id,
        ...auditEntry
      });
    }

    return {
      token: session.accessToken,
      refreshToken: session.refreshToken,
      user: entity.getProfile()
    };
  }

  async register(payload, metadata = {}) {
    const email = normalizeEmail(payload.email);
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new AppError("Email is already registered.", 409);
    }

    const hashedPassword = await hashPassword(payload.password);

    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email,
        password: hashedPassword,
        role: ROLES.CUSTOMER,
        authProvider: "LOCAL",
        cart: {
          create: {}
        }
      }
    });

    return this.buildAuthenticatedResponse(user, metadata, {
      action: "auth.register",
      after: {
        email: user.email,
        role: user.role
      }
    });
  }

  async login(payload, metadata = {}) {
    const email = normalizeEmail(payload.email);
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new AppError("Invalid email or password.", 401);
    }

    if (!user.password) {
      throw new AppError(
        "This account uses Google sign-in. Continue with Google to access it.",
        400
      );
    }

    const isValidPassword = await comparePassword(payload.password, user.password);

    if (!isValidPassword) {
      throw new AppError("Invalid email or password.", 401);
    }

    return this.buildAuthenticatedResponse(user, metadata, {
      action: "auth.login"
    });
  }

  async rotateSession(refreshToken, metadata = {}) {
    if (!refreshToken) {
      throw new AppError("Refresh token is required.", 401);
    }

    const tokenHash = this.hashToken(refreshToken);

    const existing = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: true
      }
    });

    if (!existing) {
      throw new AppError("Refresh session is invalid or expired.", 401);
    }

    const nextRefreshToken = randomBytes(48).toString("hex");
    const nextTokenHash = this.hashToken(nextRefreshToken);
    const nextExpiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

    const user = await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() }
      });

      await tx.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: nextTokenHash,
          expiresAt: nextExpiresAt,
          ...this.buildSessionMetadata(metadata)
        }
      });

      return tx.user.findUnique({
        where: { id: existing.userId }
      });
    });

    if (!user) {
      throw new AppError("User not found.", 404);
    }

    await auditService.record({
      action: "auth.refresh",
      entityType: "session",
      entityId: existing.id,
      actorUserId: user.id
    });

    return {
      accessToken: generateAccessToken({ sub: user.id, role: user.role }),
      refreshToken: nextRefreshToken,
      user: buildUserEntity(user).getProfile()
    };
  }

  async revokeSession(refreshToken, actorUserId = null) {
    if (!refreshToken) {
      return;
    }

    const tokenHash = this.hashToken(refreshToken);
    const existing = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null
      }
    });

    if (!existing) {
      return;
    }

    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() }
    });

    await auditService.record({
      action: "auth.logout",
      entityType: "session",
      entityId: existing.id,
      actorUserId
    });
  }

  async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError("User not found.", 404);
    }

    return buildUserEntity(user).getProfile();
  }

  async requestPasswordReset(email) {
    const genericResponse = {
      message: "If that email is registered, a password reset link has been sent."
    };

    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(email) }
    });

    if (!user || !user.password) {
      return genericResponse;
    }

    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + env.passwordResetTtlMinutes * 60 * 1000);
    const resetUrl = `${env.frontendUrl}/reset-password?token=${rawToken}`;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: expiresAt
      }
    });

    const emailResult = await emailService.sendPasswordReset({
      to: user.email,
      name: user.name,
      resetUrl,
      expiresInMinutes: env.passwordResetTtlMinutes
    });

    await auditService.record({
      action: "auth.password_reset_requested",
      entityType: "user",
      entityId: user.id,
      actorUserId: user.id
    });

    return {
      ...genericResponse,
      ...(env.nodeEnv !== "production" && emailResult.preview
        ? { debugResetUrl: resetUrl, emailPreview: emailResult.preview }
        : {})
    };
  }

  async resetPassword({ token, password }) {
    const hashedToken = this.hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      throw new AppError("This password reset link is invalid or has expired.", 400);
    }

    const hashedPassword = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiresAt: null
        }
      });

      await tx.refreshToken.updateMany({
        where: {
          userId: user.id,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    });

    await auditService.record({
      action: "auth.password_reset_completed",
      entityType: "user",
      entityId: user.id,
      actorUserId: user.id
    });

    return {
      message: "Password updated successfully. You can now sign in with your new password."
    };
  }
}
