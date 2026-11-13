import express, { type Express, type Request } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { toNodeHandler } from "better-auth/node";
import router from "./routes";
import { logger } from "./lib/logger";
import { auth } from "./lib/auth";

const app: Express = express();

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
// Better Auth reads and writes the request body and session cookies itself.
// It must be mounted before Express body parsers.
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json({ limit: "1mb" }));
app.use(
  express.urlencoded({ extended: false, limit: "16kb", parameterLimit: 100 }),
);

app.use("/api", router);

export default app;
