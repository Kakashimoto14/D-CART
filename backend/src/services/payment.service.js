import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "../infrastructure/logger/logger.js";
import { AppError } from "../utils/AppError.js";

const PAYMENT_REQUEST_TIMEOUT_MS = 15000;

export class PaymentService {
  constructor() {
    this.baseUrl = env.paymongoApiBaseUrl.replace(/\/$/, "");
  }

  isConfigured() {
    return Boolean(env.paymongoSecretKey);
  }

  ensureConfigured() {
    if (!this.isConfigured()) {
      throw new AppError(
        "Payment could not be completed. Please check your GCash details or try another payment method.",
        503,
        null,
        "PAYMENT_FAILED"
      );
    }
  }

  buildAuthHeader() {
    const token = Buffer.from(`${env.paymongoSecretKey}:`).toString("base64");
    return `Basic ${token}`;
  }

  buildWebhookPayload(rawBody, timestamp) {
    return `${timestamp}.${rawBody.toString("utf8")}`;
  }

  buildIdempotencyKey(order) {
    return `dcart-gcash-order-${order.id}`;
  }

  toCentavos(amount) {
    return Math.round(Number(amount) * 100);
  }

  parseWebhookSignature(signatureHeader) {
    const parts = signatureHeader
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .reduce((accumulator, part) => {
        const [key, value] = part.split("=");
        if (key && value !== undefined) {
          accumulator[key] = value;
        }
        return accumulator;
      }, {});

    return {
      timestamp: parts.t,
      testSignature: parts.te,
      liveSignature: parts.li
    };
  }

  async createGcashCheckoutSession({ order, user, successUrl, cancelUrl }) {
    this.ensureConfigured();

    const lineItems = order.items.map((item) => ({
      currency: "PHP",
      amount: this.toCentavos(item.price),
      name: item.product.name,
      quantity: item.quantity
    }));

    if (Number(order.deliveryFee) > 0) {
      lineItems.push({
        currency: "PHP",
        amount: this.toCentavos(order.deliveryFee),
        name: "Delivery Fee",
        quantity: 1
      });
    }

    let response;

    try {
      response = await fetch(`${this.baseUrl}/v1/checkout_sessions`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: this.buildAuthHeader(),
          "Idempotency-Key": this.buildIdempotencyKey(order)
        },
        body: JSON.stringify({
          data: {
            attributes: {
              billing: {
                name: user.name,
                email: user.email,
                phone: user.phone || undefined
              },
              send_email_receipt: true,
              show_description: true,
              show_line_items: true,
              description: `D'Cart order #${order.id}`,
              line_items: lineItems,
              payment_method_types: ["gcash"],
              reference_number: `order-${order.id}`,
              success_url: `${successUrl}?orderId=${order.id}`,
              cancel_url: `${cancelUrl}?orderId=${order.id}`,
              metadata: {
                orderId: String(order.id),
                userId: String(user.id)
              }
            }
          }
        }),
        signal: AbortSignal.timeout(PAYMENT_REQUEST_TIMEOUT_MS)
      });
    } catch (error) {
      logger.warn({ err: error, orderId: order.id }, "Unable to reach PayMongo checkout API.");
      throw new AppError(
        "Payment could not be completed. Please check your GCash details or try another payment method.",
        503,
        null,
        "PAYMENT_FAILED"
      );
    }

    const payload = await response.json();

    if (!response.ok) {
      logger.warn(
        {
          orderId: order.id,
          status: response.status,
          providerPayload: payload
        },
        "PayMongo checkout session creation failed."
      );
      throw new AppError(
        "Payment could not be completed. Please check your GCash details or try another payment method.",
        response.status,
        null,
        "PAYMENT_FAILED"
      );
    }

    const checkoutSession = payload?.data;

    return {
      checkoutSessionId: checkoutSession?.id,
      checkoutUrl: checkoutSession?.attributes?.checkout_url
    };
  }

  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!env.paymongoWebhookSecret) {
      throw new AppError("PayMongo webhook secret is not configured.", 500);
    }

    if (!signatureHeader) {
      throw new AppError("Missing PayMongo webhook signature.", 400);
    }

    const { timestamp, testSignature, liveSignature } = this.parseWebhookSignature(signatureHeader);

    if (!timestamp) {
      throw new AppError("Invalid PayMongo webhook signature header.", 400);
    }

    const toleranceSeconds = Math.max(60, env.paymongoWebhookToleranceSeconds);
    const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
    if (Number.isNaN(ageSeconds) || ageSeconds > toleranceSeconds) {
      throw new AppError("PayMongo webhook signature timestamp is no longer valid.", 400);
    }

    const providedSignature = env.paymongoSecretKey.startsWith("sk_live_")
      ? liveSignature
      : testSignature;

    if (!providedSignature) {
      throw new AppError("PayMongo webhook signature does not match the current environment.", 400);
    }

    const expectedSignature = createHmac("sha256", env.paymongoWebhookSecret)
      .update(this.buildWebhookPayload(rawBody, timestamp))
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature);
    const providedBuffer = Buffer.from(providedSignature);

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      throw new AppError("Invalid PayMongo webhook signature.", 400);
    }
  }
}
