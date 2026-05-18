const required = ["DATABASE_URL", "JWT_SECRET"];

required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 14),
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "dcart_refresh_token",
  refreshCookieSecure:
    process.env.REFRESH_COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
  redisUrl: process.env.REDIS_URL || "",
  redisEnabled: Boolean(process.env.REDIS_URL),
  appName: process.env.APP_NAME || "D'Cart",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  frontendUrls: (
    process.env.FRONTEND_URLS ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  passwordResetTtlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES || 60),
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "no-reply@dcart.local",
  smtpSecure: process.env.SMTP_SECURE === "true",
  googleClientIds: (
    process.env.GOOGLE_CLIENT_IDS ||
    process.env.GOOGLE_CLIENT_ID ||
    ""
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || "",
  paymongoSecretKey: process.env.PAYMONGO_SECRET_KEY || "",
  paymongoPublicKey: process.env.PAYMONGO_PUBLIC_KEY || "",
  paymongoWebhookSecret: process.env.PAYMONGO_WEBHOOK_SECRET || "",
  paymongoApiBaseUrl: process.env.PAYMONGO_API_BASE_URL || "https://api.paymongo.com",
  paymongoWebhookToleranceSeconds: Number(process.env.PAYMONGO_WEBHOOK_TOLERANCE_SECONDS || 300),
  checkoutSuccessUrl:
    process.env.CHECKOUT_SUCCESS_URL || "http://localhost:5173/payment/success",
  checkoutCancelUrl:
    process.env.CHECKOUT_CANCEL_URL || "http://localhost:5173/payment/cancelled",
  storeUtcOffsetMinutes: Number(process.env.STORE_UTC_OFFSET_MINUTES || 480),
  sameDayCutoffHour: Number(process.env.SAME_DAY_CUTOFF_HOUR || 17),
  sameDaySlotCutoffMinutes: Number(process.env.SAME_DAY_SLOT_CUTOFF_MINUTES || 90),
  standardLeadDays: Number(process.env.STANDARD_LEAD_DAYS || 1),
  sameDaySurcharge: Number(process.env.SAME_DAY_SURCHARGE || 35),
  scheduledWindowSurcharge: Number(process.env.SCHEDULED_WINDOW_SURCHARGE || 12),
  smallOrderThreshold: Number(process.env.SMALL_ORDER_THRESHOLD || 800),
  smallOrderSurcharge: Number(process.env.SMALL_ORDER_SURCHARGE || 20),
  freeDeliveryThreshold: Number(process.env.FREE_DELIVERY_THRESHOLD || 2500)
};
