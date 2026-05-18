import { prisma } from "../config/prisma.js";
import { mergeRequestContext } from "../infrastructure/http/request-context.js";
import { AppError } from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/jwt.js";

export const authenticate = async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError("Authentication required.", 401));
  }

  try {
    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      return next(new AppError("User not found.", 401));
    }

    req.user = user;
    mergeRequestContext({ userId: user.id });
    next();
  } catch (error) {
    next(new AppError("Invalid or expired token.", 401));
  }
};
