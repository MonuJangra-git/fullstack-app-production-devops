import { randomUUID } from "node:crypto";
import type { Request, RequestHandler } from "express";

export const GUEST_SESSION_COOKIE = "taskflow_guest_session";
const GUEST_USER_ID_PATTERN = /^guest_[0-9a-f-]{36}$/i;

interface GuestSessionRequest extends Request {
  guestUserId?: string;
}

export function guestSessionMiddleware(): RequestHandler {
  return (req, res, next) => {
    const signedCookies = req.signedCookies as
      | Record<string, string | false>
      | undefined;
    const signedUserId = signedCookies?.[GUEST_SESSION_COOKIE];
    const guestUserId =
      typeof signedUserId === "string" &&
      GUEST_USER_ID_PATTERN.test(signedUserId)
        ? signedUserId
        : `guest_${randomUUID()}`;

    if (guestUserId !== signedUserId) {
      res.cookie(GUEST_SESSION_COOKIE, guestUserId, {
        signed: true,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    (req as GuestSessionRequest).guestUserId = guestUserId;
    next();
  };
}
