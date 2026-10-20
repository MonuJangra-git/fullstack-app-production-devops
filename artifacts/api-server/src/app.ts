import express, { type Express, type Request } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { randomBytes } from "node:crypto";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import { guestSessionMiddleware } from "./middlewares/guestSession";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();
const clerkSecretKey = process.env.CLERK_SECRET_KEY?.trim();
const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY?.trim();
const clerkEnabled = Boolean(clerkSecretKey);
const configuredSessionSecret = process.env.SESSION_SECRET?.trim();

if (!clerkSecretKey && clerkPublishableKey) {
  throw new Error(
    "CLERK_PUBLISHABLE_KEY cannot be set without CLERK_SECRET_KEY. Unset both server-side keys to use guest mode.",
  );
}

if (
  !clerkEnabled &&
  configuredSessionSecret &&
  Buffer.byteLength(configuredSessionSecret) < 32
) {
  throw new Error("SESSION_SECRET must contain at least 32 bytes in guest mode.");
}

const sessionSecret =
  configuredSessionSecret || randomBytes(32).toString("base64url");

function normalizeOrigin(origin: string): string | undefined {
  try {
    const parsed = new URL(origin);
    if (
      parsed.username ||
      parsed.password ||
      parsed.origin === "null" ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return undefined;
    }
    return parsed.origin;
  } catch {
    return undefined;
  }
}

const allowedOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin)),
);

function firstHeader(value: string | string[] | undefined): string | undefined {
  return (Array.isArray(value) ? value[0] : value)?.split(",")[0]?.trim();
}

function hasRequestHostOrigin(origin: string, req: Request): boolean {
  try {
    const parsed = new URL(origin);
    const requestHost = firstHeader(req.headers.host);
    return (
      Boolean(requestHost) &&
      /^https?:$/.test(parsed.protocol) &&
      parsed.host.toLowerCase() === requestHost?.toLowerCase()
    );
  } catch {
    return false;
  }
}

if (!clerkEnabled && !configuredSessionSecret) {
  logger.warn(
    "SESSION_SECRET is not configured; guest sessions will be reset when the API process restarts.",
  );
}

app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control", "no-store");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
  }
  next();
});

// The Clerk proxy streams raw bytes, so it must be mounted before the body
// parsers below.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // Requests without an Origin header (such as health checks and server
      // clients) do not need CORS response headers.
      callback(
        null,
        Boolean(origin && allowedOrigins.has(normalizeOrigin(origin) ?? "")),
      );
    },
  }),
);
app.use("/api", (req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");
  if (
    origin &&
    (allowedOrigins.has(normalizeOrigin(origin) ?? "") ||
      hasRequestHostOrigin(origin, req))
  ) {
    next();
    return;
  }

  if (!origin && req.get("sec-fetch-site") !== "cross-site") {
    next();
    return;
  }

  res.status(403).json({ error: "Untrusted request origin" });
});
app.use(cookieParser(sessionSecret));
app.use(express.json({ limit: "1mb" }));
app.use(
  express.urlencoded({ extended: false, limit: "16kb", parameterLimit: 100 }),
);

if (clerkEnabled) {
  // Resolve the publishable key from the incoming request host so the same
  // server can serve multiple Clerk custom domains.
  app.use(
    clerkMiddleware((req) => ({
      publishableKey: publishableKeyFromHost(
        getClerkProxyHost(req) ?? "",
        clerkPublishableKey,
      ),
    })),
  );
} else {
  // Each browser gets its own signed identity; protected routes still run
  // their normal ownership and membership checks.
  app.use("/api", guestSessionMiddleware());
}

app.use("/api", router);

export default app;
