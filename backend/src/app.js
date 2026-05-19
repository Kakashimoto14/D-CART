import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import productRoutes from "./routes/product.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import fulfillmentRoutes from "./routes/fulfillment.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import pickerRoutes from "./routes/picker.routes.js";
import geofencingRoutes from "./routes/geofencing.routes.js";
import deliverySlotRoutes from "./routes/deliverySlot.routes.js";
import dispatchRoutes from "./routes/dispatch.routes.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { sanitizeRequest } from "./middlewares/sanitize.middleware.js";
import { handlePaymongoWebhook } from "./controllers/order.controller.js";
import { asyncHandler } from "./utils/asyncHandler.js";
import { logger } from "./infrastructure/logger/logger.js";
import { requestContextMiddleware } from "./infrastructure/http/request-context.js";
import { getQueueStats } from "./infrastructure/queue/queues.js";
import { getRedis } from "./infrastructure/redis/redis.js";

const app = express();

app.post(
  "/api/payments/paymongo/webhook",
  express.raw({ type: "application/json", limit: "100kb" }),
  asyncHandler(handlePaymongoWebhook)
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.frontendUrls.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed."));
    },
    credentials: true
  })
);
app.use(helmet());
app.use(requestContextMiddleware);
app.use(
  pinoHttp({
    logger,
    genReqId(req, res) {
      const requestId = req.id || req.headers["x-request-id"] || randomUUID();
      req.id = requestId;
      res.setHeader("x-request-id", requestId);
      return requestId;
    },
    customLogLevel(_req, res, error) {
      if (error || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url
        };
      }
    }
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(sanitizeRequest);

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later."
    },
    message: "Too many requests. Please try again later."
  }
});

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many checkout attempts. Please wait a moment and try again."
    },
    message: "Too many checkout attempts. Please wait a moment and try again."
  }
});

app.use(globalLimiter);

app.get("/api/health", async (_req, res) => {
  const queueStats = await getQueueStats().catch(() => ({
    enabled: env.redisEnabled,
    queues: {}
  }));

  res.status(200).json({
    status: "ok",
    service: "dcart-backend",
    redis: env.redisEnabled ? (getRedis()?.status || "disconnected") : "disabled",
    queues: {
      enabled: queueStats.enabled,
      registered: Object.keys(queueStats.queues || {}).length
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders/checkout", checkoutLimiter);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/fulfillment", fulfillmentRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/picker", pickerRoutes);
app.use("/api/geofencing", geofencingRoutes);
app.use("/api/delivery-slots", deliverySlotRoutes);
app.use("/api/dispatch", dispatchRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
