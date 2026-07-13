Here’s a **portfolio-optimized README.md** — polished, recruiter-friendly, and structured to highlight real DevOps  and AWS EC2 skills. Copy-paste this directly into your GitHub repo.

markdown
---

## 📌 Project Scope

This project focuses on infrastructure, deployment, and operational debugging of a full-stack application in a production-like Linux environment.

The core objective was to simulate real-world DevOps responsibilities:

- Deploying an existing codebase
- Managing environment configuration
- Handling build systems and monorepos
- Configuring reverse proxy and TLS
- Securing runtime permissions
- Diagnosing and resolving production errors

The emphasis is on system reliability, security, and deployment architecture rather than feature development.
# 🚀 TaskFlow — Production Deployment (Linux + Nginx + systemd)

> A full-stack task management application, self-hosted and deployed from scratch on a Linux VM — without relying on managed platforms like Vercel, Railway, or Replit.

This project demonstrates **end-to-end production deployment**: server provisioning, reverse proxy configuration, process management, database setup, environment security, and HTTPS — the same workflow used in real-world DevOps environments.

---

## 📸 Preview

<!-- Add screenshots here -->
| Landing Page |
| <img width="1485" height="731" alt="Screenshot 2026-07-14 001952" src="https://github.com/user-attachments/assets/fba6a321-9ee9-42bb-b722-efcba35425d8" />
|Dashboard|
| <img width="1531" height="732" alt="Screenshot 2026-07-13 231811" src="https://github.com/user-attachments/assets/043e1144-542e-4565-b17f-27b77024569f" />
|Study Hub|
| <img width="1532" height="767" alt="Screenshot 2026-07-13 231843" src="https://github.com/user-attachments/assets/b7f9fa02-169c-4333-a862-5ad84a42ff37" />
 |

---

## 🏗 System Architecture

<img width="1248" height="832" alt="grok-imagine-image-quality_a_Client_(Browser)_│_▼" src="https://github.com/user-attachments/assets/2253dbf1-aac8-4932-b187-8bf3ce201289" />


**Key design decision:** the API server is never exposed directly to the internet — Nginx is the single public entry point, forwarding `/api/*` internally while serving the built frontend as static files.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite (TypeScript) |
| Backend | Node.js (TypeScript, monorepo) |
| Database | PostgreSQL |
| Reverse Proxy | Nginx |
| Process Manager | systemd |
| Auth | Clerk |
| TLS | Let's Encrypt (Certbot) |
| Package Manager | pnpm (monorepo) |

---

## ⚙️ Deployment Steps

### 1. Install System Dependencies

```bash
sudo apt update
sudo apt install -y curl git nginx postgresql postgresql-contrib

curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

sudo npm install -g pnpm@10
````

---

### 2. Clone & Install

```bash
sudo mkdir -p /opt/taskflow
sudo chown "$USER":"$USER" /opt/taskflow
cd /opt/taskflow

git clone <repo-url> .
pnpm install --frozen-lockfile
```

---

### 3. Configure PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE USER taskflow WITH PASSWORD 'CHANGE_ME';
CREATE DATABASE taskflow OWNER taskflow;
SQL
```

---

### 4. Environment Variables

**API Server** → `artifacts/api-server/.env.production`

```env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://taskflow:password@localhost:5432/taskflow
CLERK_SECRET_KEY=sk_live_xxxxx
SESSION_SECRET=your_generated_secret
```

**Frontend (build-time)** → `artifacts/taskflow/.env.production`

```env
PORT=5173
BASE_PATH=/
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
```

> Secrets are never committed. `.env*` is git-ignored.

---

### 5. Build

```bash
pnpm --filter @workspace/db run push
pnpm run build
```

---

### 6. systemd Service

`/etc/systemd/system/taskflow-api.service`

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

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now taskflow-api
```

---

### 7. Nginx Reverse Proxy

nginx
server {
    listen 80;
    server_name your-domain.com;

    root /opt/taskflow/artifacts/taskflow/dist/public;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    location / {
        try_files $uri /index.html;
    }
}


```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### 8. HTTPS via Let's Encrypt

```bash
sudo certbot --nginx -d your-domain.com
```

---

## ✅ Verification

```bash
curl http://127.0.0.1:8080/api/healthz
curl https://your-domain.com/api/healthz
```

---

## 🔁 Redeployment Workflow

```bash
cd /opt/taskflow
git pull
pnpm install --frozen-lockfile
pnpm run build
sudo systemctl restart taskflow-api
sudo systemctl reload nginx
```

---

## 🪵 Logs & Monitoring

```bash
sudo journalctl -u taskflow-api -f
sudo tail -f /var/log/nginx/error.log
```

---

## 🧩 Challenges Faced by me and how I fixed them 

Here's the expanded **Challenges Solved** section with the actual fixes and commands used — based on the real debugging you did. Copy-paste ready:

markdown
## 🧩 Challenges Solved

During deployment, several real production issues were encountered and debugged. Below is each issue with the exact fix applied.

---

### 1️⃣ Missing `DATABASE_URL` during schema push

**Problem:**


DATABASE\_URL, ensure the database is provisioned
ERR\_PNPM\_RECURSIVE\_RUN\_FIRST\_FAIL



**Cause:** `.env.production` is only loaded by the systemd service at runtime — it is **not** automatically available in an interactive shell session.

**Fix:** Exported the variable manually before running the schema push:

