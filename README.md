# 📢 CitiVoice

**CitiVoice** is a modern community management and reporting platform designed to bridge the gap between citizens and local government administrators. Specifically tailored for city environments, it enables real-time reporting of concerns, efficient event management, and data-driven insights through a centralized dashboard.

---

## 🏗️ Architecture Overview

CitiVoice is built as a modular system consisting of three main components:

- **Backend API**: A Node.js and Express REST API that handles data persistence in MySQL and provides shared services for both web and mobile clients.
- **Admin Dashboard (Web)**: A React-based web interface for government administrators to manage barangays, review reports, and broadcast announcements.
- **Citizen App (Mobile)**: An Expo-powered React Native application for citizens to report issues and stay updated on community activities.

---

## 🚀 Key Features

### 🏢 Admin Dashboard (Web)
- **Barangay Management**: Dynamic controls to add, edit, and localized barangay data.
- **Concerns Analytics**: Real-time visualization of community issues using Recharts.
- **Interactive Map**: High-performance mapping using Leaflet for geocoding and visual report tracking.
- **Verification System**: Secure workflow for verifying citizen identities via government-issued IDs.

### 📱 Citizen App (Mobile)
- **Civic Reporting**: Simple flow to report issues like road damage, waste, or safety hazards with photo and location markers.
- **Real-time Newsfeed**: Instant access to city announcements and community events.
- **Account Verification**: Integrated process to submit identity documents for official membership.

---

## 🛠️ Tech Stack

- **Frontend (Web)**: React 19, React Router, CSS Modules, Lucide Icons.
- **Mobile**: React Native, Expo, React Navigation, React Native Maps.
- **Backend API**: Node.js, Express.js, MySQL (Primary DB).
- **Authentication**: JWT (JSON Web Tokens) with Bcrypt password hashing.
- **Infrastructure**: OpenStreetMap (Mapping), Multer (File Uploads), Nodemailer (Emails), Twilio (SMS).

---

## 📦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MySQL Server](https://www.mysql.com/) (Local or Remote)
- [Expo Go](https://expo.dev/expo-go) (For mobile testing)

### 1. Database Setup
1. Create a MySQL database (e.g., named `citivoice`).
2. You can use the migration scripts provided in the backend to initialize your schema.

### 2. Backend Configuration
1. Navigate to the backend:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_NAME=citivoice
   JWT_SECRET=your_jwt_secret
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

### 3. Admin Web Setup
1. Navigate to the admin web folder:
   ```bash
   cd admin-web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```

### 4. Mobile App Setup
1. Navigate to the mobile folder:
   ```bash
   cd mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npm start
   ```

---

## 🔒 Security
The platform implements a robust security model using **JWT-based Authentication**. All sensitive administrative routes and citizen actions are protected by role-based middleware. Password data is encrypted using **Bcrypt**, and the system includes verified registration gates to ensure community integrity.

