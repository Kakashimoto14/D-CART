import { OAuth2Client } from "google-auth-library";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { ROLES } from "../constants/roles.js";
import { AppError } from "../utils/AppError.js";
import { normalizeEmail } from "../utils/normalizeEmail.js";
import { AuditService } from "./audit.service.js";
import { AuthService } from "./auth.service.js";

const authService = new AuthService();
const auditService = new AuditService();

export class GoogleAuthService {
  constructor() {
    this.client = new OAuth2Client();
  }

  ensureConfigured() {
    if (!env.googleClientIds.length) {
      throw new AppError(
        "Google sign-in is temporarily unavailable because it is not configured yet.",
        503
      );
    }
  }

  async verifyCredential(credential) {
    this.ensureConfigured();

    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: env.googleClientIds
      });
      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email) {
        throw new AppError("Google did not return the required account details.", 400);
      }

      if (!payload.email_verified) {
        throw new AppError("Please verify your Google account email before signing in.", 403);
      }

      return {
        googleSub: payload.sub,
        email: normalizeEmail(payload.email),
        name: payload.name?.trim() || payload.email.split("@")[0],
        avatarUrl: payload.picture || null,
        emailVerifiedAt: new Date()
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("The Google sign-in credential is invalid or has expired.", 401);
    }
  }

  async authenticate(payload, metadata = {}) {
    const googleProfile = await this.verifyCredential(payload.credential);

    const existingByGoogleSub = await prisma.user.findUnique({
      where: { googleSub: googleProfile.googleSub }
    });

    if (existingByGoogleSub) {
      return authService.buildAuthenticatedResponse(existingByGoogleSub, metadata, {
        action: "auth.google_login"
      });
    }

    const existingByEmail = await prisma.user.findUnique({
      where: { email: googleProfile.email }
    });

    if (existingByEmail) {
      if (existingByEmail.role !== ROLES.CUSTOMER) {
        throw new AppError(
          "Google sign-in is only available for customer accounts in this build.",
          403
        );
      }

      if (existingByEmail.googleSub && existingByEmail.googleSub !== googleProfile.googleSub) {
        throw new AppError(
          "This email is already linked to a different Google account. Please use your original sign-in method.",
          409
        );
      }

      const updatedUser = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleSub: googleProfile.googleSub,
          avatarUrl: googleProfile.avatarUrl || existingByEmail.avatarUrl,
          emailVerifiedAt: googleProfile.emailVerifiedAt
        }
      });

      return authService.buildAuthenticatedResponse(updatedUser, metadata, {
        action: "auth.google_login"
      });
    }

    const user = await prisma.user.create({
      data: {
        name: googleProfile.name,
        email: googleProfile.email,
        password: null,
        role: ROLES.CUSTOMER,
        authProvider: "GOOGLE",
        googleSub: googleProfile.googleSub,
        avatarUrl: googleProfile.avatarUrl,
        emailVerifiedAt: googleProfile.emailVerifiedAt,
        cart: {
          create: {}
        }
      }
    });

    await auditService.record({
      action: "auth.google_register",
      entityType: "user",
      entityId: user.id,
      actorUserId: user.id,
      after: {
        email: user.email,
        role: user.role,
        authProvider: user.authProvider
      }
    });

    return authService.buildAuthenticatedResponse(user, metadata, {
      action: "auth.google_login"
    });
  }
}
