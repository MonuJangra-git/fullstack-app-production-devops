FROM node:22-bullseye AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
ENV BASE_PATH=/
ENV PORT=3000
COPY tsconfig.base.json ./
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY artifacts/taskflow ./artifacts/taskflow
COPY lib ./lib
RUN pnpm install --frozen-lockfile 
RUN pnpm --filter taskflow build
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/artifacts/taskflow/dist /usr/share/nginx/html
COPY artifacts/taskflow/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


