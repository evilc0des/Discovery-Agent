# Deployment Guide

## Prerequisites

- Node.js 20+ (for local builds)
- Docker (for containerized deploys)
- A DigitalOcean API token (`DIGITALOCEAN_TOKEN`) for LLM inference
- Git repository with the project source

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DIGITALOCEAN_TOKEN` | Yes | — | DigitalOcean API token for AI inference |
| `OPENAI_API_KEY` | No | — | Fallback LLM provider (SDK type-check requires it) |
| `NODE_ENV` | No | — | Set to `production` for production deploys |
| `SESSIONS_DIR` | No | `sessions` | Directory for session JSON files |
| `UPLOADS_DIR` | No | `uploads` | Directory for uploaded files |
| `PORT` | No | `3000` | HTTP server port |
| `STORAGE_BACKEND` | No | `file` | `file` or `supabase` |
| `SUPABASE_URL` | If `supabase` | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | If `supabase` | — | Supabase service role key |
| `SUPABASE_STORAGE_BUCKET` | No | `client-uploads` | Supabase storage bucket name |

## Platform Options

---

### 1. GCP Cloud Run (Recommended)

Serverless container platform. Scales to zero (no cost when idle). Pay only for requests.

**Persistence caveat:** Cloud Run is stateless. Session files are lost on container restart unless you mount a Cloud Storage bucket via **Cloud Run Volume Mounts** or switch to a database.

#### Option A: Stateless (sessions lost on restart — suitable for short-lived demos)

1. **Build and push the image:**

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/intake-agent
```

2. **Deploy:**

```bash
gcloud run deploy intake-agent \
  --image gcr.io/PROJECT_ID/intake-agent \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars DIGITALOCEAN_TOKEN=doo_v1_...,NODE_ENV=production,SESSIONS_DIR=/app/sessions \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 3
```

#### Option B: With persistent sessions via Cloud Storage FUSE

1. **Create a Cloud Storage bucket:**

```bash
gcloud storage buckets create gs://intake-agent-sessions --location=us-central1
```

2. **Deploy with volume mount (gcloud beta):**

```bash
gcloud beta run deploy intake-agent \
  --image gcr.io/PROJECT_ID/intake-agent \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars DIGITALOCEAN_TOKEN=doo_v1_...,NODE_ENV=production,\
SESSIONS_DIR=/mnt/sessions \
  --add-volume name=sessions,type=cloud-storage,bucket=intake-agent-sessions \
  --add-volume-mount volume=sessions,mount-path=/mnt/sessions \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 3
```

#### Option C: GCP Compute Engine (VM — simplest persistence)

Run on a small VM with a persistent disk. Sessions survive restarts naturally.

1. **Create a VM:**

```bash
gcloud compute instances create intake-agent-vm \
  --zone us-central1-a \
  --machine-type e2-small \
  --image-family cos-stable \
  --image-project cos-cloud \
  --boot-disk-size 20GB
```

