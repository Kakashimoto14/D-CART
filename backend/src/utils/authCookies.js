import { env } from "../config/env.js";

export const buildRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: env.refreshCookieSecure,
  sameSite: "lax",
  path: "/api/auth",
  maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000
});
