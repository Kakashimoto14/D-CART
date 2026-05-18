import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const storage = new AsyncLocalStorage();

export const requestContextMiddleware = (req, res, next) => {
  const requestId = req.headers["x-request-id"] || randomUUID();
  req.id = requestId;
  res.setHeader("x-request-id", requestId);

  storage.run(
    {
      requestId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      userId: null
    },
    next
  );
};

export const getRequestContext = () => storage.getStore() || null;

export const mergeRequestContext = (patch) => {
  const store = storage.getStore();
  if (!store) return;
  Object.assign(store, patch);
};
