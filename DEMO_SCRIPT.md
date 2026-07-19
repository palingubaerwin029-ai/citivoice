# 📢 CitiVoice — Live Demonstration Script & Presenter Guide

> **System:** CitiVoice (Community Management & Civic Reporting Platform)  
> **Target Audience:** Stakeholders, Local Government Officials, Product Judges, Technical Evaluators  
> **Estimated Duration:** 5 to 7 Minutes (Express Pitch) or 10 to 12 Minutes (Full Deep-Dive)  
> **Format:** Dual-Screen Live Interactive Demonstration (Web Admin + Mobile App)

---

## 🛠️ Pre-Demo Setup & Preparation Checklist

Ensure all environment dependencies and services are running prior to starting the presentation.

### 1. Terminal Setup
Execute from the project root directory:

```bash
# Option A: Start database via Docker (if not using local MySQL)
npm run db:up

# Option B: Run all services in parallel (Backend + Web Admin + Mobile)
npm run dev
```

* **Backend REST API & WebSockets:** Running at `http://localhost:5000`
* **Web Admin Dashboard:** Running at `http://localhost:3000`
* **Mobile Citizen App:** Running on Expo Go (Physical device or iOS/Android Emulator)

### 2. Verify Test Accounts & Credentials
Prepare these accounts for logging in during the demo:

| Account Type | Email | Default Password | Role |
| :--- | :--- | :--- | :--- |
| **Admin User** | `admin@citivoice.gov.ph` | *(as set via `npm run seed-admin` or schema)* | Admin / City Manager |
| **Citizen User** | `juan.delacruz@example.com` | `Password123!` | Verified Citizen |
| **Unverified Citizen** | `maria.clara@example.com` | `Password123!` | Pending Verification |

*(If test accounts need to be created/re-seeded, run `node backend/scripts/seed-admin.js`)*

### 3. Screen Layout Strategy (Recommended)
For maximum visual impact during the demo, arrange your display as follows:
* **Left Half of Screen:** Web Admin Dashboard (`http://localhost:3000`)
* **Right Half of Screen:** Expo Mobile App (via Android Studio Emulator, Xcode Simulator, or Screen Mirroring software like Scrcpy)

---

## 🎭 Live Demonstration Script (Step-by-Step)

---

### ACT 1: Introduction & Problem Statement (0:00 – 1:00)

**Presenter Setup:** Stand with the presentation opening slide or full-screen view of the CitiVoice Web Dashboard.

#### 🎙️ Spoken Script:
> "Good day everyone!  
> In modern municipal governance, one of the biggest challenges local governments face is **citizen communication and response time**. Traditional methods of reporting civic issues — like clogged drainage, broken streetlights, or road damage — rely on manual paperwork, physical visits to city halls, or fragmented social media posts.
>
> Issues get lost, response times lag, and citizens are left in the dark.
>
> Today, I am proud to present **CitiVoice** — a full-stack, real-time civic management platform designed to connect citizens directly with city administrators. Powered by **Artificial Intelligence (Groq & Llama 3.3)**, **Real-Time WebSockets**, and automated **Service Level Agreements (SLAs)**, CitiVoice transforms civic reporting into a transparent, data-driven ecosystem."

---

### ACT 2: The Citizen Experience — Mobile App (1:00 – 3:15)

**Presenter Action:** Direct attention to the Mobile App screen (Right side).

#### 1. Multi-Language & Accessibility Support
* **Action:** Tap on the language toggle / settings in the Mobile App. Switch between **English**, **Filipino**, and **Hiligaynon**.
* 🎙️ **Spoken Script:**
  > "First, accessibility is critical. CitiVoice is built for diverse communities. On our mobile app, citizens can seamlessly switch languages between English, Filipino, and regional dialects like Hiligaynon with a single tap."

#### 2. Identity Verification & Trust
* **Action:** Navigate to User Profile / Identity Verification screen (`VerifyIdentityScreen`). Show uploaded ID preview.
* 🎙️ **Spoken Script:**
  > "To prevent spam and fake reports, CitiVoice features a secure identity verification workflow. Citizens can submit government-issued IDs, which city administrators review and approve before granting verified reporting status."

