# 🚀 TaskFlow — Production Deployment (Linux + Nginx + systemd → Docker)

> A full-stack task management application, self-hosted and deployed from scratch —
> first on a raw Linux VM, then containerized with Docker.
> No managed platforms. No shortcuts. Real infrastructure.
> Backup Option for data to s3

This project demonstrates **two complete deployment approaches**:
- **Phase 1** — Traditional Linux deployment (Nginx + systemd + PostgreSQL)
- **Phase 2** — Containerized deployment using Docker & Docker Compose

Both phases reflect real-world DevOps workflows used in production environments.

---

## 📸 Preview

| Landing Page |
|---|
| <img width="1485" height="731" alt="Screenshot 2026-07-14 001952" src="https://github.com/user-attachments/assets/1d3311b2-0772-4243-a755-f259e755f8f6" />
 |

| Dashboard |
|---|
| <img width="1531" height="732" alt="Screenshot 2026-07-13 231811" src="https://github.com/user-attachments/assets/a702389b-56d9-4a88-b19b-d49863296b66" />
 |

| Study Hub |
|---|
| <img width="1480" height="781" alt="Screenshot 2026-07-13 231538" src="https://github.com/user-attachments/assets/3baf9322-25a6-4b08-9a62-57846d642359" />
|

---

## 📌 Project Scope

This project focuses on **infrastructure, deployment, and operational debugging** of a
full-stack application in a production-like Linux environment.

Real-world DevOps responsibilities simulated:

- Deploying an existing codebase on raw Linux
- Managing environment configuration & secrets
- Handling build systems and monorepos
- Configuring reverse proxy and TLS
- Securing runtime permissions
- Diagnosing and resolving production errors
- Containerizing with Docker for portability and reproducibility

The emphasis is on **system reliability, security, and deployment architecture**
rather than feature development.

---

## 🏗 System Architecture

### Phase 1 — Traditional Linux Deployment

<img width="1024" height="1305" alt="Copilot_20260719_141342" src="https://github.com/user-attachments/assets/5ff231b2-86b9-4dbb-8cf6-5bf6a92cf0c7" />


**Key design decision:** The API server is never exposed directly to the internet.
Nginx is the single public entry point — forwarding `/api/*` internally while
serving the built frontend as static files.

---

### Phase 2 — Docker Architecture

<img width="1024" height="1166" alt="Copilot_20260719_141637" src="https://github.com/user-attachments/assets/99af2f49-2b1a-4168-9cb0-e31e18acaafd" />
```
All containers communicate via Docker internal network
Only Nginx is exposed to the outside world
```

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite (TypeScript) |
| Backend | Node.js (TypeScript, monorepo) |
| Database | PostgreSQL |
| Reverse Proxy | Nginx |
| Process Manager | systemd (Phase 1) / Docker (Phase 2) |
| Containerization | Docker + Docker Compose |
| Auth | Clerk |
| TLS | Let's Encrypt (Certbot) |
| Package Manager | pnpm (monorepo) |
| Cloud | AWS EC2 |

---

---

# 📦 Phase 1 — Traditional Linux Deployment

> Deployed directly on Ubuntu Linux using Nginx, systemd, and PostgreSQL
> installed on the host machine. No containers.

---

## ⚙️ Deployment Steps

### 1. Install System Dependencies

```bash
sudo apt update
sudo apt install -y curl git nginx postgresql postgresql-contrib

curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

sudo npm install -g pnpm@10
```

---

### 2. Clone & Install

```bash
sudo mkdir -p /opt/taskflow
sudo chown "$USER":"$USER" /opt/taskflow
cd /opt/taskflow

git clone https://github.com/MonuJangra-git/taskflow-production-deployment.git
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

> ⚠️ Secrets are never committed. `.env*` is git-ignored.

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
```<img width="1024" height="1305" alt="Copilot_20260719_141342" src="https://github.com/user-attachments/assets/755103fe-2c5e-45cf-adee-201750126834" />


