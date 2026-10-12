# 🌐 CitiVoice — Hosting & Deployment Platform Guide

This document outlines the recommended hosting platforms, architectures, pricing, and deployment strategies for **CitiVoice** (Kabankalan City Citizen Engagement & Grievance Redressal System).

---

## 🏗️ System Architecture Overview

Before choosing a platform, here is what CitiVoice requires in production:

| Component | Technology | Hosting Requirements |
| :--- | :--- | :--- |
| **Backend API** | Node.js (Express), ES6 | Long-running process, background cron jobs, multipart uploads |
| **Realtime Engine** | Socket.IO (WebSockets) | Persistent WebSocket connections (cannot use pure serverless without adapter) |
| **Database** | MySQL 8.0 | Persistent SSD storage, daily/hourly automated dumps, connection pooling |
| **Admin Console** | React (SPA), Nginx | Static assets or Nginx container, SSL/HTTPS |
| **Citizen Mobile App** | React Native (Expo SDK 57) | Android `.apk` / `.aab` builds, iOS `.ipa`, Over-The-Air (OTA) updates |
| **File Storage** | Uploaded Photos & IDs | Persistent disk volume or Object Storage (S3 / Cloudflare R2) |

---

## 🏆 Top Hosting Platform Options

---

### Option 1: Cloud VPS with Docker Compose *(Recommended)*

Since CitiVoice already includes a production-ready `docker-compose.yml` (`citivoice-mysql`, `citivoice-backend`, `citivoice-admin`, and `citivoice-db-backup`), deploying to a single Linux VPS is the cleanest and most cost-effective path.

#### Top Providers:

| Provider | Recommended Spec | Est. Monthly Cost | Latency in Philippines | Key Benefits |
| :--- | :--- | :--- | :--- | :--- |
| **DigitalOcean** | 2 GB RAM, 1 vCPU Droplet | **$12 / mo** *(or $6 / mo 1GB)* | ⚡ Very Low (Singapore DC) | Super intuitive UI, automated snapshots, seamless Docker support |
| **AWS Lightsail** | 2 GB RAM, 1 vCPU Instance | **$10 / mo** *(or $5 / mo 1GB)* | ⚡ Very Low (Singapore DC) | Fixed predictable billing, easy scaling into AWS ecosystem |
| **Hetzner Cloud** | 4 GB RAM, 2 vCPU (CX22) | **~€4.50 / mo (~$5)** | 🟡 Medium (EU / US) | Highest CPU/RAM per dollar, great for budget capstone |
| **Linode / Akamai** | 2 GB RAM, 1 vCPU Nanode/Shared | **$12 / mo** | ⚡ Very Low (Singapore DC) | Solid uptime, fast networking |

#### Why this is #1 for CitiVoice:
* **Zero Rewriting:** Runs your existing `docker compose up -d --build` out of the box.
* **Full WebSockets Support:** Socket.IO works seamlessly with no connection timeouts.
* **Built-in Automated Backups:** The included `citivoice-db-backup` container dumps MySQL automatically to disk.
* **Free SSL:** Automatic HTTPS via Let's Encrypt / Certbot reverse proxy.

---

### Option 2: Modern Cloud PaaS *(Zero Server Management)*

If you prefer not to manage Linux updates, firewalls, or SSH keys, Platform-as-a-Service (PaaS) automatically deploys your code directly from GitHub.

