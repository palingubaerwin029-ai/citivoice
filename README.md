# 📢 CitiVoice

<p align="center">
  <img src="admin-web/public/logo.png" alt="CitiVoice Logo" width="180" />
</p>

<p align="center">
  <strong>Your Voice. Your Community.</strong><br />
  A modern, full-stack civic reporting and municipal community management platform connecting citizens with local government administrators.
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
  - [Artificial Intelligence (Groq & Llama 3.3)](#-artificial-intelligence-groq--llama-33)
  - [Administrator Two-Factor Authentication (2FA) via Email OTP](#-administrator-two-factor-authentication-2fa-via-email-otp)
  - [GPS Pinned Coordinate Analytics](#-gps-pinned-coordinate-analytics)
  - [Priority Escalation Engine](#-priority-escalation-engine)
  - [Official Tabular Municipal Print Reports](#-official-tabular-municipal-print-reports)
  - [Email OTP Verification Workflow](#-email-otp-verification-workflow)
  - [Precise Field Error Isolation & Seamless Auth Flow](#-precise-field-error-isolation--seamless-auth-flow)
  - [Editable Citizen Profile](#-editable-citizen-profile)
  - [Direct Citizen-Admin Conversation Thread & Live Comments](#-direct-citizen-admin-conversation-thread--live-comments)
  - [Adaptive Viewport Layout & Contained Side Drawers](#-adaptive-viewport-layout--contained-side-drawers)
  - [Real-Time WebSocket Sync & Silent Auto-Refresh](#-real-time-websocket-sync--silent-auto-refresh)
  - [Smart Status-Aware Duplicate Detection & Resolution Sync](#-smart-status-aware-duplicate-detection--resolution-sync)
  - [Citizen Incident Submission & Official Municipal Docket Receipt](#-citizen-incident-submission--official-municipal-docket-receipt)
  - [GIS Mapping & Spatial Visualization](#-gis-mapping--spatial-visualization)
  - [Automated Database Backups & Cloud Sync](#-automated-database-backups--cloud-sync)
  - [Off-PC Backups to OneDrive](#-off-pc-backups-to-onedrive)
  - [Adaptive Dark & Light Theme System](#-adaptive-dark--light-theme-system)
  - [Mobile Android App & EAS Cloud Builds](#-mobile-android-app--eas-cloud-builds)
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
   Allows residents to report public safety issues, infrastructure hazards, and municipal concerns using photos, GPS pin placement, and dynamic templates, converse with administrators in real time, and track resolution progress.
2. **Executive Web Admin Dashboard** (React 19):
   Empowers city administrators and municipal officers to manage incoming concerns directly, chat with citizens, track spatial hotspot clusters on interactive GIS maps, verify identities, and generate official 2-page print analytics.
3. **High-Performance REST & WebSocket Backend** (Express.js, Socket.io, MySQL 8.0 / Aiven Cloud):
   Provides secure identity verification, AI-driven report categorization (Groq Llama 3.3), age-based priority escalation, real-time bi-directional notifications, and scheduled database backups with custom directory and off-PC OneDrive synchronization.

---

## 🏗️ System Architecture

```
citivoice/
├── backend/          # Express.js REST API + WebSocket Server (Node 22, MySQL 8.0 / Cloud)
├── admin-web/        # React 19 Executive Admin Dashboard & GIS Mapping
├── mobile/           # React Native Citizen Application (Expo SDK 57)
├── backups/          # Automated database dumps & scheduled archives
├── docker-compose.yml # Multi-container production orchestration
└── package.json      # Monorepo workspace orchestration
```

```
┌─────────────────────────────────┐        ┌──────────────────────────────────┐
│   Citizen Mobile App (Expo 57)  │        │   Admin Web Dashboard (React 19) │
│  • Pinned GPS Incident Reports  │        │  • GIS Map & Direct Resolution   │
│  • Email OTP Verification       │        │  • Direct Citizen Comments & AI  │
│  • Direct Citizen-Admin Chat    │        │  • 2-Page Executive Reports      │
│  • My Concerns & Profile        │        │  • Barangay & Citizen Management │
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
                     │    MySQL 8.0 / Aiven Cloud   │
                     │  • 17 Performance Indexes    │
                     │  • Daily Automated Dumps     │
                     └──────────────────────────────┘
```

---

## 🚀 Key Features

### 🤖 Artificial Intelligence (Groq & Llama 3.3)
- **Instant Category Classification** — Processes citizen incident descriptions and categorizes them automatically (e.g., *Road Obstruction, Flooding, Sanitation, Electrical Hazard, Water Service, Public Safety*).
- **Severity & Urgency Scoring** — Automatically evaluates urgency and detects public hazards to assign initial priority flags.
- **Dialect & Localization Awareness** — Understands local dialects and colloquial terms (Hiligaynon, Cebuano, Filipino, and English), accurately processing place names and dialect expressions such as *"baha"*, *"lubak"*, or *"kuryente"*.

### 🔐 Administrator Two-Factor Authentication (2FA) via Email OTP
- **Enhanced Console Protection** — Administrator portal sign-ins enforce a mandatory second factor to guard against unauthorized access and credential compromise.
- **Dynamic 6-Digit Email Code** — Upon validating email and password, the system generates a secure, cryptographically random 6-digit OTP delivered directly to the administrator's official registered mailbox.
- **Branded Notification Template** — Outgoing emails use an official Kabankalan City government HTML format with clear expiration warnings (10-minute validity).
- **Transient MFA Token** — Uses short-lived signed tokens (`mfaToken`) to authenticate the OTP verification request, preventing full JWT emission until the code is verified.
- **Rate-Limited Resend Protection** — Features a 45-second cooldown timer on the admin login UI to prevent email flooding or spamming.

### 📍 GPS Pinned Coordinate Analytics
- **Pinpoint Geolocation** — Citizen reports capture precise coordinates via device GPS or interactive map pin placement.
- **Kabankalan Centroid Distance Matching** — Automatically matches every concern to the nearest of all **32 Kabankalan barangays** (e.g., *Oringao, Bantayan, Barangay 1, Camingawan, Dancalan*) using exact Euclidean centroid distance calculation. This guarantees reports reflect the **actual incident location**, regardless of where the reporting citizen resides.
- **"Most Concerned Barangay" Ranking** — Dynamic dashboard intelligence aggregates concerns by pinned barangay, highlighting top incident locations, percentage share of city concerns, and primary issue categories.

### 📈 Priority Escalation Engine
- **Elapsed-Time Escalation** — Ensures citizen reports are not neglected (runs hourly):
  - Open (`Pending` / `In Progress`) for **> 3 days**: Escalated from `Low` to `Medium`.
  - Open for **> 7 days**: Escalated from `Medium` to `High`.
- **Safety Safeguards** — Priority is strictly upgraded and never downgraded by automated jobs; flagged non-typical concerns are safely excluded.
- **Direct & Focused Citizen Workflow** — Community feeds and upvote metrics have been completely removed across the system to maintain focus on direct citizen-to-government reporting, verified status tracking, and administrative accountability.

### 📄 Official Tabular Municipal Print Reports
- **Official Print Layout Guarantee** — Uses CSS `@media print` rules (`@page { size: landscape; margin: 8mm 10mm; }`) to format municipal records into an authoritative, print-ready document:
  - **Official Government Letterhead** — Displays the Republic of the Philippines, Province of Negros Occidental, City Government of Kabankalan seal, system header, and document metadata (format, timestamp, and record count).
  - **Summary Table Format** — Standard executive ledger columns (`Date / Month | Pending | In Progress | Resolved | Reject | Total`) with interactive row expansion on screen.
  - **Detailed Records Format** — Full itemized incident ledger with Concern Title, Category badge, Pinned Barangay, Priority, Status, and Reporting Citizen.
  - **3-Signatory Municipal Certification Block** — Formal legal verification footer ensuring administrative chain-of-custody (*Prepared by: System Administrator, Verified by: Public Information & Concerns Office, Noted by: Office of the City Mayor*).
- **Zero Screen Bleed** — Interactive toolbars, filters, search bars, and navigation buttons use `.noPrint` (`display: none !important;`) so that only pristine, high-contrast municipal ledgers render during print preview (`window.print()`).

### ✉️ Email OTP Verification Workflow
- **Pre-Registration Verification** — Prevents bot accounts and invalid registrations by requiring citizens to verify their email address via a 6-digit OTP code before an account can be created.
- **Secure Hash Validation** — OTPs are hashed and verified with expiration timestamps and anti-tampering guards.
- **Account Recovery** — Secure email dispatch via Nodemailer for password resets.

### 🎯 Precise Field Error Isolation & Seamless Auth Flow
- **Granular Error Attribution** — Specific backend error codes (`auth/user-not-found` vs `auth/wrong-password`) map strictly to their respective input fields, ensuring only the single incorrect field is highlighted with an error state.
- **Zero False-Positive Errors** — Removed stale error states and eliminated confusing `"This field is required"` messages on prefilled or autofilled inputs.
- **Seamless Registration Transition** — Streamlined the mobile registration flow by eliminating intrusive post-registration modal banners and automatic login button triggers, enabling immediate, smooth transition into the sign-in screen.

### 👤 Editable Citizen Profile
- **Edit from the Mobile App** — Citizens tap **Edit** on *Account Information* to update their **phone number**, **barangay** (searchable list of all Kabankalan barangays), and **street / purok address**.
- **Locked Identity** — The full name is shown read-only (*ID Locked*) so it always matches the government ID used for verification.
- **Validated Updates** — Phone numbers must match `09XXXXXXXXX` or `+639XXXXXXXXX`; the backend re-validates through `PUT /api/users/:id` (users can only edit their own profile).
- **Polished Feedback** — Success, error, and sign-out confirmations use a custom `CustomAlertModal` (gradient icon badge, dark card) instead of the plain system alert.
- **Multilingual** — Edit labels and messages are translated for English, Filipino, and Hiligaynon.

### 💬 Direct Citizen-Admin Conversation Thread & Live Comments
- **Unified Two-Way Discussion** — Every concern features a dedicated, direct conversation thread between the citizen (`👤 Citizen`) and city administrators (`🛡️ Admin Reply`).
- **Real-Time Live Chat Sync** — Powered by `Socket.io` event listeners (`new_comment`, `concern_comment_added`), replies appear instantaneously without page refreshing on both the citizen mobile app and admin web portal.
- **Streamlined Civic Resolution** — Bureaucratic validation gates, inter-office routing delays, and internal notes have been replaced with direct, transparent communication between citizens and administrators.
- **AI-Assisted Administrator Responses** — Administrators can generate empathetic, official draft responses with **✨ AI Draft**, accelerating resolution times while maintaining an authoritative and helpful municipal tone.

### 🖥️ Adaptive Viewport Layout & Contained Side Drawers
- **Zero Whole-Page Scrolling** — The Admin Web Portal's **Citizens** (`/users`) and **Identity Verification** (`/verification`) pages are dynamically calibrated to fit cleanly inside the screen viewport.
- **Dynamic Viewport Pagination** — `useFitPagination` intelligently adapts row counts based on screen height and Windows display scaling (125%/150%), with a responsive minimum of 5 items per page to prevent pagination controls from slipping off screen.
- **Self-Contained Sticky Side Drawers** — Opening a user profile or ID verification docket activates a sleek, sticky side drawer (`.sidePanelCard`) with internal smooth scrolling and pinned action footers, preventing the browser window from stretching or jumping.

### ⚡ Real-Time WebSocket Sync & Silent Auto-Refresh
- **Instant Bi-Directional Event Dispatch** — Powered by `Socket.io` rooms (`'admin'` and user-specific channels). The backend broadcasts instant updates (`new_concern`, `update_concern`, `status_updated`, `new_comment`) whenever reports are submitted, comments are posted, or progress states change.
- **Zero-Manual Reload Dashboards** — The **Web Admin Dashboard** dynamically updates concern tables, metric counters, and GIS maps in real time as citizen reports arrive.
- **Silent Background Fallback Polling** — Built-in 30-second silent background polling guarantees data consistency even across intermittent mobile network reconnections.

### 🧠 Smart Status-Aware Duplicate Detection & Resolution Sync
- **Status-Aware Categorization** — Rather than blindly rejecting recurring community reports, the similarity engine differentiates active vs. closed tickets:
  - Reports matching an active concern (`Pending` or `In Progress`) are flagged as `duplicate` and linked.
  - Reports matching a previously completed issue (`Resolved` or `Rejected`) are classified as `related` / recurring, ensuring new flare-ups or unaddressed hazards are never discarded.
- **Automatic Lifecycle Synchronization** — When a duplicate report is submitted against a concern that is already `In Progress`, the duplicate is immediately advanced to `In Progress` and the reporting citizen is automatically notified that field crews are actively on-site.

### 📱 Citizen Incident Submission & Official Municipal Docket Receipt
- **Celebration & Intake Verification** — Dynamic confirmation view featuring glowing emerald celebration halos, high-contrast checkmark shield, and micro-confetti badges.
- **Official Municipal Docket Receipt Card** — Provides citizens with an authoritative civic confirmation:
  - Live header badge distinguishing `OFFICIAL MUNICIPAL DOCKET` (online) from `OFFLINE CIVIC QUEUE` (local sync).
  - Pulsing amber `Pending Review` status dot.
  - Photo evidence thumbnail preview, concern title, and color-coded category tag with civic icon.
  - Pinned geolocation coordinates/address and risk priority chip (`Low`, `Medium`, or `High Risk`).
- **3-Step Transparent Municipal Pipeline Tracker** — Visual stepper keeping citizens informed of the resolution lifecycle:
  1. **Incident Report Registered** (Completed ✓) — Logged securely into the municipal intake queue.
  2. **Administrative Review & Field Action** (Active ⏳) — Assessed and investigated by city administrators.
  3. **Field Remediation & Resolution** (Upcoming 🛠️) — On-site fix with verified photo proof and admin resolution note.
- **Real-Time Notification Reassurance** — Informs citizens that live push updates and comments will track every milestone of their ticket until final resolution.

### 🗺️ GIS Mapping & Spatial Visualization
- **Web Admin Leaflet Map** — Full-screen interactive map featuring marker clustering (`react-leaflet-cluster`), heatmap intensity overlays (`leaflet.heat`), and filtering by status, category, and barangay.
- **Mobile Citizen Map** — Native React Native Maps integration displaying color-coded status pins, live user location, and cluster aggregation.

### 💾 Automated Database Backups & Cloud Sync
Three layers protect the civic data with zero maintenance:
- **Backend Scheduler (`backupService.js`)** — On startup and every `BACKUP_INTERVAL_MS` (default 24 h) it automatically runs `mysqldump` **only if new data exists**, falls back to a portable JSON export if `mysqldump` is unavailable, and rotates old files keeping the newest `BACKUP_MAX_FILES` (default 10) snapshots.
- **Custom Destination & Automatic Cloud Syncing** — By setting `BACKUP_DIR` in `.env` (e.g. `C:/Users/<User>/OneDrive/CitiVoice_Backups` or an external drive), all automated snapshots are saved directly to your chosen directory and instantly synced off-site.
- **Database Engine Support** — Fully compatible with both local containerized MySQL 8.0 and Cloud MySQL databases (e.g. **Aiven for MySQL** with SSL encryption enabled).
- **Admin On-Demand Backups** — Administrators can trigger instant MySQL dumps, export portable JSON snapshots, import/restore, or download backups directly from the **Backup** page of the Web Admin dashboard. Windows users can also double-click `backup-db.bat`.

### ☁️ Off-PC Backups to OneDrive
Backups stored only on the host PC are lost if the disk fails, so a Windows scheduled task mirrors them to OneDrive:
- **`backup-to-onedrive.ps1`** — Copies new/changed files from `backups/db` to `%OneDrive%\CitiVoice-Backups`, prunes OneDrive copies older than 30 days, and logs to `backups/onedrive-sync.log`.
- **`setup-backup-task.ps1`** — Registers the Task Scheduler job **CitiVoice OneDrive Backup** (daily at the chosen time and 5 minutes after logon; runs late if the PC was off).

```powershell
# One-time setup (default 23:00) — pass -Time to change it
powershell -ExecutionPolicy Bypass -File .\setup-backup-task.ps1 -Time "22:00"

# Run a sync right now
powershell -ExecutionPolicy Bypass -File .\backup-to-onedrive.ps1

# Remove the schedule
Unregister-ScheduledTask -TaskName "CitiVoice OneDrive Backup" -Confirm:$false
```

**Restore a `.sql` backup:**
```bash
docker exec -i citivoice-mysql mysql -uroot -proot citivoice < backups/db/backup_YYYYMMDD_HHMMSS_full.sql
```

### 🎨 Adaptive Dark & Light Theme System
- **Curated High-Contrast Design System** — Tailored CSS variables (`--bg`, `--surface`, `--text-1`, `--border-md`).
- **High-Visibility Tooltips** — Recharts tooltips adaptively render crisp, high-visibility white text in dark mode (`#F1F5F9`) and dark slate in light mode (`#0F172A`) across both Dashboard and Reports.

### 📲 Mobile Android App & EAS Cloud Builds
- **Expo SDK 57 & React Native 0.86** — Modern native citizen mobile application optimized with fluid animations and responsive layouts.
- **Universal Android Compatibility** — Compatible with **Android 7.0 (Nougat, API 24) through Android 15 & 16 (API 35/36)**, covering ~98.5% of all active Android devices globally.
- **Multi-Architecture Support** — Packages native shared libraries for `arm64-v8a` (modern 64-bit phones), `armeabi-v7a` (32-bit devices), and `x86_64` (emulators and Chromebooks).
- **Direct Standalone APK Builds** — Configured with Expo Application Services (EAS) for one-command standalone APK generation:
  ```bash
  cd mobile
  npm run build:apk   # Generates standalone installable Android .apk
  npm run build:aab   # Generates production Google Play app bundle
  ```

---

## 🛠️ Tech Stack

### Backend API
| Package | Version | Purpose |
|---------|---------|---------|
| **Node.js** | 22.x | JavaScript runtime environment |
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
- **`users`** — Citizen and administrator accounts (`phone`, `barangay`, street `address`, `reset_otp`, `reset_otp_expires`), hashed passwords, verification statuses, avatars, and uploaded ID card references.
- **`admin_2fa_codes`** — Ephemeral 6-digit OTP verification records for Administrator Two-Factor Authentication (2FA) with expiration timestamps.
- **`email_verifications`** — Ephemeral 6-digit OTP pre-registration verification records with expiration timestamps and verification flags.
- **`concerns`** — Incident reports containing title, description, category, priority, status, latitude, longitude, pinned address, official `admin_note`, and media URLs.
- **`concern_links`** — Status-aware AI duplicate and related incident links.
- **`concern_comments`** — Direct two-way conversation thread between citizens and administrators per concern.
- **`audit_log`** — Chronological audit trail of status updates and administrative actions.
- **`barangays`** — 32 Kabankalan barangay records and reference geographic centroids.
- **`notifications`** — In-app citizen alerts, status change notices, and broadcast logs.
- **`file_storage`** — Database-backed persistent binary storage ensuring uploaded images survive ephemeral cloud container restarts.

> **Fresh or Existing Database?** Run the schema initializer or migration script:
> ```bash
> node backend/database/schema.sql
> ```
> Fresh installs get the clean schema automatically via `backend/database/schema.sql`.

### ⚡ Performance Indexes
To guarantee sub-10ms query execution times under municipal load, the database schema implements inline performance indexes:
1. `idx_users_role` on `users(role)`
2. `idx_users_verification` on `users(verification_status)`
3. `idx_users_phone` on `users(phone)`
4. `idx_users_id_number` on `users(id_number)`
5. `idx_concerns_user_created` on `concerns(user_id, created_at)`
6. `idx_concerns_status` on `concerns(status)`
7. `idx_concerns_category` on `concerns(category)`
8. `idx_concerns_priority` on `concerns(priority)`
9. `idx_concerns_created_at` on `concerns(created_at)`
10. `idx_concerns_barangay` on `concerns(user_barangay)`
11. `idx_concerns_incident_barangay` on `concerns(incident_barangay)`
12. `idx_comments_concern_created` on `concern_comments(concern_id, created_at)`
13. `idx_notifications_user_read` on `notifications(user_id, is_read)`
14. `idx_notifications_user_created` on `notifications(user_id, created_at)`
15. `idx_audit_entity` on `audit_log(entity_type, entity_id, created_at)`
16. `idx_admin_2fa_user` on `admin_2fa_codes(user_id, expires_at)`
17. `idx_file_storage_filename` on `file_storage(filename)`

---

## 📁 Project Directory Structure

```
citivoice/
├── backend/
│   ├── database/
│   │   └── schema.sql              # Clean MySQL schema & performance indexes
│   ├── middleware/
│   │   ├── auth.js                 # JWT verification & role-based guards
│   │   ├── cache.js                # In-memory route caching & selective invalidation
│   │   ├── requireRole.js          # Role-based authorization guard ('admin')
│   │   ├── upload.js               # Multer image storage and validation
│   │   └── validate.js             # Express-validator input schemas
│   ├── routes/
│   │   ├── auth.js                 # Login, 2FA verify/resend, Google, Register, OTP, Password reset
│   │   ├── backup.js               # Database dumps, JSON export/import, and restore
│   │   ├── barangays.js            # Barangay geographic records CRUD
│   │   ├── concerns.js             # Incident reporting, status, workflow, AI response
│   │   ├── notifications.js        # Citizen notifications and push triggers
│   │   └── users.js                # Profile updates, ID verification queue, citizen deletion
│   ├── services/
│   │   ├── aiService.js            # Groq Llama 3.3 NLP pipeline & categorization
│   │   ├── backupService.js        # Automated MySQL backup scheduler & rotation
│   │   ├── fileStorageService.js   # Hybrid disk/DB binary storage for Render dyno persistence
│   │   ├── groqService.js          # Groq API client with vision & structured output
│   │   ├── idVerificationService.js # Government ID OCR & automated verification
│   │   ├── imageAnalyzer.js        # Visual photo verification & hazard detection
│   │   ├── notificationService.js  # Dual-provider email (Brevo/Gmail) & Expo push alerts
│   │   ├── priorityService.js      # Age-based priority escalation engine
│   │   └── similarityService.js    # Status-aware duplicate detection & resolution sync
│   ├── db.js                       # Connection pool with health monitoring
│   └── server.js                   # Main application entry point with WebSockets
│
├── admin-web/
│   ├── public/                     # Static assets, branding, and HTML shell
│   └── src/
│       ├── components/             # Sidebar, AnimatedCounter, Pagination, Skeleton, Toast
│       ├── pages/
│       │   ├── Dashboard.jsx       # Real-time analytics, status ratios, and KPI metrics
│       │   ├── Concerns.jsx        # Tabular concern management, drawer inspection, filters
│       │   ├── ConcernDetail.jsx   # Concern review, status updates, AI draft response
│       │   ├── MapView.jsx         # Full-screen Leaflet GIS map with heatmaps & clustering
│       │   ├── Reports.jsx         # Executive analytics & 2-page print reporting
│       │   ├── Barangays.jsx       # Barangay CRUD and spatial statistics
│       │   ├── Users.jsx           # Citizen user management and deletion
│       │   ├── Verification.jsx    # ID verification queue with OCR data comparison
│       │   ├── Backup.jsx          # On-demand backups, export/import, downloads
│       │   └── Login.jsx           # Administrator sign-in with 2FA Email OTP challenge
│       ├── services/
│       │   ├── api.js              # Centralized API client & Kabankalan coordinate matching
│       │   └── socket.js           # Real-time Socket.io bi-directional client
│       ├── styles/                 # Modular CSS stylesheets with dark/light theming
│       └── index.css               # Global theme variables & Recharts tooltip styling
│
├── mobile/
│   ├── app.json                    # Expo configuration & native permissions
│   ├── eas.json                    # EAS Build configuration (preview APK & production AAB)
│   └── src/
│       ├── screens/
│       │   ├── auth/               # Login, Register, Email OTP, and ID Upload
│       │   └── citizen/            # Feed, Incident Submit, Detail, My Concerns, Editable Profile
│       ├── components/             # ConcernCard, NetworkBanner, UI kit, Skeleton
│       ├── navigation/             # AppNavigator and bottom tab configurations
│       ├── services/               # API clients, auth helpers, socket connection
│       ├── context/                # AuthContext, ThemeContext, LanguageContext
│       └── i18n/                   # English, Filipino, and Hiligaynon translations
│
├── backups/                        # Database archives (git-ignored)
├── backup-db.bat                   # One-click manual MySQL dump (Windows)
├── backup-to-onedrive.ps1          # Copies backups to a OneDrive folder
├── setup-backup-task.ps1           # Registers the daily OneDrive sync task
├── docker-compose.yml              # Multi-container orchestration specification
└── package.json                    # Monorepo root scripts
```

---

## 🔌 Complete API Catalog

All endpoints are hosted under `/api`.

### Authentication & Account Verification
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/auth/send-registration-otp` | Public | Generate and email a 6-digit verification OTP |
| `POST` | `/api/auth/verify-registration-otp` | Public | Validate email OTP code before registration |
| `POST` | `/api/auth/verify-id-name` | Public | AI pre-registration check of the name on a government ID |
| `POST` | `/api/auth/register` | Public | Register a new citizen account |
| `POST` | `/api/auth/login` | Public | Authenticate user (issues JWT or triggers Admin 2FA challenge) |
| `POST` | `/api/auth/verify-admin-2fa` | Public (MFA Token) | Verify 6-digit Email OTP and complete Administrator sign-in |
| `POST` | `/api/auth/resend-admin-2fa` | Public (MFA Token) | Request a replacement 6-digit OTP code (45s rate limit) |
| `POST` | `/api/auth/google` | Public | Google sign-in (already-registered emails only) |
| `POST` | `/api/auth/forgot-password` | Public | Email a password-reset code |
| `POST` | `/api/auth/reset-password` | Public | Reset password with the emailed code |
| `GET`  | `/api/auth/me` | Authenticated | Current user from token |

### Civic Concerns Management
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET`  | `/api/concerns` | Authenticated | List concerns with filtering, sorting, and pagination |
| `GET`  | `/api/concerns/stats` · `/map` | Authenticated | Aggregate stats and map-optimised concern list |
| `POST` | `/api/concerns` | Citizen | Submit a new concern with photo attachments & GPS coords |
| `POST` | `/api/concerns/analyze` · `/verify-image` | Authenticated | AI draft analysis and photo/description match check |
| `GET`  | `/api/concerns/:id` | Authenticated | Retrieve complete concern details and location |
| `PUT`  | `/api/concerns/:id` | Admin | Update status, category, priority, official response note |
| `DELETE`| `/api/concerns/:id` | Owner / Admin | Delete a concern |
| `POST` | `/api/concerns/:id/ai-response` | Admin | Generate an AI draft of the official administrator response |
| `GET`  | `/api/concerns/:id/similar` · `POST /:id/link` | Admin | Find and link duplicate concerns |
| `GET`  | `/api/concerns/:id/comments` | Authenticated | List chronological two-way citizen and admin comments |
| `POST` | `/api/concerns/:id/comments` | Authenticated | Post a comment or administrator reply to the concern thread |
| `GET`  | `/api/concerns/:id/audit` | Admin | Chronological immutable audit trail |

### Barangays & Municipal Records
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET`  | `/api/barangays` | Public | List all Kabankalan barangays |
| `POST` | `/api/barangays` | Admin | Create a new barangay entry |
| `PUT`  | `/api/barangays/:id` | Admin | Update barangay name or boundary information |
| `DELETE`| `/api/barangays/:id` | Admin | Delete a barangay record |

### User Management, Profile & ID Verification
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET`  | `/api/users` | Admin | List registered citizen accounts |
| `GET`  | `/api/users/:id` | Self / Admin | Fetch a user profile |
| `PUT`  | `/api/users/:id` | **Self only** | Update own `phone`, `barangay`, and street `address` (also used for ID submission) |
| `POST` | `/api/users/:id/avatar` | Self | Upload profile picture |
| `PATCH`| `/api/users/:id/verify` · `/reject` · `/revoke` | Admin | ID verification decisions |
| `DELETE`| `/api/users/:id` | Admin | Delete a citizen account |

### Database Backup & Maintenance
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET`  | `/api/backup` | Admin | List available backups and status |
| `GET`  | `/api/backup/status` | Admin | Check whether new data exists since the last backup |
| `POST` | `/api/backup/db` | Admin | Trigger an immediate mysqldump snapshot |
| `POST` | `/api/backup/export` | Admin | Trigger a portable JSON data export |
| `POST` | `/api/backup/import` | Admin | Import and restore a JSON data backup |
| `GET`  | `/api/backup/download/:filename` | Admin | Download a backup file |
| `DELETE`| `/api/backup/:filename` | Admin | Delete a backup file |
| `GET`  | `/api/health` | Public | System and database uptime check |

---

## 📦 Installation & Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18, v20, or v22 LTS
- [Docker & Docker Compose](https://www.docker.com/) (Recommended for full-stack orchestration)
- [Expo Go](https://expo.dev/expo-go) app installed on your physical mobile device (or Android/iOS Simulator)
- [EAS CLI](https://docs.expo.dev/build/setup/) (`npm install -g eas-cli`) for standalone cloud mobile builds

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
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=citivoice
DB_SSL=false                      # Set to true for Aiven Cloud MySQL with SSL
BASE_URL=http://localhost:5000
JWT_SECRET=your_super_secret_jwt_key_here

# Allowed Origins (CORS)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Gmail SMTP for OTP Verification & 2FA (Nodemailer)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password

# Groq Llama 3.3 AI Integration
GROQ_API_KEY=your_groq_api_key_here

# Google Sign-In (Optional)
GOOGLE_CLIENT_IDS=

# Database Backups & Custom Cloud Sync Folder
BACKUP_ENABLED=true
BACKUP_INTERVAL_MS=86400000       # 24 h between automatic checks
BACKUP_MAX_FILES=10               # Newest N backups kept before rotation
BACKUP_DIR=C:/CitiVoice_Backups   # Path to any local, external, or OneDrive sync folder
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
| `backend` | `citivoice-backend` | `5000:5000` | Node.js Express REST API & WebSockets (mounts `./backups/db`) |
| `admin-web` | `citivoice-admin` | `8080:80` | Nginx Alpine serving production React admin app |
| `db-backup` | `citivoice-db-backup` | N/A | Daily 02:00 database dump into `./backups` |

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

### 📱 Building the Standalone Android App (APK / AAB)
To generate installable Android binaries without needing Android Studio installed locally:

```bash
# Navigate to the mobile directory
cd mobile

# 1. Build Standalone Installable APK (for direct phone installation / testing)
npm run build:apk

# 2. Build Production App Bundle (AAB for Google Play Console submission)
npm run build:aab
```

---

## 🔒 Security & Compliance

- **Two-Factor Authentication (2FA)** — Administrator console sign-in requires second-factor verification via email one-time password (OTP) with hashed codes and expiration timestamps.
- **Stateless JWT Authorization** — Expiring bearer tokens validated on every authenticated API route.
- **Bcrypt Password Hashing** — Passwords hashed with 10 salt rounds before persistence.
- **Strict Role-Based Access Control (RBAC)** — Granular route guards separating `citizen` and `admin` permissions.
- **Cross-Origin Security** — Custom CORS & CORP headers protecting uploads while allowing cross-platform asset rendering.
- **SQL Injection Prevention** — Prepared statements and parameterized queries via `mysql2`.
- **Rate Limiting & Anti-Bruteforce** — `express-rate-limit` protecting authentication routes, ID upload endpoints, and 2FA verification.
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