---

### 7. Nginx Reverse Proxy



```bash
sudo apt install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
# below commands are commands that are used after changing nginx conf
sudo nginx -t
sudo systemctl reload nginx
```

---

### 8. HTTPS via Let's Encrypt

```bash
sudo certbot --nginx -d your-domain.com
```

---

## ✅ Phase 1 Verification

```bash
curl http://127.0.0.1:8080/api/healthz
curl https://your-domain.com/api/healthz
```

---

## 🔁 Phase 1 Redeployment Workflow

```bash
cd /opt/taskflow
git pull
pnpm install --frozen-lockfile
pnpm run build
sudo systemctl restart taskflow-api
sudo systemctl reload nginx
```

---

## 🪵 Phase 1 Logs & Monitoring

```bash
sudo journalctl -u taskflow-api -f
sudo tail -f /var/log/nginx/error.log
```

---

---
---

## ☁️ Automated PostgreSQL Backups to AWS S3

To ensure disaster recovery, database backups are exported from the Docker PostgreSQL container and uploaded to AWS S3 daily.

> Docker volumes preserve local data, but S3 provides off‑server durability.

### 🏗 Backup Flow

```
PostgreSQL (Docker Volume)
        ↓
pg_dump (inside container)
        ↓
gzip compression
        ↓
AWS S3 (encrypted + versioned)
```

---

### 🔧 Setup

#### 1️⃣ Install AWS CLI

```bash
sudo apt update && sudo apt install unzip -y
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip awscliv2.zip && sudo ./aws/install
```

Verify:

```bash
aws --version
```

#### 2️⃣ Configure Access

✅ Recommended: Attach an **IAM Role** to EC2 with:

- `s3:PutObject`
- `s3:ListBucket`

Or manually configure:

```bash
aws configure
```

---

### 📦 Backup Script
[Note:- Before using backup script use your own bucket name from S3.And at least run 1 time manually to test the script because there may be some issue due to AWS IAM permission on account or account not properly configured in linux  ]

```bash
chmod +x /home/ubuntu/backup-to-s3.sh
```

---

### ⏰ Automate (Daily 2 AM)

```bash
crontab -e
```

Add:

```bash
0 2 * * * /home/ubuntu/backup-to-s3.sh
```

---

### 🔄 Restore from S3
```bash
aws s3 cp s3://taskflow-db-backups/backup.sql.gz .
gunzip backup.sql.gz

cat backup.sql \
| docker exec -i $(docker compose ps -q db) \
  psql -U taskflow -d taskflow
```

---

✅ Off-site encrypted backups  
✅ No local storage dependency  
✅ Fully automated via cron  

---

# 🐳 Phase 2 — Docker Deployment

> Same application, now fully containerized.
> Each service runs in its own isolated container.
> Entire stack starts with a single command.

---

## 💡 Why Docker After Phase 1?

| Problem in Phase 1 | How Docker Solves It |
|---|---|
| "Works on my machine" issues | Every environment runs identical containers |
| Manual dependency installation | All deps baked into image |
| Systemd config per server | `docker-compose up` everywhere |
| Hard to scale individual services | Each container scales independently |
| Environment setup takes hours | New server ready in minutes |

---

## 📁 Docker File Structure

```
taskflow/
├── artifacts/taskflow/Dockerfile.frontend     # Frontend build image  
├── docker-compose.yml      # Orchestrates all services
├── nginx/
│   └── nginx.conf        # Nginx config for Docker
├── .env.docker             # Docker environment variables # change to .env and edit the env variables according to user 
└── .dockerignore           # Files excluded from image
```

---

## 🐳 Dockerfile — API Server

---
Note:- All Dockerfile and docker-compose files are provided in this project , user can check these files in the project files inside the project.
1. docker-compose.yml :- /docker-compose.yml
2. Dockerfile-frontend :- /artifacts/taskflow/Dockerfile
3. Dockerfile-backend :- /artifacts/api-server/Dockerfile
---




