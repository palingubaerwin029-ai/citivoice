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
- [Architecture Overview](#️-architecture-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [Docker & Container Orchestration](#-docker--container-orchestration)
- [Remote Development & Mobile Testing](#-remote-development--mobile-testing)
- [Security & Compliance](#-security--compliance)
- [Available Scripts](#-available-scripts)
- [License](#-license)

---

## 🌟 Overview

**CitiVoice** is an end-to-end civic engagement ecosystem designed for municipal governments (tailored for the **City of Kabankalan, Negros Occidental**). It bridges citizens and local government units (LGUs) through:

1. **A Cross-Platform Citizen Mobile App** (iOS & Android via React Native & Expo SDK 57) for incident reporting, GPS location pinning, push alerts, and real-time status tracking.
2. **An Executive Web Admin Dashboard** (React 19) featuring interactive GIS mapping, SLA resolution workflows, analytics, and certified 2-page print reporting.
3. **A High-Throughput REST & WebSocket Backend** (Express.js, Socket.io, MySQL 8.0) backed by Groq Llama 3.3 AI categorization, automated cron SLA escalations, and automated database backups.

---

## 🏗️ Architecture Overview

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
│  • Live Status & Push Alerts    │        │  • SLA Escalations & Audit Logs  │
└────────────────┬────────────────┘        └─────────────────┬────────────────┘
                 │                                           │
                 │              HTTP / WebSockets            │
                 └───────────────────┬───────────────────────┘
                                     │
                     ┌───────────────▼──────────────┐
                     │     CitiVoice REST API       │
                     │  • Express.js + Socket.io    │
                     │  • Groq Llama 3.3 AI Engine  │
                     │  • SLA Escalation Cron       │
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
- **Automatic Classification & Category Routing** — Analyzes incident descriptions and classifies them into categories (e.g., Road Obstruction, Flooding, Electrical Hazard, Sanitation) in milliseconds.
- **Urgency & Priority Scoring** — Determines incident severity (High, Medium, Low) and suggests proactive response times.
- **Dialect & Localization Awareness** — Trained to understand local dialects and terminology (Hiligaynon, Cebuano, Filipino, and English), recognizing place names and terms like *"baha"*, *"lubak"*, or *"kuryente"*.

### 📍 Pinned GPS Coordinates & Geographic Analytics
- **Pinpoint Incident Geolocation** — Citizen reports are captured using device GPS or interactive map pin placement.
- **Kabankalan Centroid Distance Matching** — Analytics map every incident to the nearest of all **32 Kabankalan barangays** (e.g., Oringao, Bantayan, Barangay 1) based on exact Euclidean distance rather than user home addresses, guaranteeing geographic precision.
- **"Most Concerned Barangay" Ranking** — Dynamic dashboard intelligence that identifies and ranks the most affected barangays, their primary issue categories, and percentage share of city concerns.

### ⏱️ SLA Escalation Engine & Audit Logging
- **Service Level Agreements** — Automatic deadline calculation based on concern priority (High: 24h, Medium: 72h, Low: 168h).
- **Background Cron Monitor** — Recurring cron jobs check overdue deadlines, automatically upgrade priorities, send WebSocket alerts, and maintain comprehensive audit trail records.

### 📄 Executive 2-Page Municipal Print Reports
- **Strict 2-Page Print Layout** — Generates official municipal reports via `window.print()` formatted strictly within 2 pages (A4 and US Letter):
  - **Page 1**: Official Republic of the Philippines / City Government of Kabankalan header, 5 KPI metric cards, monthly submission & resolution trend table, status distribution, and priority breakdown.
  - **Page 2**: Section running header, ranked barangay concerns table, top upvoted citizen concerns, resolution rate breakdown, and formal certification sign-off block (*Prepared by System Admin, Verified by Public Information Office, Noted by City Mayor*).
- **Zero Screen Bleed**: Print headers, page breaks, and certification blocks remain completely hidden on screen and activate exclusively during print preview.

### 🎨 Full-Spectrum Dark & Light Theme System
- **Curated High-Contrast Design System** — Tailored CSS variables (`--bg`, `--surface`, `--text-1`, `--border-md`).
- **Adaptive Chart Tooltips** — Recharts tooltips adaptively render crisp, high-visibility white text in dark mode and dark slate in light mode across both Dashboard and Reports.

### ✉️ Email OTP Verification Workflow
- **Pre-Registration Verification** — Six-digit OTP email verification with expiration timestamps and anti-tampering validation before citizen accounts are created.
- **Password Reset & Recovery** — Secure email dispatch via Nodemailer for account recovery.

### 🗺️ GIS Mapping & Spatial Visualization
- **Web Admin**: Leaflet-based interactive map with marker clustering, heatmaps, and filtering by category, status, and barangay.
- **Mobile Citizen App**: React Native Maps with live user location, custom category pin icons, and cluster aggregation.

---

## 🛠️ Tech Stack

### Backend API
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20.x | JavaScript runtime environment |
| **Express.js** | 4.19.2 | REST API routing and middleware |
| **MySQL** | 8.0 | Primary relational database |
| **mysql2** | 3.9.7 | High-performance MySQL driver with connection pooling |
| **Socket.io** | 4.8.3 | Bi-directional real-time WebSocket communications |
| **Groq SDK** | 1.3.0 | Llama 3.3 AI NLP classification engine |
| **Nodemailer** | 8.0.5 | Transactional email & OTP verification dispatch |
| **Expo Server SDK** | 6.1.0 | Mobile push notification delivery |
| **Multer** | 1.4.5 | Multipart file and image upload handling |
| **Bcrypt.js** | 2.4.3 | Salted password hashing |
| **JSON Web Tokens** | 9.0.2 | Stateless bearer authentication |
| **Helmet & HPP** | Latest | Security headers and HTTP parameter pollution protection |

### Admin Dashboard (Web)
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.0.0 | Component-based UI framework |
| **React Router** | 6.23.1 | Client-side routing and deep-linking |
| **Recharts** | 2.12.7 | Interactive charts and analytics visualization |
| **Leaflet** | 1.9.4 | Interactive web mapping |
| **React-Leaflet** | 5.0.0 | React bindings for Leaflet GIS layers |
| **Leaflet Heat & Cluster** | 0.2.0 / 4.1.3 | Heatmap layer and marker clustering |
| **Socket.io-client** | 4.8.3 | Real-time WebSocket event listeners |
| **React Icons** | 5.6.0 | Iconography |

### Citizen Mobile App
| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native** | 0.86.3 | Native cross-platform mobile framework |
| **Expo SDK** | 57.0.27 | Mobile development toolkit and native bridges |
| **React Navigation** | 6.x | Native stack and bottom tab navigation |
| **React Native Maps** | 1.27.2 | Interactive native map view |
| **RN Map Clustering** | 4.0.0 | Real-time map marker clustering |
| **Expo Location** | 57.0.20 | Hardware GPS and reverse geocoding |
| **Expo Image Picker** | 57.0.20 | Camera capture and photo gallery selection |
| **AsyncStorage** | 2.2.0 | Offline persistence and JWT token storage |
| **Socket.io-client** | 4.8.3 | Real-time incident alert listener |

### Infrastructure & DevOps
| Technology | Purpose |
|------------|---------|
| **Docker Compose** | Multi-container orchestration (API, Web, DB, Backups) |
| **databack/mysql-backup** | Automated daily scheduled database backup container |
| **Nginx (Alpine)** | High-performance static web server and reverse proxy |
| **Ngrok / LocalTunnel** | Remote tunnel endpoints for mobile physical device testing |

---

## 📁 Project Structure

```
citivoice/
├── backend/
│   ├── database/
│   │   └── schema.sql              # MySQL tables, relationships, and 12 performance indexes
│   ├── middleware/
│   │   ├── auth.js                 # JWT verification and role-based guards
│   │   └── upload.js               # Multer image storage and validation
│   ├── routes/
│   │   ├── auth.js                 # Login, registration, email OTP verification
│   │   ├── users.js                # Profile updates and government ID review
│   │   ├── concerns.js             # Incident reporting CRUD and status transitions
│   │   ├── barangays.js            # Barangay geographic records and boundary data
│   │   ├── workflow.js             # SLA checks and department dispatch
│   │   └── notifications.js        # Citizen notifications and push triggers
│   ├── services/
│   │   ├── groqService.js          # Groq Llama 3.3 AI processing pipeline
│   │   ├── workflowService.js      # SLA escalation cron and audit logging
│   │   └── notificationService.js  # Email and push notification dispatchers
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
│       │   ├── ConcernDetail.jsx   # Concern review, status updates, and timeline
│       │   ├── MapView.jsx         # Full-screen Leaflet GIS map with heatmaps
│       │   ├── Reports.jsx         # Executive analytics and 2-page print reporting
│       │   ├── Barangays.jsx       # Barangay CRUD and statistics
│       │   ├── Users.jsx           # User management and role assignment
│       │   └── Verification.jsx    # ID verification queue
│       ├── services/
│       │   └── api.js              # Axios client and Kabankalan coordinate matching
│       ├── styles/                 # Modular CSS stylesheets with dark/light theming
│       └── index.css               # Global theme variables and Recharts tooltip styling
│
├── mobile/
│   └── src/
│       ├── screens/
│       │   ├── auth/               # Login, Register, Email OTP, and ID Upload
│       │   ├── citizen/            # Feed, Incident Submit, Map, My Concerns, Profile
│       │   └── admin/              # Mobile admin dashboard and concern dispatch
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

## 🔌 API Endpoints

All endpoints are hosted under `/api`.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/auth/send-otp` | Public | Send a 6-digit email verification OTP |
| `POST` | `/api/auth/verify-otp` | Public | Verify OTP code before registration |
| `POST` | `/api/auth/register` | Public | Complete account registration |
| `POST` | `/api/auth/login` | Public | Authenticate user and issue JWT |
| `GET`  | `/api/concerns` | Authenticated | List concerns with filtering and pagination |
| `POST` | `/api/concerns` | Citizen | Submit a new civic concern with photo and GPS |
| `GET`  | `/api/concerns/:id` | Authenticated | Retrieve complete concern details and timeline |
| `PATCH`| `/api/concerns/:id` | Admin | Update concern status (`Pending`, `In Progress`, `Resolved`, `Rejected`) |
| `POST` | `/api/concerns/:id/upvote` | Citizen | Upvote or toggle support for a concern |
| `GET`  | `/api/barangays` | Authenticated | List all 32 Kabankalan barangays |
| `POST` | `/api/barangays` | Admin | Create a new barangay entry |
| `PUT`  | `/api/barangays/:id` | Admin | Update barangay details |
| `DELETE`| `/api/barangays/:id` | Admin | Delete a barangay record |
| `GET`  | `/api/users` | Admin | List registered citizen accounts |
| `PATCH`| `/api/users/:id` | Admin | Update account status or role |
| `POST` | `/api/workflow/check-sla` | Admin | Manually trigger SLA escalation audit |
| `GET`  | `/api/health` | Public | System and database health status |

---

## 📦 Getting Started

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

# Groq Llama 3.3 AI
GROQ_API_KEY=gsk_your_groq_api_key_here

# Email Notifications & OTP Verification (Gmail / SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password

# Optional: Twilio SMS
# TWILIO_SID=your_twilio_sid
# TWILIO_AUTH_TOKEN=your_twilio_auth_token
# TWILIO_PHONE=your_twilio_phone_number
```

### **Admin Web (`admin-web/.env`)**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### **Mobile (`mobile/.env`)**
```env
EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:5000/api
```
*(Replace `<YOUR_LOCAL_IP>` with your machine's local network IP address, e.g., `192.168.1.100`, so physical devices can reach the backend).*

---

## 🐳 Docker & Container Orchestration

CitiVoice includes a production-ready `docker-compose.yml` that orchestrates the complete environment:

```bash
# Start all containers in background
docker compose up -d

# Check running status
docker compose ps
```

### Running Services:
| Container | Image | Ports | Role |
|-----------|-------|-------|------|
| `citivoice-mysql` | `mysql:8.0-debian` | `3307:3306` | MySQL database with persistent volume |
| `citivoice-backend` | Built from `./backend` | `5000:5000` | Node.js Express API & WebSockets |
| `citivoice-admin` | Built from `./admin-web` | `8080:80` | Nginx web server serving React admin app |
| `citivoice-db-backup` | `databack/mysql-backup` | N/A | Automated daily database backup service |

To rebuild after source changes:
```bash
docker compose up --build -d admin-web
docker compose up --build -d backend
```

---

## 📱 Remote Development & Mobile Testing

To test the mobile app on physical phones over cellular or different Wi-Fi networks:

### Option A — Expo Tunnel (Recommended)
```bash
cd mobile
npx expo start --tunnel
```

### Option B — Backend Tunneling (via LocalTunnel or Ngrok)
1. In `backend/`:
   ```bash
   npm run tunnel
   ```
2. Update `mobile/.env` with the generated public URL:
   ```env
   EXPO_PUBLIC_API_URL=https://your-tunnel-subdomain.loca.lt/api
   ```
3. Start the Expo development server:
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
- **Rate Limiting & Slowdown** — `express-rate-limit` protecting authentication routes against brute-force attempts.
- **Input Sanitization** — `express-validator` schema validation on all incoming payload bodies.

---

## 📜 Available Scripts

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
