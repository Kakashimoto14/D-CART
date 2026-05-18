import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export class EmailService {
  constructor() {
    this.usesSmtp = Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
    this.transporter = this.usesSmtp
      ? nodemailer.createTransport({
          host: env.smtpHost,
          port: env.smtpPort,
          secure: env.smtpSecure,
          auth: {
            user: env.smtpUser,
            pass: env.smtpPass
          }
        })
      : nodemailer.createTransport({
          jsonTransport: true
        });
  }

  async sendMessage({ to, subject, text, html }) {
    const info = await this.transporter.sendMail({
      from: env.smtpFrom,
      to,
      subject,
      text,
      html
    });

    return {
      preview: this.usesSmtp ? null : info.message?.toString() || null
    };
  }

  async sendPasswordReset({ to, name, resetUrl, expiresInMinutes }) {
    return this.sendMessage({
      to,
      subject: `${env.appName} password reset`,
      text: [
        `Hello ${name},`,
        "",
        "We received a request to reset your password.",
        `Use this link to set a new password: ${resetUrl}`,
        `This link will expire in ${expiresInMinutes} minutes.`,
        "",
        "If you did not request this, you can ignore this email."
      ].join("\n"),
      html: `
        <p>Hello ${name},</p>
        <p>We received a request to reset your password.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link will expire in ${expiresInMinutes} minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `
    });
  }
}