```bash
export DATABASE_URL="postgresql://taskflow:password@localhost:5432/taskflow"
pnpm --filter @workspace/db run push
````

---

### 2️⃣ `drizzle-kit: command not found`

**Problem:** Running `drizzle-kit` directly failed since it's a local dependency, not a global binary.

**Fix:** Always run it through the package's `pnpm` script instead of invoking the binary directly:

```bash
pnpm --filter @workspace/db run push
```

---

### 3️⃣ TypeScript project reference build order failure

**Problem:**

```
error TS6305: Output file '.../lib/db/dist/index.d.ts' has not been built from source file
```

**Cause:** The monorepo uses TypeScript **project references**. Running `tsc -p tsconfig.json` directly on `api-server` skipped building its dependencies (`lib/db`, `lib/api-zod`) first.

**Fix:** Used TypeScript's build mode, which resolves references and builds dependencies in the correct order:

```bash
pnpm exec tsc -b --clean
pnpm exec tsc -b
```

---

### 4️⃣ Root build script trying to build unrelated packages

**Problem:**

```
vite build
Error: PORT environment variable is required but was not provided.
@workspace/mockup-sandbox build failed
```

**Cause:** The root `pnpm run build` script recursively builds **every** workspace package, including a dev-only `mockup-sandbox` package that isn't needed in production and requires its own env vars.

**Fix:** Scoped the build to only the packages actually needed for deployment:

```bash
pnpm --filter ./artifacts/taskflow run build
pnpm --filter ./artifacts/api-server run build
```

---

### 5️⃣ Vite build failing due to missing `PORT`

**Problem:**

```
Error: PORT environment variable is required but was not provided.
```

**Cause:** Vite's build-time config reads `PORT` from `process.env`, but the shell running the build had no environment variables exported (they only existed in `.env.production`, which isn't auto-loaded).

**Fix:** Exported the required build-time variables before running the build:

```bash
export PORT=5173
export BASE_PATH=/
export VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx

pnpm --filter ./artifacts/taskflow run build
```

---

### 6️⃣ `systemd` service failing with `CHDIR permission denied`

**Problem:**

```
Changing to the requested working directory failed: Permission denied
Failed at step CHDIR spawning /usr/bin/node: Permission denied
status=200/CHDIR
```

**Cause:** The service runs as a dedicated `taskflow` system user, but the project lived under `/home/ubuntu/...`. Linux blocks directory traversal unless every parent directory grants execute (`x`) permission to that user — even if the target folder itself is owned correctly.

**Fix:** Granted traversal permission on the parent directories:

```bash
sudo chmod o+rx /home/ubuntu
sudo chmod -R o+rx /home/ubuntu/main-website

sudo systemctl restart taskflow-api
sudo systemctl status taskflow-api
```

*(Longer-term fix: move the app to `/opt/taskflow` instead of a user's home directory, and `chown -R taskflow:taskflow` it — avoids this class of permission issue entirely.)*

---

### 7️⃣ `EACCES` permission denied in `node_modules/.vite-temp`

**Problem:**

Error: EACCES: permission denied, open '.../node_modules/.vite-temp/vite.config.ts.timestamp-....mjs'


**Cause:** An earlier build was accidentally run with `sudo pnpm ...`, which created files owned by `root` inside `node_modules`. Subsequent builds run as the normal user could no longer write to those paths.

**Fix:** Restored correct ownership of the entire project directory instead of continuing to use `sudo`:

```bash
sudo chown -R $USER:$USER /home/ubuntu/main-website
rm -rf artifacts/taskflow/node_modules/.vite-temp

pnpm --filter ./artifacts/taskflow run build
```

**Rule applied going forward:** never run `pnpm`/`npm` build commands with `sudo` inside the project — fix ownership instead of escalating privileges.

---

### 8️⃣ Nginx serving stale API response (`Cannot GET /`)

**Problem:** Hitting `http://localhost:8080/` directly returned:

```
Cannot GET /
```

**Cause:** This was actually expected behavior, not a bug — the Node API only implements `/api/*` routes. The root path `/` is intentionally served by Nginx from the static frontend build, not by the API process.

**Verification:**

```bash
curl http://127.0.0.1:8080/api/healthz     # → {"status":"ok"}
curl http://localhost/api/healthz          # → {"status":"ok"} via Nginx proxy
```

Confirmed the separation of concerns (Nginx = static + proxy, Node = API only) was working as designed.

---


Want me to also merge this directly into the full README from before so you have **one complete final file** ready to paste?
---

## 🔐 Security Practices

* API server bound to `127.0.0.1` only — never exposed publicly
* Only ports `80`/`443` open externally
* `.env.production` excluded from version control
* Secrets loaded via `EnvironmentFile`, not hardcoded
* TLS enforced via Let's Encrypt with auto-renewal
* Dedicated non-privileged system user (`taskflow`) running the service

---

## 📌 Skills Demonstrated

* Linux server provisioning & hardening
* Reverse proxy configuration (Nginx)
* Process management with `systemd`
* Production build pipelines (TypeScript monorepo)
* Environment variable & secrets management
* PostgreSQL setup & schema migration
* TLS/SSL automation
* Real-world debugging (permissions, build order, env scope)
* AWS EC2 

---
---

## 📬 Contact

If you'd like to discuss this project, DevOps practices or notes (free of cost ), or potential opportunities:

- 🔗 LinkedIn: www.linkedin.com/in/monu-jangra-8b343437a
- 📧 Email: jangramonu908@gmail.com
- 💻 GitHub: https://github.com/MonuJangra-git

Open to DevOps, Cloud, and Infrastructure roles.
## 📄 License

MIT

---

## 📌 Note

This repository emphasizes deployment and infrastructure configuration.  
Some UI/demo-specific files (e.g., Study Hub content) are not included, as the primary focus is on production setup and operational debugging.

---
