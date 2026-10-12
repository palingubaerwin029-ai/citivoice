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

## 💻 Web App Deployment (Admin Console — React SPA)

The CitiVoice Admin Console (`admin-web`) is a React Single-Page Application (SPA) that communicates with the backend via REST API and WebSockets. In production, it compiles into static HTML, JavaScript, and CSS assets.

You can deploy the Web App using any of the following three proven methods:

---

### Method A: Docker + Nginx on Cloud VPS *(Recommended — Included in Repo)*

Since CitiVoice includes a multi-stage [Dockerfile](file:///c:/project/citivoice/admin-web/Dockerfile) and [nginx.conf](file:///c:/project/citivoice/admin-web/nginx.conf), you can serve the admin console directly on your VPS alongside the database and backend.

#### 1. Configure the Environment & Build
Pass your production API URL at build time:
```bash
# In your project root, set the API URL in .env
REACT_APP_API_URL=https://api.yourdomain.com/api

# Build and start the admin container
docker compose up -d --build admin-web
```
*The container will build the React bundle and serve it via an ultra-lightweight Alpine Nginx image on port `8080`.*

#### 2. Configure Host Nginx Reverse Proxy & SSL (Domain Setup)
On your VPS, route public traffic to the Docker containers with Let's Encrypt SSL:

```nginx
# /etc/nginx/sites-available/citivoice-admin
server {
    server_name admin.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and issue a free SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/citivoice-admin /etc/nginx/sites-enabled/
sudo certbot --nginx -d admin.yourdomain.com
```

---

### Method B: Global Edge CDN (Vercel / Netlify / Cloudflare Pages) *(100% Free Tier)*

If you want the admin dashboard delivered with global CDN speed and zero server maintenance, deploy it to a Jamstack platform for free while keeping the backend on your VPS/PaaS.

#### Configuration Settings for Vercel / Netlify / Cloudflare Pages:
| Setting | Value |
| :--- | :--- |
| **Framework Preset** | Create React App |
| **Root Directory** | `admin-web` |
| **Build Command** | `npm run build` |
| **Output Directory** | `build` |
| **Environment Variable** | `REACT_APP_API_URL=https://api.yourdomain.com/api` |

#### SPA Routing Fallback Rule (Avoid 404 on Page Refresh):
Because React uses client-side routing (`/concerns/12`, `/users`, etc.), any page refresh needs to route to `index.html`:
* **For Vercel:** Add `admin-web/vercel.json`:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```
* **For Netlify:** Add `admin-web/public/_redirects`:
  ```text
  /*    /index.html   200
  ```
* **For Cloudflare Pages:** Add `admin-web/public/_routes.json` or automatic SPA setting.

---

### Method C: Standalone Static Host on Linux VPS (Without Docker)

If you are running the backend natively via Node.js/PM2 on a Linux server without Docker:

```bash
# 1. Build the production bundle
cd admin-web
REACT_APP_API_URL=https://api.yourdomain.com/api npm run build

# 2. Copy the build output to web root
sudo mkdir -p /var/www/citivoice-admin
sudo cp -r build/* /var/www/citivoice-admin/

# 3. Configure Nginx to serve static files
sudo nano /etc/nginx/sites-available/citivoice-admin
```

Add this server block:
```nginx
server {
    listen 80;
    server_name admin.yourdomain.com;
    root /var/www/citivoice-admin;
    index index.html;

    # Support React client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets for high speed
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
```

---

### ⚠️ Web App Production Checklist

1. **HTTPS Matching (No Mixed Content):**  
   If your Admin Web runs on `https://admin.yourdomain.com`, `REACT_APP_API_URL` **must also use `https://`**. Browsers block HTTP API requests made from HTTPS sites.
2. **Backend CORS Whitelist:**  
   In your `backend/.env`, ensure your admin web domain is added to `ALLOWED_ORIGINS`:
   ```env
   ALLOWED_ORIGINS=https://admin.yourdomain.com,http://localhost:3000
   ```
3. **WebSockets Reverse Proxy:**  
   Ensure your backend Nginx reverse proxy configuration has WebSocket headers (`Upgrade`, `Connection "upgrade"`) so Socket.IO real-time alerts function properly on the admin web:
   ```nginx
   location /socket.io/ {
       proxy_pass http://127.0.0.1:5000/socket.io/;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

---

## 🌍 Best Free Domain Options for CitiVoice

If you don't have a paid custom domain yet, here are the best **100% free** domain solutions tested for CitiVoice:

---

### 1. 🏆 Platform Edge Subdomains *(Best for Admin Web — Free HTTPS & Instant Setup)*

When deploying `admin-web` on Jamstack/PaaS platforms, you get a free, permanent subdomain with **automatic SSL certificate provisioning**:

| Provider | Your Free Domain Format | Features |
| :--- | :--- | :--- |
| **Vercel** | `citivoice-admin.vercel.app` | ⚡ Fastest global CDN, clean branding, never expires, automatic Let's Encrypt SSL. |
| **Cloudflare Pages** | `citivoice.pages.dev` | 🛡️ Protected by Cloudflare Enterprise DDoS mitigation, unmetered bandwidth. |
| **Netlify** | `citivoice.netlify.app` | 🟢 Instant continuous deployment on Git push, automatic HTTPS. |
| **Render** | `citivoice-admin.onrender.com` | Useful if your backend is also hosted on Render. |

> **Why this is best for the Admin Web:**  
> These subdomains have high domain reputation, never trigger browser malware/spam warnings, require zero DNS setup, and never expire.

---

### 2. 🦆 DuckDNS *(Best for Backend API & VPS / Docker Deployments)*

If you are running the backend on a Linux VPS (DigitalOcean, AWS Lightsail, Hetzner, or a public IP):

* **Website:** [duckdns.org](https://www.duckdns.org)
* **Your Domain:** `citivoice-api.duckdns.org`
* **Cost:** **100% Free forever** (run by a trusted non-profit).
* **Key Advantages:**
  - **No Monthly Captcha/Renewals:** Unlike No-IP (which requires monthly manual clicks), DuckDNS subdomains never expire.
  - **Certbot / Let's Encrypt Compatible:** Easily obtain a valid HTTPS certificate on your Nginx server (`certbot --nginx -d citivoice-api.duckdns.org`).
  - **Dynamic IP Support:** If your server IP changes, a simple 1-line cron script keeps the DNS updated.

---

### 3. 🎓 Free Real Custom TLD (GitHub Student Developer Pack)

If you are a student with an active school email or ID:

* **Portal:** [GitHub Student Developer Pack](https://education.github.com/pack)
* **What You Get:**
  - **1 Free Year `.me` domain** from Namecheap (e.g., `citivoice.me`).
  - **1 Free Year `.tech` domain** (e.g., `citivoice.tech`).
  - **1 Free Year `.live` domain** from Name.com.
* Gives your capstone / thesis project an official, professional top-level domain without paying registrar fees.

---

### ⚠️ Domain Names to Avoid

* **Freenom TLDs (`.tk`, `.ml`, `.ga`, `.cf`, `.gq`):**  
  Freenom lost registrar accreditation in 2023 due to legal action and no longer issues domains. Furthermore, search engines, antivirus software, and email providers flag these TLDs as suspicious/spam.

---

### 💡 Recommended Setup for CitiVoice

| Component | Recommended Free Domain | How to Configure |
| :--- | :--- | :--- |
| **Admin Web Console** | `citivoice.vercel.app` | Deploy via Vercel connecting the `admin-web` folder. |
| **Backend API & WebSockets** | `citivoice-api.duckdns.org` | Point DuckDNS A record to your VPS IP and run Certbot for HTTPS. |
| **Mobile App Config** | Connects to `https://citivoice-api.duckdns.org/api` | Set in `mobile/src/services/api.jsx`. |

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