---

## 🔑 Environment Variables for Docker (Very Important)

`.env` (never committed — add to `.gitignore`)

```env
# Database
DB_PASSWORD=your_strong_password_here

# API
CLERK_SECRET_KEY=sk_live_xxxxx
SESSION_SECRET=your_generated_secret_here

# Frontend (build-time)
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
```

---

## 🚀 Running with Docker

### First Time Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd taskflow

# 2. Create your environment file
cp .env.docker.example .env.docker
# Fill in your actual secrets in .env.docker

# 3. Run database migrations
docker compose run --rm api node dist/migrate.mjs

# 4. Start everything
docker compose --env-file .env.docker up -d --build
```

---

### Daily Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs (all services)
docker compose logs -f

# View logs (specific service)
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f db

# Rebuild after code changes
docker compose up -d --build

# Check running containers
docker compose ps
```

---

## ✅ Phase 2 Verification

```bash
# Check all containers are running
docker compose ps

# Test API directly inside network
docker compose exec api wget -qO- http://localhost:8080/api/healthz

# Test through Nginx proxy
curl http://localhost/api/healthz

# Check database connection
docker compose exec db psql -U taskflow -c "\l"
```

---

## 🔁 Phase 2 Redeployment Workflow

```bash
cd /opt/taskflow
git pull

# Rebuild and restart with zero manual steps
docker compose --env-file .env.docker up -d --build

# Remove old unused images
docker image prune -f
```

---

## 🪵 Phase 2 Logs & Monitoring

```bash
# Follow all logs
docker compose logs -f

# API logs only
docker compose logs -f api

# Check resource usage
docker stats

# Inspect a container
docker inspect taskflow_api
```

---

---

## 🧩 Challenges Solved

During both deployments, several real production issues were
encountered and debugged.

---

### Phase 1 Challenges

---

#### 1️⃣ Missing `DATABASE_URL` during schema push

**Problem:**
```
DATABASE_URL, ensure the database is provisioned
ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL
```

**Cause:** `.env.production` is only loaded by the systemd service at runtime —
not automatically available in an interactive shell session.

**Fix:**
```bash
export DATABASE_URL="postgresql://taskflow:password@localhost:5432/taskflow"
pnpm --filter @workspace/db run push
```

---

#### 2️⃣ `drizzle-kit: command not found`

**Problem:** Running `drizzle-kit` directly failed since it's a local dependency.

**Fix:**
```bash
pnpm --filter @workspace/db run push
```

---

#### 3️⃣ TypeScript project reference build order failure

**Problem:**
```
error TS6305: Output file '.../lib/db/dist/index.d.ts' has not been built
```

**Cause:** Running `tsc -p tsconfig.json` directly skipped building dependencies.

**Fix:**
```bash
pnpm exec tsc -b --clean
pnpm exec tsc -b
```

---

#### 4️⃣ Root build script building unrelated packages

**Problem:**
```
@workspace/mockup-sandbox build failed
Error: PORT environment variable is required
```

**Fix:**
```bash
pnpm --filter ./artifacts/taskflow run build
pnpm --filter ./artifacts/api-server run build
```

---

#### 5️⃣ Vite build failing due to missing `PORT`

**Problem:**
```
Error: PORT environment variable is required but was not provided.
```

**Fix:**
```bash
export PORT=5173
export BASE_PATH=/
export VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx

pnpm --filter ./artifacts/taskflow run build
```

---

#### 6️⃣ `systemd` service failing with `CHDIR permission denied`

**Problem:**
```
Changing to the requested working directory failed: Permission denied
status=200/CHDIR
```

**Cause:** Service ran as `taskflow` user but project was under `/home/ubuntu/`
— Linux blocks traversal without execute permission on every parent.

**Fix:**
```bash
sudo chmod o+rx /home/ubuntu
sudo chmod -R o+rx /home/ubuntu/main-website
sudo systemctl restart taskflow-api
```

