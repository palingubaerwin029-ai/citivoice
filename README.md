# 📢 CitiVoice

<p align="center">
  <img src="admin-web/public/logo.png" alt="CitiVoice Logo" width="180" />
</p>

<p align="center">
  <strong>Your Voice. Your Community.</strong><br />
  A modern, full-stack civic reporting and municipal community management platform connecting citizens with local government administrators.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v20-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-v4.19-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-SDK_57-000020?logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/Groq_AI-Llama_3.3-F55036?logo=groq&logoColor=white" alt="Groq" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker" />
</p>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
  - [Artificial Intelligence (Groq & Llama 3.3)](#-artificial-intelligence-groq--llama-33)
  - [GPS Pinned Coordinate Analytics](#-gps-pinned-coordinate-analytics)
  - [Community Priority Escalation Engine](#-community-priority-escalation-engine)
  - [Executive 2-Page Municipal Print Reports](#-executive-2-page-municipal-print-reports)
  - [Email OTP Verification Workflow](#-email-otp-verification-workflow)
  - [GIS Mapping & Spatial Visualization](#-gis-mapping--spatial-visualization)
  - [Automated Database Backups](#-automated-database-backups)
  - [Adaptive Dark & Light Theme System](#-adaptive-dark--light-theme-system)
- [Tech Stack](#-tech-stack)
- [Database Schema & Optimization](#-database-schema--optimization)
- [Project Directory Structure](#-project-directory-structure)
- [Complete API Catalog](#-complete-api-catalog)
- [Installation & Getting Started](#-installation--getting-started)
- [Environment Configuration](#-environment-configuration)
- [Docker & Container Orchestration](#-docker--container-orchestration)
- [Remote Development & Mobile Testing](#-remote-development--mobile-testing)
- [Security & Compliance](#-security--compliance)
- [Available Monorepo Scripts](#-available-monorepo-scripts)
- [License](#-license)

---

## 🌟 Overview

**CitiVoice** is an end-to-end civic engagement ecosystem designed for municipal governments, tailored specifically for the **City of Kabankalan, Negros Occidental**. The platform bridges the communication gap between citizens and local government administrators through transparency, real-time feedback, and data-driven civic response:

1. **Cross-Platform Citizen Mobile App** (iOS & Android via React Native & Expo SDK 57):
   Allows residents to report public safety issues, infrastructure hazards, and municipal concerns using photos, GPS pin placement, and dynamic templates, while tracking resolution progress in real time.
2. **Executive Web Admin Dashboard** (React 19):
   Empowers city administrators, department heads, and municipal officers to manage incoming concerns, track spatial hotspot clusters on interactive GIS maps, dispatch actions, and generate official 2-page print analytics.
3. **High-Performance REST & WebSocket Backend** (Express.js, Socket.io, MySQL 8.0):
   Provides secure identity verification, AI-driven report categorization (Groq Llama 3.3), automated upvote/age priority escalation, real-time bi-directional notifications, and scheduled database backups.

---

## 🏗️ System Architecture

```
citivoice/
├── backend/          # Express.js REST API + WebSocket Server (Node 20, MySQL 8.0)
├── admin-web/        # React 19 Executive Admin Dashboard & GIS Mapping
├── mobile/           # React Native Citizen Application (Expo SDK 57)
├── backups/          # Automated database dumps & scheduled archives
├── docker-compose.yml # Multi-container production orchestration
└── package.json      # Monorepo workspace orchestration
```

```
┌─────────────────────────────────┐        ┌──────────────────────────────────┐
│   Citizen Mobile App (Expo 57)  │        │   Admin Web Dashboard (React 19) │
│  • Pinned GPS Incident Reports  │        │  • GIS Map & Incident Dispatch   │
│  • Email OTP Verification       │        │  • 2-Page Executive Reports      │
│  • Community Upvoting & Feed    │        │  • Barangay & User Management    │
│  • Real-Time Push Alerts        │        │  • Live WebSocket Dashboards     │
└────────────────┬────────────────┘        └─────────────────┬────────────────┘
                 │                                           │
                 │              HTTP / WebSockets            │
                 └───────────────────┬───────────────────────┘
                                     │
                     ┌───────────────▼──────────────┐
                     │     CitiVoice REST API       │
                     │  • Express.js + Socket.io    │
                     │  • Groq Llama 3.3 AI Engine  │
                     │  • Priority Escalation Job   │
                     │  • Multi-Tier Backup Service │
                     └───────────────┬──────────────┘
                                     │
                     ┌───────────────▼──────────────┐
                     │    MySQL 8.0 + Auto Backup   │
                     │  • 12 Performance Indexes    │
                     │  • Daily Automated Dumps     │
                     └──────────────────────────────┘
```

---

## 🚀 Key Features

### 🤖 Artificial Intelligence (Groq & Llama 3.3)
- **Instant Category Classification** — Processes citizen incident descriptions and categorizes them automatically (e.g., *Road Obstruction, Flooding, Sanitation, Electrical Hazard, Water Service, Public Safety*).
- **Severity & Urgency Scoring** — Automatically evaluates urgency and detects public hazards to assign initial priority flags.
- **Dialect & Localization Awareness** — Understands local dialects and colloquial terms (Hiligaynon, Cebuano, Filipino, and English), accurately processing place names and dialect expressions such as *"baha"*, *"lubak"*, or *"kuryente"*.

### 📍 GPS Pinned Coordinate Analytics
- **Pinpoint Geolocation** — Citizen reports capture precise coordinates via device GPS or interactive map pin placement.
- **Kabankalan Centroid Distance Matching** — Automatically matches every concern to the nearest of all **32 Kabankalan barangays** (e.g., *Oringao, Bantayan, Barangay 1, Camingawan, Dancalan*) using exact Euclidean centroid distance calculation. This guarantees reports reflect the **actual incident location**, regardless of where the reporting citizen resides.
- **"Most Concerned Barangay" Ranking** — Dynamic dashboard intelligence aggregates concerns by pinned barangay, highlighting top incident locations, percentage share of city concerns, and primary issue categories.

### 📈 Community Priority Escalation Engine
- **Upvote-Driven Escalation** — Open concerns (`Pending` or `In Progress`) gain priority as community endorsement grows:
  - **10+ community upvotes**: Automatically escalated from `Low` to `Medium`.
  - **20+ community upvotes**: Automatically escalated to `High`.
- **Elapsed-Time Escalation** — Ensures citizen reports are not neglected:
  - Open for **> 3 days**: Escalated from `Low` to `Medium`.
  - Open for **> 7 days**: Escalated from `Medium` to `High`.
- **Safety Safeguards** — Priority is strictly upgraded and never downgraded by automated jobs; flagged non-typical concerns are safely excluded.

### 📄 Executive 2-Page Municipal Print Reports
- **Strict 2-Page Layout Guarantee** — Uses CSS `@media print` rules (`@page { size: A4 portrait; margin: 8mm 10mm; }`) and explicit page-break boundaries to format official municipal analytics onto **exactly 2 pages** without spillover:
  - **Page 1: Executive Overview & Trends** — Official Republic of the Philippines / City Government of Kabankalan header, 5 KPI metric cards, monthly submission & resolution trend table, status distribution, and priority breakdown.
  - **Page 2: Geographic Analysis & Community Priorities** — Section running header, ranked barangay concerns table, top upvoted citizen concerns, resolution rate breakdown, and formal certification sign-off block (*Prepared by System Admin, Verified by Public Information Office, Noted by City Mayor*).
- **Zero Screen Bleed** — Print headers, page breaks, and certification blocks are styled with `display: none !important` by default and render strictly during print preview (`window.print()`).

### ✉️ Email OTP Verification Workflow
- **Pre-Registration Verification** — Prevents bot accounts and invalid registrations by requiring citizens to verify their email address via a 6-digit OTP code before an account can be created.
- **Secure Hash Validation** — OTPs are hashed and verified with expiration timestamps and anti-tampering guards.
- **Account Recovery** — Secure email dispatch via Nodemailer for password resets.

### 🗺️ GIS Mapping & Spatial Visualization
- **Web Admin Leaflet Map** — Full-screen interactive map featuring marker clustering (`react-leaflet-cluster`), heatmap intensity overlays (`leaflet.heat`), and filtering by status, category, and barangay.
- **Mobile Citizen Map** — Native React Native Maps integration displaying color-coded status pins, live user location, and cluster aggregation.

### 💾 Automated Database Backups
- **Containerized Daily Backups** — Powered by `databack/mysql-backup`, creating automated daily snapshots in the `backups/` volume.
- **Admin On-Demand Backups** — Administrators can trigger instant MySQL dumps, export portable JSON snapshots, or download backup archives directly from the Web Admin dashboard.

### 🎨 Adaptive Dark & Light Theme System
- **Curated High-Contrast Design System** — Tailored CSS variables (`--bg`, `--surface`, `--text-1`, `--border-md`).
- **High-Visibility Tooltips** — Recharts tooltips adaptively render crisp, high-visibility white text in dark mode (`#F1F5F9`) and dark slate in light mode (`#0F172A`) across both Dashboard and Reports.

---

## 🛠️ Tech Stack

### Backend API
| Package | Version | Purpose |
|---------|---------|---------|
| **Node.js** | 20.x | JavaScript runtime environment |
| **Express.js** | 4.19.2 | REST API routing and middleware |
| **MySQL** | 8.0 | Primary relational database |
| **mysql2** | 3.9.7 | High-performance MySQL client with connection pooling |
| **Socket.io** | 4.8.3 | Bi-directional real-time WebSocket communications |
| **Groq SDK** | 1.3.0 | Llama 3.3 AI NLP classification engine |
| **Nodemailer** | 8.0.5 | Transactional email & OTP verification dispatch |
| **Expo Server SDK** | 6.1.0 | Mobile push notification delivery |
| **Multer** | 1.4.5 | Multipart file and image upload handling |
| **Bcrypt.js** | 2.4.3 | Salted password hashing (10 rounds) |
| **JSON Web Tokens** | 9.0.2 | Stateless bearer authentication |
| **Helmet & HPP** | Latest | Security headers and HTTP parameter pollution protection |
| **Compression** | 1.7.4 | Gzip compression for high-volume API payloads |

### Admin Dashboard (Web)
| Package | Version | Purpose |
|---------|---------|---------|
| **React** | 19.0.0 | Component-based UI framework |
| **React Router** | 6.23.1 | Client-side routing and deep-linking |
| **Recharts** | 2.12.7 | Interactive charts and analytics visualization |
| **Leaflet** | 1.9.4 | Interactive web GIS mapping |
| **React-Leaflet** | 5.0.0 | React bindings for Leaflet GIS layers |
| **Leaflet Heat & Cluster** | 0.2.0 / 4.1.3 | Heatmap layer and marker clustering |
| **Socket.io-client** | 4.8.3 | Real-time WebSocket event listeners |
| **React Icons** | 5.6.0 | Modern SVG iconography |

### Citizen Mobile App
| Package | Version | Purpose |
|---------|---------|---------|
| **React Native** | 0.86.3 | Native cross-platform mobile framework |
| **Expo SDK** | 57.0.27 | Mobile development toolkit and native bridges |
| **React Navigation** | 6.x | Native stack and bottom tab navigation |
| **React Native Maps** | 1.27.2 | Interactive native map view |
| **RN Map Clustering** | 4.0.0 | Real-time map marker clustering |
| **Expo Location** | 57.0.20 | Hardware GPS and reverse geocoding |
| **Expo Image Picker** | 57.0.20 | Camera capture and photo gallery selection |
| **AsyncStorage** | 2.2.0 | Offline persistence and JWT token storage |
| **Socket.io-client** | 4.8.3 | Real-time incident alert listener |

---

## 🗄️ Database Schema & Optimization

CitiVoice runs on MySQL 8.0 with InnoDB engine and `utf8mb4_unicode_ci` encoding.

### Primary Tables
- **`users`** — Citizen and administrator profiles, hashed passwords, verification statuses, and uploaded ID card references.
- **`email_verifications`** — Ephemeral 6-digit OTP verification records with expiration timestamps.
- **`concerns`** — Incident reports containing title, description, category, priority, status, latitude, longitude, pinned address, upvote counts, and media URLs.
- **`barangays`** — 32 Kabankalan barangay records and reference centroids.
- **`departments`** — Municipal department classifications (e.g., Engineering, Traffic, Health, CDRRMO).
- **`concern_timeline`** — Chronological audit trail of all concern status updates and administrator notes.
- **`notifications`** — In-app citizen alerts and broadcast logs.

### ⚡ 12 Performance Indexes
To guarantee sub-10ms query execution times under municipal load, the database schema implements 12 strategic indexes:
1. `idx_concerns_status` on `concerns(status)`
2. `idx_concerns_category` on `concerns(category)`
3. `idx_concerns_created_at` on `concerns(created_at)`
4. `idx_concerns_user_id` on `concerns(user_id)`
5. `idx_concerns_priority` on `concerns(priority)`
6. `idx_concerns_status_cat` on `concerns(status, category)`
7. `idx_concerns_status_prio` on `concerns(status, priority)`
8. `idx_users_role` on `users(role)`
9. `idx_users_verification` on `users(verification_status)`
10. `idx_notifications_user_id` on `notifications(user_id)`
11. `idx_notifications_is_read` on `notifications(is_read)`
12. `idx_timeline_concern_id` on `concern_timeline(concern_id)`

---

## 📁 Project Directory Structure

```
citivoice/
├── backend/
│   ├── database/
│   │   └── schema.sql              # MySQL schema & performance indexes
│   ├── middleware/
│   │   ├── auth.js                 # JWT verification & role-based guards
│   │   ├── cache.js                # In-memory route caching middleware
│   │   ├── requireRole.js          # Role-based authorization guard
│   │   ├── upload.js               # Multer image storage and validation
│   │   └── validate.js             # Express-validator schemas
│   ├── routes/
│   │   ├── auth.js                 # Login, Register, Send OTP, Verify OTP
│   │   ├── backup.js               # Database dumps, JSON export, and restore
│   │   ├── barangays.js            # Barangay geographic records CRUD
│   │   ├── concerns.js             # Incident reporting CRUD, upvotes, status
│   │   ├── departments.js          # Municipal department records
│   │   ├── notifications.js        # Citizen notifications and push triggers
│   │   └── users.js                # Profile updates, ID review, roles
│   ├── services/
│   │   ├── aiService.js            # TensorFlow & Groq Llama 3.3 NLP pipeline
│   │   ├── backupService.js        # Automated daily MySQL backup scheduler
│   │   ├── idVerificationService.js # Government ID automated verification
│   │   ├── notificationService.js  # Email & push notification dispatchers
│   │   └── priorityService.js      # Community upvote & age priority escalation
│   ├── db.js                       # Connection pool with health monitoring
│   └── server.js                   # Main application entry point with WebSockets
│
├── admin-web/
│   ├── public/                     # Static assets, branding, and HTML shell
│   └── src/
│       ├── components/             # Reusable UI components (Sidebar, Skeleton, etc.)
│       ├── pages/
│       │   ├── Dashboard.jsx       # Real-time analytics and high-level KPIs
│       │   ├── Concerns.jsx        # Tabular concern management and filtering
│       │   ├── ConcernDetail.jsx   # Concern review, status updates, timeline
│       │   ├── MapView.jsx         # Full-screen Leaflet GIS map with heatmaps
│       │   ├── Reports.jsx         # Executive analytics & 2-page print reporting
│       │   ├── Barangays.jsx       # Barangay CRUD and statistics
│       │   ├── Users.jsx           # User management and role assignment
│       │   └── Verification.jsx    # ID verification queue
│       ├── services/
│       │   └── api.js              # Axios client & Kabankalan coordinate matching
│       ├── styles/                 # Modular CSS stylesheets with dark/light theming
│       └── index.css               # Global theme variables & Recharts tooltip styling
│
├── mobile/
│   └── src/
│       ├── screens/
│       │   ├── auth/               # Login, Register, Email OTP, and ID Upload
│       │   ├── citizen/            # Feed, Incident Submit, Map, My Concerns, Profile
│       │   └── admin/              # Mobile admin dashboard & concern dispatch
│       ├── navigation/             # AppNavigator and bottom tab configurations
│       ├── services/               # API clients, auth helpers, socket connection
│       ├── context/                # AuthContext and ThemeContext
│       └── i18n/                   # English, Filipino, and Hiligaynon translations
│
├── backups/                        # Persistent daily database archives
├── docker-compose.yml              # Multi-container orchestration specification
└── package.json                    # Monorepo root scripts
```

---

## 🔌 Complete API Catalog

All endpoints are hosted under `/api`.

### Authentication & Account Verification
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/auth/send-otp` | Public | Generate and email a 6-digit verification OTP |
| `POST` | `/api/auth/verify-otp` | Public | Validate email OTP code before registration |
| `POST` | `/api/auth/register` | Public | Register a new citizen account |
| `POST` | `/api/auth/login` | Public | Authenticate user and issue JWT bearer token |

### Civic Concerns Management
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET`  | `/api/concerns` | Authenticated | List concerns with filtering, sorting, and pagination |
| `POST` | `/api/concerns` | Citizen | Submit a new concern with photo attachments & GPS coords |
| `GET`  | `/api/concerns/:id` | Authenticated | Retrieve complete concern details, timeline, and location |
| `PATCH`| `/api/concerns/:id` | Admin | Update concern status (`Pending`, `In Progress`, `Resolved`, `Rejected`) |
| `POST` | `/api/concerns/:id/upvote` | Citizen | Toggle citizen upvote on a concern |

### Barangays & Municipal Records
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET`  | `/api/barangays` | Authenticated | List all 32 Kabankalan barangays |
| `POST` | `/api/barangays` | Admin | Create a new barangay entry |
| `PUT`  | `/api/barangays/:id` | Admin | Update barangay name or boundary information |
| `DELETE`| `/api/barangays/:id` | Admin | Delete a barangay record |

### Municipal Departments
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET`  | `/api/departments` | Authenticated | List all municipal departments |
| `POST` | `/api/departments` | Admin | Create a new department entry |
| `PUT`  | `/api/departments/:id` | Admin | Update department information |
| `DELETE`| `/api/departments/:id` | Admin | Remove a department entry |

### User Management & ID Verification
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET`  | `/api/users` | Admin | List registered citizen and admin accounts |
| `PATCH`| `/api/users/:id` | Admin | Update citizen verification status or role |

### Database Backup & Maintenance
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET`  | `/api/backup` | Admin | List available database dumps and status |
| `POST` | `/api/backup/db` | Admin | Trigger an immediate mysqldump snapshot |
| `POST` | `/api/backup/export` | Admin | Trigger a portable JSON data export |
| `POST` | `/api/backup/import` | Admin | Import and restore a JSON data backup |
| `GET`  | `/api/backup/download/:file`| Admin | Download a backup archive |
| `DELETE`| `/api/backup/:file` | Admin | Delete a backup file |
| `GET`  | `/api/health` | Public | System and database uptime check |

---

## 📦 Installation & Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or v20 LTS
- [Docker & Docker Compose](https://www.docker.com/) (Recommended for full-stack orchestration)
- [Expo Go](https://expo.dev/expo-go) app installed on your physical mobile device (or Android/iOS Simulator)

### 1. Clone the Repository

```bash
git clone https://github.com/palingubaerwin029-ai/citivoice.git
cd citivoice
```

### 2. Install Dependencies

Install all monorepo dependencies across the root, backend, admin web, and mobile packages:

```bash
npm run install:all
```

---

## ⚙️ Environment Configuration

Create the respective `.env` files in each subproject:

### **Backend (`backend/.env`)**
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=citivoice
DB_PORT=3307
JWT_SECRET=your_super_secret_jwt_key_here

# Groq Llama 3.3 AI Integration
GROQ_API_KEY=gsk_your_groq_api_key_here

# Email OTP Verification & Notifications (Gmail / SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password

# Database Backups
BACKUP_ENABLED=true
BACKUP_INTERVAL_HOURS=24
```

### **Admin Web (`admin-web/.env`)**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### **Mobile (`mobile/.env`)**
```env
EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:5000/api
```
*(Replace `<YOUR_LOCAL_IP>` with your machine's local Wi-Fi IP, e.g., `192.168.1.100`, so physical mobile devices can connect to the backend).*

---

## 🐳 Docker & Container Orchestration

CitiVoice provides a multi-container `docker-compose.yml` for turnkey deployment:

```bash
# Start all containers in the background
docker compose up -d

# Check running status
docker compose ps
```

### Container Services:
| Service | Container Name | Port Mapping | Description |
|---------|----------------|--------------|-------------|
| `database` | `citivoice-mysql` | `3307:3306` | MySQL 8.0 with persistent named volume `mysql_data` |
| `backend` | `citivoice-backend` | `5000:5000` | Node.js Express REST API & WebSockets |
| `admin-web` | `citivoice-admin` | `8080:80` | Nginx Alpine serving production React admin app |
| `db-backup` | `citivoice-db-backup` | N/A | Automated daily database dump container |

To rebuild after source code modifications:
```bash
docker compose up --build -d admin-web
docker compose up --build -d backend
```

---

## 📱 Remote Development & Mobile Testing

To test the mobile app on physical phones over cellular or different Wi-Fi networks:

### Option A — Expo Tunnel (Zero Setup)
```bash
cd mobile
npx expo start --tunnel
```

### Option B — LocalTunnel or Ngrok
1. In `backend/`:
   ```bash
   npm run tunnel
   ```
2. Update `mobile/.env` with the generated public URL:
   ```env
   EXPO_PUBLIC_API_URL=https://your-tunnel-subdomain.loca.lt/api
   ```
3. Start the mobile app:
   ```bash
   cd mobile
   npx expo start -c
   ```

---

## 🔒 Security & Compliance

- **Stateless JWT Authorization** — Expiring bearer tokens validated on every authenticated API route.
- **Bcrypt Password Hashing** — Passwords hashed with 10 salt rounds before persistence.
- **Strict Role-Based Access Control (RBAC)** — Granular route guards separating `citizen` and `admin` permissions.
- **Cross-Origin Security** — Custom CORS & CORP headers protecting uploads while allowing cross-platform asset rendering.
- **SQL Injection Prevention** — Prepared statements and parameterized queries via `mysql2`.
- **Rate Limiting & Slowdown** — `express-rate-limit` and `express-slow-down` protecting authentication and incident submission endpoints.
- **Input Sanitization** — `express-validator` schema validation on all incoming payload bodies.

---

## 📜 Available Monorepo Scripts

From the repository root (`package.json`):

| Script | Command | Description |
|--------|---------|-------------|
| `install:all` | `npm run install:all` | Concurrently install dependencies in root, backend, admin, and mobile |
| `dev` | `npm run dev` | Start backend, admin-web, and mobile development servers simultaneously |
| `backend` | `npm run backend` | Start backend server with Nodemon hot-reloading |
| `web` | `npm run web` | Start React admin dashboard locally on port 3000 |
| `mobile` | `npm run mobile` | Start Expo Metro bundler for mobile development |
| `db:up` | `npm run db:up` | Launch Docker containers in the background |
| `db:down` | `npm run db:down` | Stop and tear down Docker containers |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

© 2026 **CitiVoice Team** · Dedicated to building smarter, more responsive local communities.