#### 3. Filing a Report with AI Groq Smart Categorization
* **Action:** Navigate to **Submit Concern** screen.
* **Action:** Fill in the concern submission form with live sample data:
  * **Title:** `"Nagaka-guba kag naga-baha ang dalan bangud sa tubig sa ilog hilabangan"` *(or in English: "Severe road flooding caused by heavy overflow near Barangay Tabao street")*
  * **Description:** `"Deep flood water blocking vehicles near the main crossing. Needs immediate drainage clearing and flood barrier assistance."`
  * **Location:** Tap GPS location picker to automatically capture latitude/longitude.
  * **Photo Attachment:** Upload a sample image of road damage or flooding.
* **Action:** Click **Submit Report**.
* 🎙️ **Spoken Script:**
  > "Now, let’s file a civic report. Notice how a citizen simply takes a photo, captures their GPS location, and types out what’s wrong — even using local terms or dialect phrases like *'ilog hilabangan'*.
  >
  > Behind the scenes, our **Groq AI engine powered by Llama 3.3** instantly analyzes the text, performs localized sentiment analysis, calculates urgency, and automatically assigns the report to the correct department — such as *Public Works* or *Disaster Risk Reduction* — with zero human intervention required!"

#### 4. Community Upvoting & Citizen Map
* **Action:** Navigate to **Citizen Map** / **My Concerns**. Show color-coded map markers and upvote button on another nearby concern.
* 🎙️ **Spoken Script:**
  > "Citizens can also view reported issues on an interactive community map. Instead of filing duplicate tickets for the same broken streetlight, neighbors can simply **upvote** existing concerns, signaling higher community urgency to the city administration."

---

### ACT 3: Real-Time Admin Dashboard & City Operations (3:15 – 5:30)

**Presenter Action:** Point out the Web Admin Dashboard (Left side of screen).

#### 1. Real-Time WebSockets Notification
* **Action:** Highlight the real-time notification pop-up and updated concern badge counter on the Admin Dashboard that triggered the exact moment the mobile report was submitted.
* 🎙️ **Spoken Script:**
  > "Look at the Admin Dashboard on the left! Without refreshing the page, our **Socket.io WebSocket connection** instantly pushed the new concern directly to the city administration queue. City staff receive real-time alerts the second an incident is reported."

#### 2. Analytics Dashboard & Recharts Visualization
* **Action:** Click on **Dashboard / Analytics Overview**. Point out charts (Concern Status Breakdown, Category Distribution, Barangay Heatmap Metrics).
* 🎙️ **Spoken Script:**
  > "Here on the Executive Dashboard, administrators get a high-level command view. They can monitor key performance metrics, filter reports by Barangay, track department workloads, and identify emerging municipal trends using interactive data visualizations."

#### 3. Leaflet Interactive Map & Heatmap Clustering
* **Action:** Navigate to **Map View** (`MapView.jsx`). Demonstrate marker clustering and toggle the Heatmap overlay.
* 🎙️ **Spoken Script:**
  > "Our geospatial view utilizes Leaflet with marker clustering and heatmap overlays. City planners can visually identify high-density complaint zones — like recurring drainage overflows or traffic light failures — allowing for proactive infrastructure investments."

#### 4. Concern Resolution & Department Workflow
* **Action:** Navigate to **Concerns Management** -> Click on the newly submitted concern detail view.
* **Action:** Show the AI-generated sentiment and priority tags (**High Priority - 24 Hour SLA**).
* **Action:** Update status from `Pending` ➡️ `In Progress`. Add an official Admin Note:
  * *Admin Note:* `"Dispatched Maintenance Team 4 to clear drainage blockages in Barangay Tabao. Estimated resolution within 3 hours."`
* **Action:** Click **Save Update**.
* 🎙️ **Spoken Script:**
  > "Administrators can review the concern details, verify the AI classification, assign responsible department heads, and update the status with official dispatch notes.
  >
  > Furthermore, CitiVoice includes an automated **SLA Escalation Engine**. If a High-Priority concern remains unaddressed past its 24-hour deadline, our background cron service automatically escalates the priority level, alerts department supervisors, and logs an indelible audit trail."