| Platform | Best For | Estimated Cost | Pros & Cons |
| :--- | :--- | :--- | :--- |
| **[Railway.app](https://railway.app)** | Rapid 1-click deployment | ~$5 – $10 / month (Pay-per-use) | ✅ Built-in MySQL database plugin<br>✅ Supports Docker Compose<br>✅ Auto-deploys on Git push |
| **[Render.com](https://render.com)** | Hybrid static + web service | Free Admin Web + $7/mo Backend | ✅ Admin Web hosts free as Static Site<br>❌ Free tier backend sleeps after inactivity (requires $7 paid plan) |
| **[Fly.io](https://fly.io)** | Edge container hosting | Free tier or ~$5/mo | ✅ Deploys Docker containers near users<br>❌ Volumes require CLI configuration |

---

### Option 3: Government / Enterprise Tier *(Official LGU Rollout)*

If Kabankalan City or a government LGU officially adopts CitiVoice for public production, enter a multi-tier cloud setup for high availability, security compliance, and disaster recovery:

```
[ Citizens (Mobile) ]       [ City Admin (Web) ]
           │                           │
           ▼                           ▼
    [ Cloudflare CDN & DDoS Protection / SSL ]
                       │
                       ▼
    [ AWS Application Load Balancer / ECS ]
           │                           │
           ▼                           ▼
[ Node.js Backend API ]      [ Cloudflare R2 / S3 ]
(WebSockets + Rest API)      (Photos, Citizen IDs, Proofs)
           │
           ▼
[ AWS RDS MySQL Database ]
(Multi-AZ, Daily Snapshots, Point-in-time Restore)
```

* **Compute:** AWS ECS (Elastic Container Service) or Google Cloud Run.
* **Database:** AWS RDS for MySQL (automated failover and multi-AZ replication).
* **Storage:** Cloudflare R2 or AWS S3 (zero egress fees for citizen attachments).
* **Security:** Cloudflare Enterprise or AWS WAF for government cyber compliance.

---

## 📱 Mobile App Distribution (Expo SDK 57)

To distribute the CitiVoice citizen mobile app:

### 1. Standalone Android APK (Direct Download for Citizens / Evaluators)
Using **Expo EAS Build**, you can generate a direct `.apk` without publishing to Google Play:
```bash
# In the mobile directory
npx eas-cli login
npx eas-cli build -p android --profile preview
```
* **Cost:** **Free** on Expo Free Tier.
* **Result:** Download link / QR code to install the APK on any Android smartphone.

### 2. Google Play Store (Official Public Release)
* **Cost:** $25 one-time registration fee.
* **Build command:** `npx eas-cli build -p android --profile production`
* Outputs an optimized `.aab` (Android App Bundle).

### 3. Apple App Store (iOS)
* **Cost:** $99 / year (Apple Developer Program).
* **Build command:** `npx eas-cli build -p ios --profile production`

### 4. Over-The-Air (OTA) Instant Updates
Fix bugs or update UI/translations instantly without waiting for app store reviews:
```bash
npx eas-cli update --branch production --message "Fix translations and UI"
```

---

## 📊 Comparison Summary Matrix

| Metric | Cloud VPS (DigitalOcean / Lightsail) | PaaS (Railway / Render) | Enterprise (AWS / GCP) |
| :--- | :--- | :--- | :--- |
| **Setup Difficulty** | 🟢 Moderate (Follow script) | 🟢 Very Easy (Click & Connect) | 🔴 Advanced (DevOps expertise) |
| **Monthly Cost** | 💰 **$6 – $12 / mo** | 💰 **$5 – $15 / mo** | 💰 **$40 – $120+ / mo** |
| **Docker Compose Support** | ⭐⭐⭐⭐⭐ Native 100% | ⭐⭐⭐ Limited | ⭐⭐⭐⭐ Via ECS / Cloud Run |
| **WebSocket Stability** | ⭐⭐⭐⭐⭐ Rock Solid | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Industrial Grade |
| **Automated Backups** | ⭐⭐⭐⭐ Built-in volume dumps | ⭐⭐⭐ Basic | ⭐⭐⭐⭐⭐ Instant Multi-AZ |
| **Best Used For** | **Capstone, Live Demos & First LGU Launch** | **Rapid Testing & Staging** | **Scale City-Wide Public Production** |

---

## 🎯 Recommended Next Step for CitiVoice

For your current setup, the most balanced and cost-effective approach is:
1. **Host Backend & Admin:** Provision a **$6 – $12/month DigitalOcean Droplet (Singapore)** or **AWS Lightsail**.
2. **Launch Stack:** Run `docker compose up -d` (see `deployment.md` for the exact step-by-step commands).
3. **Build Mobile APK:** Run `eas build -p android --profile preview` to distribute the Android app.
