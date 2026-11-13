import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, organization } from "better-auth/plugins";
import { Resend } from "resend";
import { db } from "@workspace/db";
import * as schema from "@workspace/db/schema";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
const from = process.env.AUTH_EMAIL_FROM ?? "TaskFlow <noreply@example.com>";
const secret = process.env.BETTER_AUTH_SECRET?.trim();

if (!secret || Buffer.byteLength(secret) < 32) {
  throw new Error(
    "BETTER_AUTH_SECRET must contain at least 32 bytes.",
  );
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is required in production");
    }
    return;
  }

  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(`Failed to send email: ${error.message}`);
}

export async function sendWorkspaceInvitationEmail(
  email: string,
  workspaceId: number,
): Promise<void> {
  const link = `${process.env.APP_URL}/workspaces/${workspaceId}/members`;
  await sendEmail(
    email,
    "You have been invited to TaskFlow",
    `<p>You have been invited to join a TaskFlow workspace.</p><p><a href="${link}">Sign in to accept the invitation</a></p>`,
  );
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  rateLimit: {
    enabled: true,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/email-otp/request-password-reset": { window: 300, max: 3 },
      "/email-otp/check-verification-otp": { window: 300, max: 5 },
      "/email-otp/reset-password": { window: 300, max: 5 },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(
        user.email,
        "Reset your TaskFlow password",
        `<p>Use this link to reset your password:</p><p><a href="${url}">Reset password</a></p>`,
      );
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      allowedAttempts: 5,
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "forget-password") {
          await sendEmail(
            email,
            "Your TaskFlow password reset code",
            `<p>Your code is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
          );
        }
      },
    }),
    organization({
      async sendInvitationEmail(data) {
        const link = `${process.env.APP_URL}/accept-invitation/${data.id}`;
        await sendEmail(
          data.email,
          `Join ${data.organization.name} on TaskFlow`,
          `<p>${data.inviter.user.name} invited you to join <strong>${data.organization.name}</strong>.</p><p><a href="${link}">Accept invitation</a></p>`,
        );
      },
    }),
  ],
});
