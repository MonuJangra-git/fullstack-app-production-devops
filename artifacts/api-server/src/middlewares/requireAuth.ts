import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

export interface AuthedRequest extends Request {
  userId: string;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const guestUserId = (req as Request & { guestUserId?: string }).guestUserId;
  const userId = guestUserId ?? getAuth(req)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as unknown as AuthedRequest).userId = userId;
  next();
}
