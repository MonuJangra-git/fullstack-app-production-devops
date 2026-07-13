# Deploying TaskFlow on a Linux server with Nginx

This guide sets up TaskFlow on a plain Linux VM (Ubuntu/Debian-style commands
shown; adjust package manager commands for other distros) with:

- Node.js running the API server and building the frontend
- PostgreSQL for the database
- Nginx as the public-facing reverse proxy / static file server
- systemd to keep the API server running and restart it on crash/reboot

Architecture: Nginx terminates TLS and serves the built frontend as static
files at `/`, while proxying everything under `/api` to the Node API server
running on `127.0.0.1:8080` (not exposed directly to the internet).

---

## 0. Prerequisites

- A Linux server (Ubuntu 22.04+ recommended) with a sudo user
- A domain name pointed at the server's IP (for TLS)
- This project's code on the server (see step 2)

---

## 1. Install system dependencies

```bash
sudo apt update
sudo apt install -y curl git nginx postgresql postgresql-contrib

# Node.js 24 (matches this project's engine requirement) via NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm (this is a pnpm-managed monorepo — do not use npm/yarn)
sudo npm install -g pnpm@10

node -v   # expect v24.x
pnpm -v
```

---

## 2. Get the code onto the server

Unzip the project archive (or `git clone` your repo) into a working directory:

```bash
sudo mkdir -p /opt/taskflow
sudo chown "$USER":"$USER" /opt/taskflow
cd /opt/taskflow
unzip /path/to/taskflow-project.zip -d .
```

Install dependencies for the whole workspace from the repo root:

```bash
cd /opt/taskflow
pnpm install --frozen-lockfile
```

---

## 3. Set up PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE USER taskflow WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE taskflow OWNER taskflow;
SQL
```

Your connection string will be:

```
postgresql://taskflow:CHANGE_ME_STRONG_PASSWORD@localhost:5432/taskflow
```

---

## 4. Configure environment variables

Create `/opt/taskflow/artifacts/api-server/.env.production` (the API server
reads `process.env` directly, so these must be exported into its process
environment — the systemd unit in step 6 loads this file):

```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://taskflow:CHANGE_ME_STRONG_PASSWORD@localhost:5432/taskflow
CLERK_SECRET_KEY=sk_live_xxxxxxxx
CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxx
SESSION_SECRET=CHANGE_ME_RANDOM_LONG_STRING
```

Create `/opt/taskflow/artifacts/taskflow/.env.production` (read at **build**
time by Vite, baked into the static bundle — rebuild the frontend after
changing any of these):

```bash
PORT=5173
BASE_PATH=/
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxx
```

Notes:
- Get real `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY` values from your own
  Clerk account (dashboard.clerk.com) once you're self-hosting — the
  Replit-managed Clerk keys used in the Replit workspace are tied to that
  workspace and won't work standalone. Use your Clerk app's **production**
  instance keys (`pk_live_...` / `sk_live_...`).
- `SESSION_SECRET`: generate with `openssl rand -base64 32`.
- Never commit these `.env.production` files to git. Lock down permissions:
  `chmod 600 artifacts/api-server/.env.production`.

---

## 5. Build the app

```bash
cd /opt/taskflow

# Push the DB schema (creates all tables)
pnpm --filter @workspace/db run push

# Typecheck + build every package (frontend static bundle + API server bundle)
pnpm run build
```

This produces:
- `artifacts/taskflow/dist/public/` — the static frontend (HTML/JS/CSS) to be
  served by Nginx directly
- `artifacts/api-server/dist/index.mjs` — the bundled Node API server

---

## 6. Run the API server with systemd

Create `/etc/systemd/system/taskflow-api.service`:

```ini
[Unit]
Description=TaskFlow API server
After=network.target postgresql.service

[Service]
Type=simple
User=taskflow
WorkingDirectory=/opt/taskflow/artifacts/api-server
EnvironmentFile=/opt/taskflow/artifacts/api-server/.env.production
ExecStart=/usr/bin/node --enable-source-maps /opt/taskflow/artifacts/api-server/dist/index.mjs
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Create a dedicated system user and enable the service:

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin taskflow
sudo chown -R taskflow:taskflow /opt/taskflow

sudo systemctl daemon-reload
sudo systemctl enable --now taskflow-api
sudo systemctl status taskflow-api   # should show "active (running)"
```

The API server listens on `127.0.0.1:8080` only (not exposed to the
internet) — Nginx is the only public entry point.

---

## 7. Configure Nginx

Create `/etc/nginx/sites-available/taskflow`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /opt/taskflow/artifacts/taskflow/dist/public;
    index index.html;

    # Reasonable upload/body size for task attachments, avatars, etc.
    client_max_body_size 10m;

    # --- API: reverse-proxy everything under /api to the Node server ---
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # The Clerk Frontend API proxy (/api/__clerk/*) streams responses of
        # unknown length; disable buffering so they pass through promptly.
        proxy_buffering off;
    }

    # --- Frontend: serve static files, fall back to index.html for the
    #     client-side router (wouter) on any unmatched path ---
    location / {
        try_files $uri /index.html;
    }

    # Cache hashed static assets aggressively; index.html stays uncached so
    # deploys are picked up immediately.
    location ~* \.(?:js|css|svg|png|jpg|jpeg|woff2?)$ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

Enable the site and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/taskflow /etc/nginx/sites-enabled/taskflow
sudo nginx -t   # validate config
sudo systemctl reload nginx
```

At this point the app should be reachable at `http://your-domain.com`.

---

## 8. Add HTTPS (strongly recommended)

Use Certbot for a free Let's Encrypt certificate — it edits the Nginx config
above in place to add the `listen 443 ssl` block and redirect HTTP to HTTPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot auto-renews via a systemd timer; verify with:

```bash
sudo systemctl list-timers | grep certbot
```

---

## 9. Verify the deployment

```bash
# API server directly (should return JSON, not HTML)
curl -s http://127.0.0.1:8080/api/healthz

# Through Nginx, from the public domain
curl -sI https://your-domain.com/
curl -s https://your-domain.com/api/healthz
```

Then open `https://your-domain.com` in a browser, sign up, and confirm the
Study Hub / Workspaces / Projects flow works end to end.

---

## 10. Ongoing operations

- **Redeploy after a code change:**
  ```bash
  cd /opt/taskflow
  git pull            # or re-unzip an updated archive
  pnpm install --frozen-lockfile
  pnpm run build
  sudo systemctl restart taskflow-api
  sudo systemctl reload nginx
  ```
- **Schema changes:** run `pnpm --filter @workspace/db run push` after
  updating `lib/db/src/schema/*.ts`, before restarting the API server.
- **API contract changes:** run
  `pnpm --filter @workspace/api-spec run codegen` after editing
  `lib/api-spec/openapi.yaml`, then rebuild.
- **Logs:**
  ```bash
  sudo journalctl -u taskflow-api -f     # API server logs
  sudo tail -f /var/log/nginx/error.log  # Nginx errors
  ```
- **Firewall:** only ports 80/443 need to be open publicly; Postgres (5432)
  and the API server (8080) should stay bound to localhost / private
  network only.
## Challenges Faced

- Resolved Linux permission issues when running systemd service
- Fixed Vite build failures due to missing environment variables
- Handled monorepo TypeScript project references manually
- Configured Nginx reverse proxy with API path forwarding
- Debugged EACCES errors caused by accidental sudo pnpm usage