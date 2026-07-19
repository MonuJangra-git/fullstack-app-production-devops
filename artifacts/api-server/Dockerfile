# ---------- BUILDER ----------
FROM node:22-bullseye AS builder
WORKDIR /app

RUN corepack enable

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY artifacts ./artifacts
COPY lib ./lib

RUN pnpm install --frozen-lockfile
RUN pnpm --filter api-server build


# ---------- RUNTIME ----------
FROM node:22-bullseye
WORKDIR /app

COPY --from=builder /app/artifacts/api-server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/artifacts/api-server/package.json ./package.json

EXPOSE 3000

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
