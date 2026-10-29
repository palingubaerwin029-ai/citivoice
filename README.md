# 📢 CitiVoice

<p align="center">
  <img src="admin-web/public/logo.png" alt="CitiVoice Logo" width="180" />
</p>

<p align="center">
  <strong>Your Voice. Your Community.</strong><br />
  A modern, full-stack civic reporting and municipal community management platform connecting citizens with local government administrators in <strong>Kabankalan City, Negros Occidental</strong>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v22-339933?logo=node.js&logoColor=white" alt="Node.js" />
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
  - [Public Landing Portal & Mobile APK Distribution](#-public-landing-portal--mobile-apk-distribution)
  - [Artificial Intelligence (Groq Llama 3.3 & Vision)](#-artificial-intelligence-groq-llama-33--vision)
  - [Live Camera-Only Capture & Smart Government ID Verification](#-live-camera-only-capture--smart-government-id-verification)
  - [Offline-First Mobile Caching (Stale-While-Revalidate)](#-offline-first-mobile-caching-stale-while-revalidate)
  - [Administrator Two-Factor Authentication (2FA) via Email OTP](#-administrator-two-factor-authentication-2fa-via-email-otp)
  - [Email OTP & Google OAuth Citizen Verification](#-email-otp--google-oauth-citizen-verification)
  - [GPS Pinned Coordinate Analytics & Barangay Matching](#-gps-pinned-coordinate-analytics--barangay-matching)
  - [Direct Citizen-Admin Conversation Thread & Live Comments](#-direct-citizen-admin-conversation-thread--live-comments)
  - [Priority Escalation & Smart Duplicate Detection](#-priority-escalation--smart-duplicate-detection)
  - [Official Tabular Municipal Print Reports](#-official-tabular-municipal-print-reports)
  - [GIS Mapping & Spatial Visualization](#-gis-mapping--spatial-visualization)
  - [Automated Database Backups & OneDrive Cloud Sync](#-automated-database-backups--onedrive-cloud-sync)
  - [Adaptive Dark & Light Theme System (Web & Mobile)](#-adaptive-dark--light-theme-system-web--mobile)
- [Tech Stack](#-tech-stack)
- [Database Schema & Performance Indexes](#-database-schema--performance-indexes)
- [Project Directory Structure](#-project-directory-structure)
- [Complete API Catalog](#-complete-api-catalog)
- [Installation & Getting Started](#-installation--getting-started)
- [Environment Configuration](#-environment-configuration)
- [Docker & Container Orchestration](#-docker--container-orchestration)
- [Mobile App Development & EAS Cloud Builds](#-mobile-app-development--eas-cloud-builds)
- [Security & Compliance](#-security--compliance)
- [Available Monorepo Scripts](#-available-monorepo-scripts)
- [License](#-license)

---

## 🌟 Overview

**CitiVoice** is an end-to-end civic engagement ecosystem tailored for the **City of Kabankalan, Negros Occidental**. It bridges the communication gap between citizens and local government administrators through real-time reporting, AI-assisted triage, spatial GIS analytics, and transparent resolution tracking:

1. **Cross-Platform Citizen Mobile App** (*Android & iOS via React Native 0.86 & Expo SDK 57*):
   Enables residents to capture live camera photos of infrastructure hazards or municipal concerns, pin exact GPS coordinates, track resolution milestones offline or online, and converse directly with city officials in English, Filipino, or Hiligaynon.
2. **Public Landing Page & Executive Web Admin Portal** (*React 19*):
   Provides a public civic portal (`/`) with direct Android APK downloads, QR code scanning, and step-by-step installation instructions alongside a protected Executive Admin Console (`/login`) for managing concerns, viewing GIS heatmaps, verifying citizen identities, and printing official municipal reports.
3. **High-Performance MVC REST & WebSocket Backend** (*Node.js 22, Express.js, Socket.io, MySQL 8.0 / Aiven Cloud*):
   Powers stateless JWT authentication, Admin 2FA, Groq Llama 3.3 categorization and image alignment checks, automated age-based priority escalation, real-time bi-directional WebSocket updates, and scheduled database backups.

---

## 🏗️ System Architecture

```
citivoice/
├── backend/            # Express.js MVC REST API + Socket.io Server (Node 22, MySQL 8.0)
├── admin-web/          # React 19 Public Landing Page, Admin Dashboard & Leaflet GIS
├── mobile/             # React Native Citizen Application (Expo SDK 57)
├── backups/            # Automated database dumps & scheduled archives
├── docker-compose.yml  # Multi-container production orchestration
└── package.json        # Monorepo workspace scripts
```

```
┌───────────────────────────────────┐        ┌────────────────────────────────────┐
│    Citizen Mobile App (Expo 57)   │        │   Web Portal & Admin (React 19)    │
│  • Live Camera Incident Capture   │        │  • Public Landing & APK QR Portal  │
│  • Offline SWR Cache & Sync Queue │        │  • GIS Heatmap & Cluster Analytics │
│  • Dynamic Gov ID Verification    │        │  • Direct Citizen Chat & AI Drafts │
│  • Google OAuth & Email OTP Auth  │        │  • Official Landscape Print Ledger │
│  • Real-Time Push & Socket Alerts │        │  • 2FA Admin Console & Backups     │
└─────────────────┬─────────────────┘        └─────────────────┬──────────────────┘
                  │                                            │
                  │              HTTPS / WebSockets            │
                  └────────────────────┬───────────────────────┘
                                       │
                       ┌───────────────▼──────────────┐
                       │    CitiVoice MVC REST API    │
                       │  • Express.js + Socket.io    │
                       │  • Groq Llama 3.3 + Vision   │
                       │  • Priority Escalation Cron  │
                       │  • Hybrid Disk/DB File Store │
                       └───────────────┬──────────────┘
                                       │
                       ┌───────────────▼──────────────┐
                       │    MySQL 8.0 / Aiven Cloud   │
                       │  • 17 Performance Indexes    │
                       │  • Automated Daily Backups   │
                       └──────────────────────────────┘
```

---

## 🚀 Key Features

### 🌐 Public Landing Portal & Mobile APK Distribution
- **Dedicated Civic Landing Page (`/`)** — Welcomes residents and officials with an overview of CitiVoice, supported municipal categories, a 3-step reporting workflow, and coverage across all **32 Kabankalan City barangays**.
- **Direct Mobile App Download & QR Code** — Features a one-click **Download Android APK** button (`https://expo.dev/accounts/erwin1229/projects/citivoice/builds/8245dfa8-1d7b-47b9-88c0-3700acd0d7e6`, configurable via `REACT_APP_APK_URL`), a scannable QR code for mobile cameras, and a copyable download link.
- **4-Step Android Installation Guide** — Walks citizens through downloading the `.apk`, allowing unknown sources on Android 8+, installing the package, and signing in.

### 🤖 Artificial Intelligence (Groq Llama 3.3 & Vision)
- **Automated Category & Urgency Triage** — Analyzes citizen incident descriptions to classify reports (*Road & Infrastructure, Electricity, Drainage, Waste & Sanitation*) and assign initial severity (`Low`, `Medium`, `High`).
- **Visual Photo-to-Report Alignment** — Verifies that the captured incident photo genuinely matches the written concern description and flags off-topic or inappropriate images before submission.
- **Multilingual & Dialect Awareness** — Understands **Hiligaynon**, **Filipino**, and **English**, accurately interpreting local terms such as *"baha"*, *"lubak"*, *"poste"*, or *"basura"*.
- **AI-Assisted Admin Replies** — Administrators can generate empathetic, official municipal responses with a single click (**✨ AI Draft**).

### 📸 Live Camera-Only Capture & Smart Government ID Verification
- **Anti-Spoofing Camera-Only Enforcement** — Both **Government ID Verification** and **Concern Report Submission** strictly launch the device camera (`launchCamera`), disabling gallery uploads to ensure authentic, real-time photo evidence.
- **Format-Aware Philippine ID Validation** — Dynamically adapts input masks, placeholders, character limits, keyboard types, and validation rules for 10 official ID types:
  - *National ID (PhilSys)* (`XXXX-XXXX-XXXX-XXXX`)
  - *Driver's License (LTO)* (`AXX-XX-XXXXXX`)
  - *UMID*, *Passport*, *PhilHealth ID*, *SSS ID*, *Postal ID*, *Voter's ID*, *PRC ID*, and *Senior Citizen ID*.
- **AI OCR ID Verification** — Automatically scans the captured government ID photo to verify that the printed name matches the registered citizen's name, supporting instant auto-verification or flagging for manual administrator review.

### ⚡ Offline-First Mobile Caching (Stale-While-Revalidate)
- **Instant Zero-Spinner Screen Loads** — Hydrates the mobile UI immediately from `AsyncStorage` caches while silently revalidating fresh data from the API in the background:
  - **User Session Cache (`cv_user`)** — Instant authenticated startup even on slow or offline mobile connections, only logging out on explicit `401`/`403` token rejection.
  - **My Reports & Stats Cache (`cv_my_concerns_<userId>`, `cv_my_stats_<userId>`)** — Instant rendering of citizen concern lists and status counters.
  - **Concern Detail & Thread Cache (`cv_concern_detail_<id>`)** — Previously viewed reports and admin conversations remain readable offline.
  - **Notifications Cache (`cv_notifications_<userId>`)** — Instant access to notification history with optimistic read/delete updates.
- **Offline Concern Queue (`offline_concerns_queue`)** — Citizens can submit concerns without internet connectivity; reports are queued locally and automatically synchronized once connectivity is restored.

### 🔐 Administrator Two-Factor Authentication (2FA) via Email OTP
- **Mandatory Second Factor** — Admin portal sign-ins require a cryptographically random 6-digit OTP sent to the administrator's official email after password verification.
- **Short-Lived MFA Token** — Issues a transient `mfaToken` prior to OTP verification, withholding full JWT access until the 6-digit code is confirmed (10-minute expiry, 45-second resend cooldown).

### ✉️ Email OTP & Google OAuth Citizen Verification
- **Pre-Registration Email Verification** — Citizens can verify their `@gmail.com` address either via a 6-digit **Email OTP** or one-tap **Google Sign-In** (`expo-auth-session` native OAuth flow) to skip manual OTP entry.
- **Editable Citizen Profile** — Citizens can update their mobile number (`09XXXXXXXXX` / `+639XXXXXXXXX`), barangay, street address, profile avatar, and language preference (*English, Filipino, Hiligaynon*) while keeping their verified legal name locked.

### 📍 GPS Pinned Coordinate Analytics & Barangay Matching
- **Pinpoint Geolocation** — Captures hardware GPS coordinates or interactive map pin placement for every report.
- **32-Barangay Centroid Distance Matching** — Automatically maps every pinned coordinate to the nearest of all **32 Kabankalan barangays** (*Bantayan, Barangay 1–9, Binicuil, Camansi, Camingawan, Camugao, Carol-an, Daan Banua, Hilamonan, Inapoy, Linao, Locotan, Magballo, Oringao, Orong, Pinaguinpinan, Salong, Tabugon, Tagoc, Tagukon, Talubangi, Tampalon, Tan-auan, Tapi*) so analytics reflect the **exact incident location**.

### 💬 Direct Citizen-Admin Conversation Thread & Live Comments
- **Real-Time Two-Way Thread** — Every concern includes a live conversation thread between the reporting citizen (`👤 Citizen`) and city administrators (`🛡️ Admin Reply`).
- **Instant Socket.io Synchronization** — Powered by `Socket.io` rooms (`admin` and user channels), status updates, new concerns, and chat messages appear immediately on both web and mobile without manual refreshing.

### 📈 Priority Escalation & Smart Duplicate Detection
- **Automated Elapsed-Time Escalation** — Runs hourly to ensure unaddressed reports are prioritized:
  - Open (`Pending` / `In Progress`) for **> 3 days**: Escalated from `Low` to `Medium`.
  - Open for **> 7 days**: Escalated from `Medium` to `High`.
- **Status-Aware Similarity Engine** — Links duplicate reports against active tickets (`Pending` / `In Progress`) and automatically syncs duplicate submissions to `In Progress` when field crews are already dispatched, while treating matches against previously `Resolved` issues as recurring incidents.

### 📄 Official Tabular Municipal Print Reports
- **Government-Ready Landscape Ledger** — Formatted via `@media print` with the official **City Government of Kabankalan** letterhead, summary and itemized tables, and a **3-Signatory Municipal Certification Block** (*System Administrator, Public Information & Concerns Office, Office of the City Mayor*).

### 🗺️ GIS Mapping & Spatial Visualization
- **Web Admin Leaflet GIS** — Full-screen interactive map with marker clustering (`react-leaflet-cluster`), heatmap intensity layers (`leaflet.heat`), and status/category/barangay filters.
- **Mobile Native Map** — Interactive `react-native-maps` integration for pinning hazard locations and reverse-geocoding street addresses.

### 💾 Automated Database Backups & OneDrive Cloud Sync
- **Scheduled Smart Dumps (`backupService.js`)** — Runs on startup and every 24 hours (`BACKUP_INTERVAL_MS`), creating a new `mysqldump` or portable JSON snapshot only when data has changed and rotating up to `BACKUP_MAX_FILES` (default 10).
- **Admin Backup Console & OneDrive Mirroring** — Admins can trigger, download, or restore backups from `/backup` on the web dashboard, or schedule automatic off-PC mirroring to OneDrive via `setup-backup-task.ps1` and `backup-to-onedrive.ps1`.

### 🎨 Adaptive Dark & Light Theme System (Web & Mobile)
- **Full Light & Dark Mode Parity** — Both the React 19 Admin Web Portal and the Expo Mobile App feature high-contrast Dark and Light themes with adaptive status bar styling (`StatusBar`), theme-aware cards, badges, and Recharts tooltips.

---

## 🛠️ Tech Stack

### Backend API (`backend/`)
| Package | Version | Purpose |
|---------|---------|---------|
| **Node.js** | 22.x | JavaScript runtime environment |
| **Express.js** | 4.19.2 | MVC REST API routing and middleware |
| **MySQL / mysql2** | 8.0 / 3.9.7 | Relational database & connection pool (Local or Aiven Cloud SSL) |
| **Socket.io** | 4.8.3 | Bi-directional real-time WebSocket rooms |
| **Groq SDK** | 1.3.0 | Llama 3.3 NLP & Vision AI classification and ID OCR |
| **TensorFlow.js / MobileNet** | 4.22.0 / 2.1.1 | On-server image feature extraction & visual verification |
| **Google Auth Library** | 11.3.0 | OAuth 2.0 ID token verification |
| **Nodemailer** | 8.0.5 | Email OTP, 2FA, and status notification dispatch |
| **Expo Server SDK** | 6.1.0 | Native mobile push notification delivery |
| **JWT & Bcrypt.js** | 9.0.2 / 2.4.3 | Stateless authentication and salted password hashing |
| **Helmet, HPP & Rate Limit** | 8.1.0 / 8.3.2 | Security headers, parameter pollution, and brute-force protection |

### Admin Web & Public Landing Page (`admin-web/`)
| Package | Version | Purpose |
|---------|---------|---------|
| **React** | 19.0.0 | Component-based UI framework |
| **React Router** | 6.23.1 | Client-side routing (`/`, `/login`, `/dashboard`, etc.) |
| **Recharts** | 2.12.7 | Interactive analytics charts and KPI visualizations |
| **Leaflet & React-Leaflet** | 1.9.4 / 5.0.0 | Interactive GIS mapping, clustering, routing, and heatmaps |
| **Socket.io-client** | 4.8.3 | Real-time WebSocket event synchronization |
| **React Icons** | 5.6.0 | Modern vector iconography |

### Citizen Mobile App (`mobile/`)
| Package | Version | Purpose |
|---------|---------|---------|
| **React Native** | 0.86.3 | Native cross-platform mobile framework |
| **Expo SDK** | ~57.0.31 | Mobile development toolkit & native APIs |
| **React Navigation** | 6.x | Native stack and bottom tab navigation |
| **React Native Maps** | 1.27.2 | Native GPS map view and pin placement |
| **Expo Image Picker & Manipulator** | ~57.0.20 | Live camera capture and image compression |
| **Expo Location** | ~57.0.22 | Hardware GPS coordinates and reverse geocoding |
| **Expo Auth Session & Web Browser** | ~57.0.16 | Google OAuth 2.0 authentication |
| **AsyncStorage & NetInfo** | 2.2.0 / 12.0.1 | Stale-While-Revalidate offline caching & network detection |
| **Socket.io-client** | 4.8.3 | Live status and comment updates |

---

## 🗄️ Database Schema & Performance Indexes

CitiVoice runs on **MySQL 8.0** (`InnoDB`, `utf8mb4_unicode_ci`) initialized via `backend/database/schema.sql`.

### Core Tables
- **`users`** — Citizen and admin accounts, contact info, barangay, verification status (`unverified`, `pending`, `verified`, `rejected`), ID type/number/image URL, and OCR metadata.
- **`admin_2fa_codes`** — Ephemeral 6-digit OTP records for Administrator 2FA sign-in.
- **`email_verifications`** — Pre-registration 6-digit Email OTP verification records.
- **`concerns`** — Submitted civic concerns with category, priority, status (`Pending`, `In Progress`, `Resolved`, `Rejected`), GPS coordinates, incident barangay, media URLs, and official `admin_note`.
- **`concern_comments`** — Two-way citizen and administrator conversation messages per concern.
- **`concern_links`** — AI-detected duplicate and related concern associations.
- **`audit_log`** — Immutable chronological trail of administrative actions and status transitions.
- **`barangays`** — All 32 Kabankalan City barangays and geographic reference coordinates.
- **`notifications`** — Citizen in-app notifications and push alert history.
- **`file_storage`** — Hybrid database binary storage ensuring uploaded images persist across ephemeral cloud container restarts.

---

## 📁 Project Directory Structure

```
citivoice/
├── backend/
│   ├── controllers/                # Route handlers (auth, backup, barangays, concerns, notifications, users)
│   ├── database/
│   │   └── schema.sql              # MySQL 8.0 schema & 17 performance indexes
│   ├── middleware/                 # JWT auth, role guards, caching, Multer upload, validation
│   ├── routes/                     # Express API route definitions
│   ├── services/                   # AI/Groq, ID OCR, similarity, priority escalation, notifications, backups
│   ├── utils/                      # Shared backend helpers
│   ├── db.js                       # MySQL connection pool & health checks
│   └── server.js                   # Express + Socket.io entry point
│
├── admin-web/
│   ├── public/                     # Static assets & branding
│   └── src/
│       ├── components/             # Sidebar, AnimatedCounter, Pagination, Skeleton, Toast
│       ├── context/                # AuthContext & ThemeContext
│       ├── hooks/                  # Custom hooks (useFitPagination, etc.)
│       ├── pages/
│       │   ├── Landing.jsx         # Public landing page, APK download & QR installation guide
│       │   ├── Login.jsx           # Administrator login with 2FA Email OTP
│       │   ├── Dashboard.jsx       # Real-time KPIs, charts, and barangay rankings
│       │   ├── Concerns.jsx        # Tabular concern management & side drawers
│       │   ├── ConcernDetail.jsx   # Detailed review, live chat & AI draft response
│       │   ├── MapView.jsx         # Full-screen Leaflet GIS map with heatmaps & clusters
│       │   ├── Reports.jsx         # Executive analytics & landscape print ledger
│       │   ├── Barangays.jsx       # Barangay management & spatial stats
│       │   ├── Users.jsx           # Citizen account management
│       │   ├── Verification.jsx    # Government ID verification queue & OCR comparison
│       │   └── Backup.jsx          # On-demand SQL/JSON backups & restore
│       ├── services/               # Axios/fetch API client & Socket.io client
│       └── styles/                 # CSS Modules with Dark/Light theme tokens
│
├── mobile/
│   ├── app.json                    # Expo SDK 57 config & Android/iOS permissions
│   ├── eas.json                    # EAS cloud build profiles (preview APK & production AAB)
│   └── src/
│       ├── components/             # UI kit, ConcernCard, NetworkBanner, CustomAlertModal, Skeleton
│       ├── context/                # AuthContext, ConcernContext, NotificationContext, ThemeContext, LanguageContext
│       ├── hooks/                  # useImagePicker, useLocation
│       ├── i18n/                   # English, Filipino, and Hiligaynon translations
│       ├── navigation/             # AppNavigator (AuthStack, UnverifiedStack, CitizenTabs)
│       ├── screens/
│       │   ├── auth/               # Login, Register, ForgotPassword, VerifyIdentity, TermsAndPolicy
│       │   └── citizen/            # SubmitConcern, MyConcerns, ConcernDetail, Notifications, Profile
│       ├── services/               # mobileApi, googleAuth, pushNotifications
│       └── utils/                  # Theme palettes, responsive scaling, constants
│
├── backups/                        # Automated SQL & JSON database snapshots
├── backup-db.bat                   # One-click manual MySQL dump (Windows)
├── backup-to-onedrive.ps1          # Mirrors backups to OneDrive
├── setup-backup-task.ps1           # Registers Windows Task Scheduler job for OneDrive sync
├── docker-compose.yml              # Multi-container production stack
└── package.json                    # Monorepo root scripts
```

---

## 🔌 Complete API Catalog

All endpoints are prefixed with `/api`.

### Authentication & Identity Verification
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/auth/send-registration-otp` | Public | Send a 6-digit verification OTP to a Gmail address |
| `POST` | `/api/auth/verify-registration-otp` | Public | Verify registration OTP and issue `verificationToken` |
| `POST` | `/api/auth/verify-id-name` | Public | Pre-check government ID photo against citizen name |
| `POST` | `/api/auth/register` | Public | Register a new citizen account |
| `POST` | `/api/auth/login` | Public | Authenticate user (issues JWT or triggers Admin 2FA OTP) |
| `POST` | `/api/auth/verify-admin-2fa` | Public (MFA Token) | Verify 6-digit Email OTP to complete Admin login |
| `POST` | `/api/auth/resend-admin-2fa` | Public (MFA Token) | Resend Admin 2FA OTP (45s cooldown) |
| `POST` | `/api/auth/google` | Public | Google OAuth sign-in & email pre-verification |
| `POST` | `/api/auth/forgot-password` | Public | Dispatch password reset OTP code |
| `POST` | `/api/auth/reset-password` | Public | Reset password using OTP code |
| `GET`  | `/api/auth/me` | Authenticated | Retrieve current user profile from JWT |

### Civic Concerns & Live Comments
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET`  | `/api/concerns` | Authenticated | List concerns with filters, search, and pagination |
| `GET`  | `/api/concerns/stats` · `/map` | Authenticated | Aggregate KPI stats and GIS map coordinates |
| `POST` | `/api/concerns` | Citizen | Submit a new concern with live camera photo & GPS pin |
| `POST` | `/api/concerns/analyze` · `/verify-image` | Authenticated | AI draft categorization and image-to-text alignment check |
| `GET`  | `/api/concerns/:id` | Authenticated | Get full concern details, media, and metadata |
| `PUT`  | `/api/concerns/:id` | Admin | Update status, priority, category, or resolution photo/note |
| `DELETE`| `/api/concerns/:id` | Owner / Admin | Delete a concern |
| `POST` | `/api/concerns/:id/ai-response` | Admin | Generate an AI-drafted official municipal response |
| `GET`  | `/api/concerns/:id/similar` · `POST /:id/link` | Admin | Detect and link duplicate or recurring concerns |
| `GET`  | `/api/concerns/:id/comments` | Authenticated | List chronological citizen-admin comments |
| `POST` | `/api/concerns/:id/comments` | Authenticated | Post a comment or official admin reply |
| `GET`  | `/api/concerns/:id/audit` | Admin | Fetch chronological audit log |

### Users, Barangays & Backups
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET`  | `/api/users` | Admin | List citizen accounts and verification statuses |
| `PUT`  | `/api/users/:id` | Self | Update own profile (`phone`, `barangay`, `address`) or submit ID |
| `POST` | `/api/users/:id/avatar` | Self | Upload citizen profile picture |
| `PATCH`| `/api/users/:id/verify` · `/reject` · `/revoke` | Admin | Approve, reject, or revoke citizen ID verification |
| `GET`  | `/api/barangays` | Public | List all 32 Kabankalan barangays (`POST`/`PUT`/`DELETE` for Admin) |
| `GET`  | `/api/notifications` | Authenticated | List citizen notifications (`PATCH /:id/read`, `DELETE /:id`) |
| `GET`  | `/api/backup` · `/status` | Admin | List backups and check pending data changes |
| `POST` | `/api/backup/db` · `/export` · `/import` | Admin | Trigger SQL dump, portable JSON export, or restore |
| `GET`  | `/api/health` | Public | API and database health check |

---

## 📦 Installation & Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v20 or v22 LTS
- [MySQL 8.0](https://dev.mysql.com/downloads/) or [Docker & Docker Compose](https://www.docker.com/)
- [Expo Go](https://expo.dev/expo-go) or an Android device/emulator
- [EAS CLI](https://docs.expo.dev/build/setup/) (`npm install -g eas-cli`) for standalone APK/AAB builds

### 1. Clone the Repository
```bash
git clone https://github.com/palingubaerwin029-ai/citivoice.git
cd citivoice
```

### 2. Install All Dependencies
```bash
npm run install:all
```

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=citivoice
DB_SSL=false                      # Set to true for Aiven Cloud MySQL
BASE_URL=http://localhost:5000
JWT_SECRET=your_super_secret_jwt_key_here

# CORS Allowed Origins
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Email Dispatch (Gmail SMTP / Brevo)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password

# Groq Llama 3.3 & Vision AI
GROQ_API_KEY=your_groq_api_key_here

# Google OAuth Client IDs (comma-separated Web/Android/iOS client IDs)
GOOGLE_CLIENT_IDS=your_google_client_ids

# Automated Backups
BACKUP_ENABLED=true
BACKUP_INTERVAL_MS=86400000
BACKUP_MAX_FILES=10
BACKUP_DIR=C:/CitiVoice_Backups
```

### Admin Web (`admin-web/.env`)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_APK_URL=https://expo.dev/accounts/erwin1229/projects/citivoice/builds/8245dfa8-1d7b-47b9-88c0-3700acd0d7e6
```

### Mobile (`mobile/.env`)
```env
EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:5000/api
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_android_client_id.apps.googleusercontent.com
```

---

## 🐳 Docker & Container Orchestration

Launch the entire production stack (MySQL 8.0, Express Backend, Nginx Admin Web, and automated DB Backup container) with Docker Compose:

```bash
# Build and start all services in the background
docker compose up --build -d

# Check container status
docker compose ps
```

| Service | Container Name | Port Mapping | Description |
|---------|----------------|--------------|-------------|
| `database` | `citivoice-mysql` | `3307:3306` | MySQL 8.0 with persistent volume `mysql_data` |
| `backend` | `citivoice-backend` | `5000:5000` | Node.js Express REST API & Socket.io server |
| `admin-web` | `citivoice-admin` | `8080:80` | Nginx Alpine serving the React Landing Page & Admin Portal |
| `db-backup` | `citivoice-db-backup` | N/A | Automated daily 02:00 database dump into `./backups` |

---

## 📱 Mobile App Development & EAS Cloud Builds

### Local Development
```bash
cd mobile
npx expo start
# Or use Expo Tunnel for testing across different networks:
npx expo start --tunnel
```

### Building Standalone Android Binaries (APK / AAB)
```bash
cd mobile

# 1. Build standalone installable APK (for direct download & QR installation)
npm run build:apk

# 2. Build production Android App Bundle (for Google Play Store)
npm run build:aab
```

---

## 🔒 Security & Compliance

- **Live Camera Evidence Integrity** — Disables gallery selection for IDs and concern reports to ensure real-time capture.
- **Administrator 2FA** — Mandatory 6-digit Email OTP verification on admin sign-in.
- **Stateless JWT & RBAC** — Role-based route guards separating `citizen` and `admin` privileges.
- **Bcrypt Password Hashing** — Salted password hashing (10 rounds) and hashed OTP tokens.
- **SQL Injection & XSS Protection** — Parameterized `mysql2` prepared statements, `express-validator` schemas, `helmet`, and `hpp`.
- **Rate Limiting** — `express-rate-limit` and `express-slow-down` protecting authentication, OTP, and upload endpoints.

---

## 📜 Available Monorepo Scripts

From the repository root (`package.json`):

| Script | Command | Description |
|--------|---------|-------------|
| `install:all` | `npm run install:all` | Install dependencies across root, `backend`, `admin-web`, and `mobile` |
| `dev` | `npm run dev` | Start backend, admin-web, and mobile development servers concurrently |
| `backend` | `npm run backend` | Start backend server with Nodemon hot-reloading |
| `web` | `npm run web` | Start React web portal & admin dashboard on port 3000 |
| `mobile` | `npm run mobile` | Start Expo Metro bundler for mobile development |
| `db:up` | `npm run db:up` | Launch Docker containers in the background |
| `db:down` | `npm run db:down` | Stop and remove Docker containers |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

© 2026 **CitiVoice Team** · Dedicated to building smarter, more responsive local communities in Kabankalan City.
