# 📢 CitiVoice

**CitiVoice** is a full-stack community management and civic reporting platform that connects citizens with local government administrators. Built for city-level deployment, it enables real-time issue reporting, identity verification, event management, and data-driven analytics — all through a unified ecosystem of web and mobile applications.

---

## 🏗️ Architecture Overview

CitiVoice follows a monorepo architecture with three independently deployable modules that communicate through a centralized REST API:

```
citivoice/
├── backend/          # Express.js REST API + MySQL
├── admin-web/        # React admin dashboard (CRA)
├── mobile/           # React Native citizen app (Expo)
├── docker-compose.yml
└── package.json      # Monorepo root scripts
```

| Layer | Technology | Role |
|-------|-----------|------|
| **Backend API** | Node.js, Express, MySQL | Data persistence, auth, file uploads, notifications |
| **Admin Dashboard** | React 19, Leaflet, Recharts | Manage barangays, concerns, users, events |
| **Citizen App** | React Native, Expo SDK 54 | Submit concerns, view events, verify identity |

---

## 🚀 Key Features

### 🏢 Admin Dashboard (Web)
- **Analytics Dashboard** — Real-time charts and statistics powered by Recharts with concern breakdowns by status, category, and barangay.
- **Concerns Management** — Review, update status, and track citizen-reported concerns with full detail views.
- **Interactive Map** — Leaflet-based map with marker clustering, heatmap overlays, and geocoded concern pins.
- **Barangay Management** — CRUD operations for managing barangay records.
- **User Management** — View and manage citizen accounts with role-based access control.
- **Identity Verification** — Secure workflow for reviewing government-issued ID submissions.
- **Events & Announcements** — Create and manage community events and broadcast announcements.
- **Reports** — Generate and export analytical reports on community data.

### 📱 Citizen App (Mobile)
- **Civic Reporting** — Submit concerns with photo attachments, GPS location, category tags, and descriptions.
- **Interactive Map** — React Native Maps integration with color-coded concern markers and clustering.
- **Events Feed** — Browse upcoming community events and city announcements.
- **My Concerns** — Track the status of submitted reports in real-time.
- **Notifications** — Push-style notifications for concern status updates and announcements.
- **Profile & Verification** — Complete identity verification by uploading government-issued IDs.
- **Multi-language Support** — Built-in i18n supporting English, Filipino, and Hiligaynon.

---

## 🛠️ Tech Stack

### Backend
| Package | Purpose |
|---------|---------|
| Express.js | REST API framework |
| MySQL 8.0 + mysql2 | Primary relational database |
| JSON Web Tokens | Stateless authentication |
| Bcrypt.js | Password hashing |
| Multer | Multipart file upload handling |
| express-validator | Request validation |
| Nodemailer | Email notifications |
| Twilio | SMS notifications |
| Nodemon | Development hot-reload |

### Admin Dashboard (Web)
| Package | Purpose |
|---------|---------|
| React 19 | UI framework |
| React Router v6 | Client-side routing |
| Recharts | Data visualization & charts |
| Leaflet + React-Leaflet | Interactive mapping |
| leaflet-geosearch | Address geocoding |
| leaflet.heat | Heatmap overlays |
| react-leaflet-cluster | Marker clustering |
| React Icons | Icon library |

### Citizen App (Mobile)
| Package | Purpose |
|---------|---------|
| React Native 0.81 | Mobile framework |
| Expo SDK 54 | Development platform |
| React Navigation v6 | Screen navigation (stack + tabs) |
| React Native Maps | Native map component |
| Expo Image Picker | Camera & gallery access |
| Expo Location | GPS & geolocation |
| Expo Linear Gradient | UI gradient effects |
| AsyncStorage | Local token persistence |

### Infrastructure
| Tool | Purpose |
|------|---------|
| Docker Compose | MySQL container orchestration |
| LocalTunnel | Remote development tunneling |
| Concurrently | Parallel script execution |

---

## 📁 Project Structure