---

### ACT 4: Closed-Loop Real-Time Citizen Feedback (5:30 – 6:30)

**Presenter Action:** Direct attention back to the Mobile App screen (Right side).

#### 1. Instant Push / In-App Notification Update
* **Action:** Tap **Notifications** or pull-to-refresh / view live status update on the mobile screen.
* **Action:** Open concern detail screen on mobile showing the status updated to `"In Progress"` alongside the Admin's note: `"Dispatched Maintenance Team 4..."`.
* 🎙️ **Spoken Script:**
  > "Switching back to the citizen's phone — notice that the citizen immediately receives an in-app notification!
  >
  > They can open their report and see in real-time that City Maintenance has been dispatched. This closed-loop transparency builds deep trust between citizens and local government."

---

### ACT 5: Technical Highlights & Wrap-Up (6:30 – 7:30)

**Presenter Action:** Show project architecture diagram or return to summary slide.

#### 🎙️ Spoken Script:
> "To summarize the technical architecture behind CitiVoice:
>
> 1. **Robust Core:** Built as a scalable monorepo featuring a Node.js/Express REST API paired with MySQL 8.0, tuned with 12 custom relational indexes for sub-millisecond query performance.
> 2. **Modern Web Admin:** Developed in React 19 featuring Recharts for analytics and Leaflet for spatial GIS mapping.
> 3. **Native Mobile App:** Built with React Native & Expo SDK 54, offering smooth cross-platform mobile experiences on iOS and Android.
> 4. **AI & Real-Time Communications:** Powered by Groq Llama 3.3 for intelligent NLP categorization and Socket.io for instantaneous dual-way WebSockets.
>
> CitiVoice empowers citizens, streamlines city operations, and accelerates emergency response.
>
> Thank you! We are now open for any questions."

---

## ❓ Q&A Presenter Cheat Sheet (Anticipated Questions)

### Q1: How does the AI handle regional dialects or non-English input?
> **Answer:** "Our backend integrates with **Groq SDK (Llama 3.3)** using custom system prompts tailored specifically for local context. It is trained to recognize English, Filipino, and regional dialects like Hiligaynon (e.g. identifying terms like 'baha', 'ilog hilabangan', or 'guba nga dalan') and accurately map them to official administrative categories and urgency tiers."

### Q2: What happens if the internet connection drops on the mobile device?
> **Answer:** "The mobile app uses `AsyncStorage` for state management and offline resilience. Unsent reports and local session tokens are cached securely on the device until connection is re-established."

### Q3: How does the system prevent system performance bottlenecks with thousands of concerns?
> **Answer:** "We implemented **12 customized database indexes** targeting high-frequency lookup fields (`status`, `category`, `user_id`, `barangay`, `priority`, and `created_at`). Analytical queries, marker clustering, and list pagination perform efficiently even with high volume."

### Q4: How is citizen privacy protected regarding government ID submissions?
> **Answer:** "Identity verification images are uploaded via restricted multipart forms using Multer with sanitized file naming and access controls. Admin access to ID verification queues requires authenticated JWT tokens with strict Role-Based Access Control (`admin` role enforcement)."

### Q5: How are SLA deadlines tracked and enforced?
> **Answer:** "We run automated background cron jobs via `workflowService.js`. When SLA thresholds are breached (e.g., 24h for High, 72h for Medium), the service automatically elevates priority ratings, records structured audit logs, and emits WebSocket warning events to the admin dashboard."

---

## 💡 Quick Tips for Demo Execution

1. **Test WebSockets Before Demo:** Perform one quick test submission prior to presenting to ensure `localhost:5000` WebSocket handshake is connected on both clients.
2. **Use Realistic Test Data:** Images of real street lighting, road conditions, or community parks make the demo visually compelling.
3. **Pacing:** Allow 2-3 seconds after submitting a concern on mobile for the audience to digest the instant pop-up on the admin dashboard.