*(Long-term fix: Move app to `/opt/taskflow` — avoids this entirely)*

---

#### 7️⃣ `EACCES` permission denied in `node_modules/.vite-temp`

**Problem:**
```
Error: EACCES: permission denied, open '...node_modules/.vite-temp/...'
```

**Cause:** Earlier build was accidentally run with `sudo pnpm`, creating
root-owned files inside `node_modules`.

**Fix:**
```bash
sudo chown -R $USER:$USER /home/ubuntu/main-website
rm -rf artifacts/taskflow/node_modules/.vite-temp
pnpm --filter ./artifacts/taskflow run build
```

**Rule:** Never run `pnpm`/`npm` with `sudo`. Fix ownership instead.

---

#### 8️⃣ Nginx serving stale API response (`Cannot GET /`)

**Problem:** `http://localhost:8080/` returned `Cannot GET /`

**Cause:** Expected — API only handles `/api/*` routes.
Root `/` is intentionally served by Nginx.

**Verification:**
```bash
curl http://127.0.0.1:8080/api/healthz    # → {"status":"ok"}
curl http://localhost/api/healthz         # → {"status":"ok"} via Nginx
```

---

### Phase 2 Challenges (Docker)

---
All errors that I faced during deployment is in error-proofs folder and also I mention the solution of each error that I faced during deployment. 

---

## ⚖️ Phase 1 vs Phase 2 — Comparison

| Aspect | Phase 1 (Linux + systemd) | Phase 2 (Docker) |
|---|---|---|
| Setup time on new server | ~1-2 hours | ~5 minutes |
| Dependency management | Manual apt/npm installs | Baked into image |
| Environment isolation | Shared OS packages | Fully isolated containers |
| Process management | systemd | Docker restart policies |
| Scaling | Manual | `docker compose scale` |
| Portability | Server-specific | Run anywhere with Docker |
| Debugging | `journalctl`, system logs | `docker compose logs` |
| Database | Host PostgreSQL | Containerized PostgreSQL |
| Rollback | Git + rebuild | Previous image tag |
| Learning value | Deep Linux knowledge | Industry-standard DevOps |

---

## 🔐 Security Practices

* API server never exposed publicly — internal network only
* Only ports `80`/`443` open externally
* `.env*` files excluded from version control
* Secrets loaded via environment files — never hardcoded
* TLS enforced via Let's Encrypt with auto-renewal
* Dedicated non-privileged system user in Phase 1
* Non-root user inside Docker containers in Phase 2
* Docker internal network — containers isolated from host
* Backup for linux deployment , set filesupload to  S3  in cronjobs.(Recommended method)
* Backup for container deployment , mount a volume , even volume is deleted but data still safe.

---

## 📌 Skills Demonstrated

* Linux server provisioning & hardening
* Reverse proxy configuration (Nginx)
* Process management with systemd
* Docker multi-stage builds
* Docker Compose orchestration
* Container networking & service discovery
* Environment variable & secrets management
* PostgreSQL setup 
* TLS/SSL automation (Let's Encrypt)
* Real-world debugging (permissions, build order, env scope, networking)
* AWS EC2 deployment
* AWS S3 backup strategy
* AWS IAM 
* Infrastructure evolution (bare metal → containers)
* Backup using S3 and volume in local machine or EC2 

---

## 📬 Contact

If you'd like to discuss this project, DevOps practices, or potential opportunities:

- 🔗 LinkedIn: www.linkedin.com/in/monu-jangra-8b343437a
- 📧 Email: jangramonu908@gmail.com
- 💻 GitHub: https://github.com/MonuJangra-git

Open to DevOps, Cloud, and Infrastructure roles.

---

## 📄 License

MIT

---

## 📌 Note

This repository emphasizes deployment and infrastructure configuration.
Some UI/demo-specific files (e.g., Study Hub content) are not included,
as the primary focus is on production setup and operational debugging.

The project exists in two deployment phases — both fully documented above.