```
citivoice/
│
├── backend/
│   ├── database/
│   │   └── schema.sql            # MySQL schema & migrations
│   ├── middleware/
│   │   ├── auth.js               # JWT verification middleware
│   │   └── upload.js             # Multer file upload config
│   ├── routes/
│   │   ├── auth.js               # Login, register, token refresh
│   │   ├── users.js              # User management & verification
│   │   ├── concerns.js           # CRUD for civic concerns
│   │   ├── barangays.js          # Barangay management
│   │   ├── announcements.js      # Announcements broadcasting
│   │   ├── events.js             # Community events
│   │   └── notifications.js      # Push notifications
│   ├── services/
│   │   └── notificationService.js  # Email & SMS dispatch
│   ├── db.js                     # MySQL connection pool
│   ├── server.js                 # Express app entry point
│   └── migrate.js                # Database migration runner
│
├── admin-web/
│   └── src/
│       ├── components/
│       │   └── Sidebar.jsx       # Navigation sidebar
│       ├── pages/
│       │   ├── Dashboard.jsx     # Analytics overview
│       │   ├── Concerns.jsx      # Concerns list view
│       │   ├── ConcernDetail.jsx # Individual concern view
│       │   ├── MapView.jsx       # Interactive concern map
│       │   ├── Barangays.jsx     # Barangay management
│       │   ├── Users.jsx         # User management
│       │   ├── Verification.jsx  # Identity verification queue
│       │   ├── Eventsannouncements.jsx  # Events & announcements
│       │   ├── Reports.jsx       # Analytics & reports
│       │   └── Login.jsx         # Admin authentication
│       ├── api.js                # Axios API client
│       └── index.css             # Global styles
│
├── mobile/
│   └── src/
│       ├── screens/
│       │   ├── auth/
│       │   │   ├── LoginScreen.js
│       │   │   ├── Registerscreen.js
│       │   │   └── VerifyIdentityScreen.js
│       │   ├── citizen/
│       │   │   ├── HomeScreen.js
│       │   │   ├── SubmitConcernScreen.js
│       │   │   ├── Myconcernsscreen.js
│       │   │   ├── Concerndetailscreen.js
│       │   │   ├── Mapscreen.js
│       │   │   ├── Eventsscreen.js
│       │   │   ├── NotificationsScreen.js
│       │   │   └── Profilescreen.js
│       │   └── admin/
│       │       ├── Admindashboardscreen.js
│       │       ├── Adminconcernsscreen.js
│       │       ├── Adminconcerndetailscreen.js
│       │       ├── Adminprofilescreen.js
│       │       └── Concerncard.js
│       ├── services/
│       │   ├── authService.js    # JWT auth helpers
│       │   ├── concernService.js # Concern API calls
│       │   └── Mapscreen.js      # Map service utilities
│       ├── context/              # React Context providers
│       ├── hooks/                # Custom React hooks (e.g. useLocation, useImagePicker)
│       ├── i18n/
│       │   └── translations.js   # Multi-language strings
│       ├── navigation/           # React Navigation config
│       ├── components/           # Shared UI components
│       └── utils/                # Utility helpers
│
├── docker-compose.yml            # MySQL 8.0 container
├── package.json                  # Monorepo root config
├── .editorconfig                 # Code formatting rules
├── .prettierrc                   # Prettier config
├── .gitignore                    # Version control exclusions
└── LICENSE                       # MIT License
```

---

## 🔌 API Endpoints

All routes are prefixed with `/api`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new citizen account |
| `POST` | `/api/auth/login` | Authenticate and receive JWT |
| `GET` | `/api/users` | List all users (admin) |
| `PATCH` | `/api/users/:id` | Update user profile or role |
| `GET` | `/api/concerns` | List all concerns |
| `POST` | `/api/concerns` | Submit a new concern |
| `GET` | `/api/concerns/:id` | Get concern details |
| `PATCH` | `/api/concerns/:id` | Update concern status |
| `GET` | `/api/barangays` | List all barangays |
| `POST` | `/api/barangays` | Create a barangay (admin) |
| `PUT` | `/api/barangays/:id` | Update a barangay (admin) |
| `DELETE` | `/api/barangays/:id` | Delete a barangay (admin) |
| `GET` | `/api/announcements` | List announcements |
| `POST` | `/api/announcements` | Create announcement (admin) |
| `GET` | `/api/events` | List community events |
| `POST` | `/api/events` | Create event (admin) |
| `GET` | `/api/notifications` | Get user notifications |
| `GET` | `/api/health` | Health check |