2. **SSH in, clone the repo, and run with Docker Compose** (see [Docker section](#docker-self-hosted)).

**Cost:** ~$15–20/month for an e2-small VM (1 vCPU, 2 GB RAM).

---

### 2. DigitalOcean Droplet (Recommended for DO)

DigitalOcean App Platform does **not** support persistent volume mounts — the container filesystem is ephemeral and session data is lost on redeploy or restart. Use a Droplet (VPS) instead for file-based persistence.

#### Option A: Deploy on a Droplet with Docker

1. **Create a Droplet** (Basic plan, $6/month — 1 vCPU, 1 GB RAM is sufficient).
   - Image: Ubuntu 24.04 LTS
   - Add your SSH key.

2. **SSH in and set up:**

```bash
ssh root@<droplet-ip>

# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone and run
git clone <repo-url> intake-agent
cd intake-agent

# Set secrets
echo 'DIGITALOCEAN_TOKEN=doo_v1_...' > .env.local
echo 'NODE_ENV=production' >> .env.local

docker compose up --build -d
```

The `docker-compose.yml` mounts `./sessions:/app/sessions` on the Droplet's local disk — sessions persist across restarts.

3. **Set up automatic container restarts** (already handled by Docker Compose with the default restart policy, or add `restart: unless-stopped`).

**Add HTTPS with Caddy or Nginx** — see the [reverse proxy section](#docker-self-hosted).

#### Option B: App Platform (stateless — demos only)

If you don't need session persistence between deploys, App Platform works as follows:

1. Push repo to GitHub/GitLab.
2. In DO dashboard: **Create → App → Choose your repo**.
3. DO auto-detects the Dockerfile. Set **HTTP Port** to `3000`.
4. Add env vars: `DIGITALOCEAN_TOKEN`, `NODE_ENV=production`.
5. Deploy.

Sessions are lost on every deploy or restart. Only suitable for short-lived demos.

**Cost:** Droplets start at $6/month (persistent). App Platform basic plan is $5/month (ephemeral).

---

### 3. Docker Self-Hosted (Any VPS)

Runs anywhere with Docker: DigitalOcean Droplet, Linode, Hetzner, AWS EC2, etc.

```bash
# On the server
git clone <repo-url> intake-agent
cd intake-agent

# Set environment variables
echo 'DIGITALOCEAN_TOKEN=doo_v1_...' > .env.local
echo 'NODE_ENV=production' >> .env.local

# Launch
docker compose up --build -d
```

The `docker-compose.yml` already mounts `./sessions:/app/sessions` for persistent storage.

Add a reverse proxy for HTTPS (Caddy example):

```caddyfile
intake.example.com {
    reverse_proxy localhost:3000
}
```

---

### 4. Free / Near-Free Options

These platforms offer free tiers for small projects. Sessions will be **lost on idle/cold-start** unless you add external persistence.

#### 4a. Fly.io

Free allowance: 3 shared-CPU VMs (256 MB RAM), 3 GB persistent volume per app.

```bash
# Install flyctl: https://fly.io/docs/flyctl/install/

flyctl launch --image intake-agent:latest --port 3000

# Create a persistent volume for sessions
flyctl volumes create sessions_data --size 1 --region iad

# Set secrets
flyctl secrets set DIGITALOCEAN_TOKEN=doo_v1_...

# Deploy with volume mount (edit fly.toml to add):
#   [mounts]
#     source = "sessions_data"
#     destination = "/app/sessions"

flyctl deploy
```

**Cost:** Free within allowance. If you exceed, it's usage-based (~$2–5/month for light use).

#### 4b. Render

Free tier: 750 hours/month of web service runtime (one instance), sleeps on inactivity (spins up on request).

1. Push repo to GitHub/GitLab.
2. In Render dashboard: **New → Web Service → Connect repo**.
3. Configure:
   - **Runtime:** Docker
   - **Port:** `3000`
   - **Environment Variables:** `DIGITALOCEAN_TOKEN`, `NODE_ENV=production`
4. Create a **Render Disk** (1 GB) and mount at `/app/sessions` for persistence.

**Cost:** Free for one instance. Disk starts at $0.25/GB/month. Instance sleeps after 15 min of inactivity (cold start ~30–60 seconds).

#### 4c. Hugging Face Spaces (Docker)

Free Docker runtime. Limited CPU/RAM. Not ideal for production but works for demos.

1. Create a new Space at https://huggingface.co/new-space.
2. Choose **Docker** as the SDK.
3. Push a Dockerfile. Clone the Space repo and push.
4. Set `DIGITALOCEAN_TOKEN` in Space Settings → Secrets.

**Limitations:** 16 GB disk, 16 GB RAM, 4 vCPU. No persistent volume — sessions lost on restart.

#### 4d. Railway

$5 one-time credit for new accounts (zero ongoing cost until credit runs out).

1. Push repo to GitHub.
2. In Railway: **New Project → Deploy from GitHub repo**.
3. Railway auto-detects the Dockerfile.
4. Set environment variables and a volume mount.

**Cost:** $5 credit covers ~1 month of the base plan. Then ~$5/month.

---

### 5. Platform Comparison

| Platform | Persistence | Free Tier | Complexity | Best For |
|---|---|---|---|---|
| **GCP Cloud Run** | Optional (GCS FUSE) | No | Medium | Production, auto-scaling |
| **GCP Compute Engine** | Yes (disk) | No | Low | Simple VM deployment |
| **DO Droplet** | Yes (disk) | No | Low | DO ecosystem, persistent |
| **Docker on VPS** | Yes (disk) | N/A | Low | Full control |
| **Fly.io** | Yes (Volume) | Yes (3 VMs) | Medium | Free + persistent |
| **Render** | Yes (Disk) | Yes (750h) | Low | Easiest free option |
| **Hugging Face** | No | Yes | Low | Demos only |
| **Railway** | Yes (Volume) | No ($5 credit) | Low | Quick setup |

### Recommended for each use case:

- **Production, serious use:** GCP Cloud Run with GCS FUSE (auto-scaling) or DO Droplet with Docker (simpler, persistent).
- **Free, minimal maintenance:** Render (free tier) or Fly.io (free tier).
- **Quick demo:** Hugging Face Spaces (free, no persistence needed).
- **Full control / already have a VPS:** Docker Compose on any VPS.

---

## Post-Deployment Verification

1. Visit `https://<your-domain>/` — the landing page should load.
2. Create a session (type a requirement) — a session should be created without errors.
3. Check that LLM responses work (signs of `DIGITALOCEAN_TOKEN` being valid).
4. Inspect the sessions directory to confirm files are being written:
   ```bash
   # On the server
   ls /app/sessions/
   ```

## Troubleshooting

| Symptom | Likely Cause |
|---|---|
| 500 on chat | `DIGITALOCEAN_TOKEN` missing or invalid |
| Sessions disappear after restart | No persistent volume mounted for `/app/sessions` |
| Build fails in Cloud Run | Image too large or build-time env vars missing |
| Cold start slow on Render | Free tier spins down — first request after idle takes 30–60s |
| Port binding errors | Check `PORT` env var matches the platform's expected port |
