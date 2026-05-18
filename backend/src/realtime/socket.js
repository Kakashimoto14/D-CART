import { createAdapter } from "@socket.io/redis-adapter";
import { Server } from "socket.io";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { getRedis, getRedisSubscriber } from "../infrastructure/redis/redis.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { ROLES } from "../constants/roles.js";

let ioInstance = null;

const OPERATIONS_ROOM = "orders:operations";

const resolveToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  if (authToken) {
    return authToken;
  }

  const authorizationHeader = socket.handshake.headers.authorization;
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice(7);
  }

  return null;
};

export const initializeSocketServer = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: env.frontendUrls,
      credentials: true
    }
  });

  if (env.redisEnabled && getRedis() && getRedisSubscriber()) {
    ioInstance.adapter(createAdapter(getRedis(), getRedisSubscriber()));
  }

  ioInstance.use(async (socket, next) => {
    try {
      const token = resolveToken(socket);
      if (!token) {
        return next(new Error("Authentication required."));
      }

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: Number(payload.sub) },
        select: {
          id: true,
          role: true
        }
      });

      if (!user) {
        return next(new Error("User not found."));
      }

      socket.data.user = user;
      next();
    } catch (_error) {
      next(new Error("Invalid or expired token."));
    }
  });

  ioInstance.on("connection", (socket) => {
    const { user } = socket.data;
    socket.join(`user:${user.id}`);

    if (user.role === ROLES.ADMIN || user.role === ROLES.STAFF) {
      socket.join(OPERATIONS_ROOM);
    }
  });

  return ioInstance;
};

export const emitOrderChanged = ({ orderId, userId, status, type }) => {
  if (!ioInstance || !orderId || !userId) {
    return;
  }

  const payload = {
    orderId: Number(orderId),
    userId: Number(userId),
    status: status || null,
    type,
    occurredAt: new Date().toISOString()
  };

  ioInstance.to(OPERATIONS_ROOM).emit("orders:changed", payload);
  ioInstance.to(`user:${userId}`).emit("orders:changed", payload);
};