---

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [MySQL 8.0](https://www.mysql.com/) (local install **or** via Docker)
- [Expo Go](https://expo.dev/expo-go) app on your mobile device

### 1. Clone & Install

```bash
git clone https://github.com/your-username/citivoice.git
cd citivoice
npm run install:all
```

This installs dependencies for the root, backend, admin-web, and mobile workspaces.

### 2. Database Setup

**Option A — Docker (Recommended)**

```bash
npm run db:up
```

This spins up a MySQL 8.0 container with the `citivoice` database and auto-runs `schema.sql`.

**Option B — Local MySQL**

1. Create a database named `citivoice`.
2. Import the schema manually:
   ```bash
   mysql -u root -p citivoice < backend/database/schema.sql
   ```

### 3. Environment Configuration

Copy the example `.env` files and fill in your values:

**Backend** (`backend/.env`)
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=citivoice
JWT_SECRET=your_jwt_secret_key_here

# Optional: Email notifications
# EMAIL_USER=your_email@gmail.com
# EMAIL_PASS=your_app_password

# Optional: SMS notifications
# TWILIO_SID=your_sid
# TWILIO_AUTH_TOKEN=your_token
# TWILIO_PHONE=your_twilio_number
```

**Admin Web** (`admin-web/.env`)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

**Mobile** (`mobile/.env`)
```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. Start All Services

Run everything in parallel from the project root:

```bash
npm run dev
```

Or start each service individually:

```bash
# Terminal 1 — Backend API
npm run backend

# Terminal 2 — Admin Dashboard
npm run web

# Terminal 3 — Mobile App
npm run mobile
```

| Service | Default URL |
|---------|-------------|
| Backend API | `http://localhost:5000` |
| Admin Dashboard | `http://localhost:3000` |
| Mobile (Expo) | Expo DevTools / QR code |

---

## 🌐 Remote Development

For testing the mobile app on a physical device over a different network:

1. **Tunnel the backend API:**
   ```bash
   cd backend
   npm run tunnel
   ```
   This creates a public URL via [LocalTunnel](https://theboroer.github.io/localtunnel-www/).

2. **Update** `mobile/.env` with the tunnel URL:
   ```env
   EXPO_PUBLIC_API_URL=https://your-subdomain.loca.lt/api
   ```

3. **Start the mobile app** with tunnel mode:
   ```bash
   cd mobile
   npx expo start --tunnel
   ```

---

## 🔒 Security

- **JWT Authentication** — Stateless token-based auth for all protected routes. Tokens are stored securely via AsyncStorage on mobile and in-memory on the web client.
- **Role-Based Access Control** — Middleware enforces `admin` vs `citizen` permissions on every API route.
- **Password Encryption** — All passwords are hashed with Bcrypt before storage.
- **Identity Verification** — Citizens must submit government-issued ID photos which are manually reviewed by admins before granting verified status.
- **Input Validation** — express-validator sanitizes and validates all incoming request data.
- **CORS & CORP** — Configured to restrict cross-origin access and properly permit cross-origin image rendering for the mobile client.

---

## 🐳 Docker

A `docker-compose.yml` is included for database orchestration:

```bash
# Start MySQL container
npm run db:up

# Stop and remove container
npm run db:down
```

The container:
- Runs **MySQL 8.0** on port `3306`
- Auto-creates the `citivoice` database
- Loads `backend/database/schema.sql` on first run
- Persists data in a named volume (`mysql_data`)

---

## 📜 Available Scripts

From the project root (`package.json`):

| Script | Command | Description |
|--------|---------|-------------|
| `install:all` | `npm run install:all` | Install dependencies for all workspaces |
| `dev` | `npm run dev` | Start all services concurrently |
| `backend` | `npm run backend` | Start backend API (Nodemon) |
| `web` | `npm run web` | Start admin dashboard (CRA) |
| `mobile` | `npm run mobile` | Start Expo development server |
| `db:up` | `npm run db:up` | Start MySQL Docker container |
| `db:down` | `npm run db:down` | Stop MySQL Docker container |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

© 2026 CitiVoice Team
