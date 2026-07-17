# 📢 CitiVoice: Public Service Platform
## DICT Pitching Competition Entry Documentation & Pitch Deck Content

This document compiles the completed **Entry Documentation** (Chapters 1 to 7) and a slide-by-slide **PowerPoint Pitch Deck Content** (10 Slides) for **CitiVoice**, following the requirements specified in the [PITCHING-Format-of-Entry-Documentation.docx](file:///c:/project/citivoice/PITCHING-Format-of-Entry-Documentation.docx) template and utilizing the project manuscript.

---

# PART 1: ENTRY DOCUMENTATION

## Cover Page

*   **Project Title:** CitiVoice: Public Service Platform
*   **Team Name:** [Insert Team Name, e.g., Team Kabankalan Innovators]
*   **School/Organization:** [Insert School/Organization Name, e.g., Central Philippines State University (CPSU)]
*   **Team Members:**
    *   Erwin Palinguba (Lead Developer)
    *   [Insert Team Member 2]
    *   [Insert Team Member 3]
*   **Adviser/Mentor:** [Insert Adviser/Mentor Name]
*   **Date Submitted:** July 13, 2026

---

## Table of Contents

1.  Executive Summary
2.  Innovation
3.  Market Opportunity
4.  Target Users
5.  Competitor Analysis
6.  Sustainability Plan
7.  Social Impact

---

## 1. Executive Summary

### The Problem
Every day, citizens of Kabankalan City encounter non-emergency community concerns such as damaged roads, broken streetlights, clogged drainage systems, improper waste disposal, and other public infrastructure issues that affect their daily lives. While these concerns need timely attention from the local government, citizens currently rely on multiple disconnected reporting channels—such as social media, phone calls, or walk-in visits—to communicate their issues. These fragmented methods make it difficult for citizens to know where to report, whether the concern has reached the appropriate office, or if any action has been taken. 

Furthermore, reports submitted through disconnected channels result in fragmented records. This makes it challenging for the Public Information Office (PIO) and other government departments to consolidate information, monitor resolution progress, and provide timely updates. This lack of a centralized platform reduces transparency, delays coordination, and limits opportunities for active citizen participation.

### Proposed Solution
To address these challenges, we developed **CitiVoice: Public Service Platform**, a citizen-centered web and mobile application that provides residents of Kabankalan City with a centralized system to report non-emergency community concerns, upload supporting photos, specify incident locations via GPS, and monitor report statuses in real time. 

All submitted concerns are routed to the **Public Information Office (PIO)**, which acts as the central receiving and coordinating office. The platform integrates:
*   **Intelligent concern categorization** using natural language processing (NLP) powered by Meta's Llama models via the Groq SDK to route reports automatically (e.g., Electrical, Flood, Road Damage), with dialect-aware understanding (supporting Hiligaynon).
*   **Real-time WebSocket notifications** (via Socket.io) to keep citizens and administrators instantly informed.
*   **Automated Service Level Agreement (SLA) escalation workflow** to ensure timely resolution of concerns.
*   **Interactive mapping** with Leaflet and React Native Maps featuring heatmaps and marker clustering for geographic analytics.
*   **OCR-based identity verification** using Tesseract.js to streamline citizen account validation.

### Target Users
*   **Citizens of Kabankalan City:** The primary users who submit non-emergency concerns, upload photos, and track resolution.
*   **Public Information Office (PIO) & LGU Admins:** The administrative team responsible for receiving, verifying, categorizing, and coordinating reports with local government offices.

### Technology Used
CitiVoice is built using a modern JavaScript/TypeScript stack:
*   **Frontend (Mobile):** React Native (Expo SDK 54), React Native Maps (Google Maps/Apple Maps).
*   **Frontend (Web Admin):** React 19, Leaflet.js (Interactive Maps), Recharts (Data visualization & charts).
*   **Backend:** Node.js, Express.js, Socket.io (WebSockets).
*   **Database:** MySQL 8.0 with relational index tuning (12 custom indexes for high-speed queries).
*   **AI/OCR Integrations:** Groq SDK + Meta Llama 3.3, Tesseract.js (OCR for ID verification).
*   **Security Hardening:** Bcrypt.js, Helmet, Express Rate Limit, Role-Based Access Control (RBAC).

### Expected Impact
CitiVoice empowers Kabankalan City citizens by offering an accessible, transparent platform that fosters civic participation and public trust. For the PIO, it streamlines records, improves operational coordination, and supports data-driven governance. Ultimately, it delivers a more responsive, citizen-centered municipal service.

---

## 2. Innovation

### Why is your project innovative?
CitiVoice is innovative because it transitions community reporting from fragmented, manual channels into a single, unified digital hub. Beyond simple digitization, CitiVoice incorporates:
1.  **AI-Powered Edge:** It uses Meta's Llama 3.3 (via Groq) to perform localized sentiment analysis, and automatically categorize reports based on natural language descriptions.
2.  **Automated Governance (SLA Escalation):** Built-in cron jobs automatically monitor deadlines (High: 24h, Medium: 72h, Low: 168h) and escalate overdue concerns by upgrading priority levels, recording audit trails, and pushing WebSocket alerts without human intervention.
3.  **Real-Time Sync:** Full-duplex WebSocket integration via Socket.io ensures that as soon as a citizen reports an issue, it appears instantly on the PIO dashboard and map.

### What makes it different?
What sets CitiVoice apart is its hyper-local focus and premium design:
*   **Dialect-Aware AI Ingestion:** The AI categorization models are tailored to understand local dialects and terms (e.g., Hiligaynon words like *baha* for flood and *ilog hilabangan* for Kabankalan City).
*   **Multilingual Support:** Native, built-in internationalization (i18n) for English, Filipino, and Hiligaynon.
*   **Automated OCR ID Verification:** Speeds up verification using Tesseract.js, allowing the PIO to quickly confirm citizen identity via government-issued IDs.
*   **Geospatial Clustering & Heatmaps:** Admin maps group concerns dynamically and overlay heatmaps, helping officials spot structural patterns and recurring hotspots instantly.

### Why should DICT support it?
DICT should support CitiVoice because it addresses a critical local government need with a scalable, digital-first model. Supporting CitiVoice means investing in digital inclusion, citizen empowerment, and public trust. It aligns with DICT's mission to drive digital transformation in local government units (LGUs) and can serve as a template for other municipalities seeking a responsive, transparent civic reporting workflow.

---

## 3. Market Opportunity

With the Philippine government actively pushing for the digitalization of local government units (LGUs) under the E-Governance Act, there is an expanding market opportunity for localized civic tech. 
*   **Initial Market:** The 180,000+ residents and the municipal government of Kabankalan City, Negros Occidental.
*   **Addressable Market:** Over 1,400 municipalities and 140+ cities across the Philippines that currently lack custom civic reporting platforms and rely on unstructured channels like Facebook or paper logs.
*   **Scalability:** CitiVoice's modular monorepo architecture and Dockerized deployment setup allow it to be easily cloned and customized for other LGUs with minimal configuration.

---

## 4. Target Users

1.  **Citizens of Kabankalan City:** Residents seeking a streamlined, mobile-first channel to report issues (potholes, streetlights, garbage, floods) and receive direct, transparent updates.
2.  **Public Information Office (PIO) and City Administrators:** LGU staff responsible for managing incoming citizen concerns, routing them to action teams, monitoring progress, and communicating solutions back to the public.

---

## 5. Competitor Analysis

| Existing Solution | Weakness | CitiVoice's Advantage |
| :--- | :--- | :--- |
| **Facebook Page & Messenger** | Reports get buried in comments and inbox queues. No structured tracking, analytics, status history, or security verification. | Structured dashboard, automated tracking states (Pending, In Progress, Resolved), real-time map views, and secure database records. |
| **Walk-ins & Phone Calls** | Requires physical travel or phone hold times. Manual logging on paper or spreadsheets, offering zero transparency to the citizen. | 24/7 digital reporting from home, real-time push and WebSocket notifications, and automated progress logging. |
| **MyNaga App** | Tailor-made specifically for Naga City's systems; cannot be easily adapted or implemented by other LGUs. | Built as a modular, LGU-agnostic platform customized for Kabankalan's workflow, with flexible localization (Hiligaynon language support) and simple multi-tenant deployment. |

---

## 6. Sustainability Plan

*   **Future Improvements:**
    *   **Offline Reporting:** Store reports locally on the mobile app and sync automatically when internet connectivity is restored.
    *   **Computer Vision:** Use on-device or cloud-based image classification to verify incident photos automatically (e.g., auto-detecting potholes or floods).
    *   **Predictive Maintenance:** Analyze historical data to predict infrastructure failure (e.g., pinpointing streets with recurring streetlight issues).
*   **Maintenance:** Regularly optimize the MySQL database indexes, monitor server resource utilization, update npm dependencies, and gather LGU and citizen feedback to release iterative usability updates.
*   **Scalability:** The backend is built using a REST API that can be deployed on cloud resources (e.g., AWS EC2/RDS, Docker containers) to scale horizontally. The database is optimized with custom composite indexes to handle high concurrent read/write loads efficiently.
*   **Expansion:** Work closely with DICT regional offices and municipal leagues to pilot CitiVoice in neighboring cities and provinces in Negros Occidental, standardizing LGU workflow templates.

---

## 7. Social Impact

*   **Government Services & Accountability:** Fosters transparency by giving every citizen a tracking number and a visible pipeline. Officials are held accountable to SLAs, and response times are logged.
*   **Digital Inclusion:** Elevates accessibility. By supporting Hiligaynon, Filipino, and English, CitiVoice ensures that language barriers do not prevent marginalized or older citizens from utilizing municipal services.
*   **Disaster & Safety Management:** While designed for non-emergencies, routing flood and infrastructure reports swiftly helps city engineers mitigate hazards before they turn into emergencies.

---

# PART 2: POWERPOINT PITCH DECK CONTENT
**Structure: 10 Slides (Target: 5–7 Minutes Presentation)**

*   **Design Recommendation for Canva Link:** Use a modern, high-contrast dark theme with vibrant accents (e.g., Deep Navy Blue `#0B192C`, Citizen Orange/Teal `#F1F6F9`/`#00D2C4`) to give a professional and state-of-the-art civic-tech feel. Use sans-serif typography (e.g., *Inter* or *Outfit*).

---

### Slide 1: Cover / Title Slide
*   **Visual Layout:** Sleek dark background with the **CitiVoice Logo** at the center. Clean, glowing typography.
*   **On-Screen Text:**
    *   **Project Title:** CitiVoice
    *   **Tagline:** Your Voice. Your Community.
    *   **Team Name:** [Insert Team Name]
    *   **Affiliation:** [Insert School/Organization, e.g., Central Philippines State University]
    *   **Presenter:** Erwin Palinguba & Team
*   **Speaker Notes (30s):**
    > "Good day, panel of judges. We are Team [Team Name], and today we are proud to present **CitiVoice**, a full-stack civic reporting and community management ecosystem designed to bridge the gap between citizens and local government. Our goal is simple: to make sure that in every community, *every citizen has a voice*."

---

### Slide 2: The Problem
*   **Visual Layout:** Split screen. Left side: Photo of a damaged road or broken streetlight in Kabankalan. Right side: A diagram illustrating fragmented communication (Facebook, walk-ins, phone calls leading to a messy folder of paperwork).
*   **On-Screen Text:**
    *   **The Civic Reporting Gap**
    *   *Fragmented Channels:* Citizens report via Facebook comments, phone calls, or walk-ins.
    *   *Lack of Tracking:* Citizens don't know if their reports are received, read, or acted upon.
    *   *Administrative Overwhelm:* PIO staff struggles to compile data, leading to delayed resolutions and missed SLA targets.
*   **Speaker Notes (45s):**
    > "In many LGUs, reporting a broken streetlight or clogged drain is a frustrating experience. Citizens post on Facebook groups, make phone calls, or travel to City Hall. These reports are scattered across disconnected channels. For administrators at the Public Information Office, this creates information silos, making it nearly impossible to prioritize, coordinate, and track resolutions. The result? Unresolved community hazards and a decline in public trust."

---

### Slide 3: The Solution
*   **Visual Layout:** High-resolution screenshots of the **CitiVoice Citizen App** (Mobile, showing report submission with GPS map) and the **Admin Dashboard** (Web, showing mapped concerns).
*   **On-Screen Text:**
    *   **CitiVoice: A Unified Civic Ecosystem**
    *   *Citizen Mobile App:* Easy reporting with photo upload, location pinning, and real-time tracking.
    *   *Central Admin Web Dashboard:* The PIO command center to review, assign, and analyze concerns.
    *   *Value Proposition:* *Connecting communities, empowering citizens, and elevating public service through a unified, AI-powered civic platform.*
*   **Speaker Notes (45s):**
    > "Our solution is CitiVoice. We have built a unified web and mobile application that centralizes concern reporting. Citizens can file a report in seconds, attach a photo, and pin the exact location. This report is instantly sent to the Public Information Office dashboard. Citizens can trace their report from 'Pending' to 'In Progress' to 'Resolved', bringing transparency to local government."

---

### Slide 4: Key Features (Citizen App)
*   **Visual Layout:** Clean grid showing key mobile screens. Use subtle animations/mockups of the app.
*   **On-Screen Text:**
    *   **Empowering Citizens on Mobile**
    *   *Smart Reporting:* Quick-templates that adjust based on concern types.
    *   *Dialect-Aware Ingestion:* Support for Hiligaynon, English, and Filipino reporting.
    *   *Interactive Map:* Clustered markers showing local issues and city events.
    *   *Real-time Updates:* Push and WebSocket alerts on report progress.
*   **Speaker Notes (45s):**
    > "The citizen mobile application, built with React Native, prioritizes accessibility. It supports Hiligaynon, making it easy for locals to submit concerns using regional terminology. Citizens see reports on a map to avoid duplicate submissions, and they receive push notifications the moment an administrator updates their concern."

---

### Slide 5: Key Features (Admin Dashboard)
*   **Visual Layout:** Laptop mockup showing the Web Admin panel with Leaflet map markers, heatmap overlays, and Recharts analytics.
*   **On-Screen Text:**
    *   **Data-Driven Admin Dashboard**
    *   *Central Command:* View all reports in real time via WebSockets.
    *   *Geospatial Heatmaps:* Visualize infrastructure hot spots and priority zones.
    *   *OCR Identity Verification:* Tesseract.js automated verification of government-issued IDs.
    *   *SLA Automation:* Smart cron jobs that auto-escalate delayed tasks.
*   **Speaker Notes (45s):**
    > "For city administrators, the React-based Web Admin is a powerful tool. Incoming concerns are instantly plotted on an interactive Leaflet map. Using heatmap overlays, LGUs can identify infrastructure trends—like where drainage issues occur most. To prevent spam, accounts are verified using OCR technology that scans government IDs. Most importantly, an automated SLA cron job escalates overdue tickets automatically, ensuring citizens are never ignored."

---

### Slide 6: How It Works (Workflow)
*   **Visual Layout:** Horizontal process flow diagram: 
    *   `Citizen files report` ➔ `Groq AI categorizes & assigns SLA` ➔ `Socket.io alerts PIO Admin` ➔ `Action Team deployed` ➔ `SLA monitor tracks deadline` ➔ `Resolution confirmed & Citizen notified`.
*   **On-Screen Text:**
    *   **The CitiVoice Lifecycle**
    *   1. **Report:** Citizen submits issue on mobile with photo/GPS.
    *   2. **Ingest & Route:** System auto-categorizes concern and assigns SLA.
    *   3. **Manage:** Admin reviews and assigns to responsible LGU office.
    *   4. **Resolve:** Status updates are pushed to the citizen in real-time.
*   **Speaker Notes (45s):**
    > "Let's walk through the lifecycle. When a citizen submits a photo of a damaged road, the Groq AI categorizes it, and the system assigns a resolution SLA. The PIO receives an instant Socket.io alert. Once verified, the concern is routed to the City Engineering office. The citizen is notified at every step. If the deadline approaches without action, the SLA workflow auto-escalates the concern to High priority, triggering alerts to department heads."

---

### Slide 7: Technology Stack
*   **Visual Layout:** Clean architectural diagram showing Mobile / Web talking to the Node.js API, which interacts with MySQL, Groq AI, and Socket.io. Use logos of the tech stack (React, Node, MySQL, Expo, Groq).
*   **On-Screen Text:**
    *   **Robust & Scalable Tech Stack**
    *   *Frontend:* React Native (Expo SDK 54), React 19 (Web Admin)
    *   *Backend:* Node.js, Express.js, Socket.io
    *   *Database:* MySQL 8.0 with Relational Optimization (12 Custom Indexes)
    *   *AI / OCR:* Groq SDK + Llama 3.3, Tesseract.js
    *   *Security:* Bcrypt.js, Helmet, Express Rate Limit, JWT & RBAC
*   **Speaker Notes (40s):**
    > "Under the hood, CitiVoice is built to scale. We use React Native for cross-platform mobile access and React 19 for the admin dashboard. The Express.js backend handles real-time WebSocket communication via Socket.io. For data integrity and speed, we tuned our MySQL database with 12 custom indexes, ensuring query response times remain under 50 milliseconds, even with thousands of concurrent reports."

---

### Slide 8: Competitor & Market Analysis
*   **Visual Layout:** Clean, readable matrix table (similar to the competitor table in Chapter 5). Highlight CitiVoice in a glowing green/teal column.
*   **On-Screen Text:**
    *   **Why CitiVoice Wins**
    *   *Facebook:* Fragmented, no tracking, poor organization.
    *   *Walk-ins:* Inefficient, high friction, no transparency.
    *   *CitiVoice:* Centralized, real-time tracking, AI-categorized, LGU-agnostic, and localized (Hiligaynon).
*   **Speaker Notes (40s):**
    > "Compared to standard alternatives, CitiVoice stands out. While citizens use Facebook groups, posts get buried. Walk-ins require physical travel. Local municipal apps like MyNaga are hard-coded for specific cities. CitiVoice combines the structure of database tracking with localized AI, supporting Hiligaynon, and is built to be easily configured for any LGU in the country."

---

### Slide 9: Sustainability & Future Roadmap
*   **Visual Layout:** Horizontal timeline with icons representing next milestones.
*   **On-Screen Text:**
    *   **Roadmap for Sustainability & Growth**
    *   *Q3 2026:* Localized Beta Testing in Kabankalan City.
    *   *Q4 2026:* Offline-first reporting mode & computer vision integration.
    *   *Q1 2027:* LGU-to-LGU expansion (Negros Occidental rollout).
    *   *Security & Maintenance:* Regular audits, index optimization, and feedback loops.
*   **Speaker Notes (45s):**
    > "Our roadmap is focused on scalability and advanced tech. Following our launch in Kabankalan, we plan to implement offline-first reporting for remote barangays with low connectivity. We are also designing a computer vision feature to automatically detect pothole severity from photos. Our architecture is modular, meaning we can scale from a single city to a province-wide network."

---

### Slide 10: Social Impact & Closing
*   **Visual Layout:** Professional and inspiring layout. Presenter contact details, a mock QR code pointing to a Demo Video, and a bold closing statement.
*   **On-Screen Text:**
    *   **Every Citizen Has a Voice.**
    *   *Social Impact:* Digital inclusion, administrative transparency, safer communities.
    *   *Demo Video:* [Scan QR Code to Watch Demo]
    *   *Contact Info:* erwin.palinguba@email.com | [Insert Website/Github Link]
    *   **Thank You!**
*   **Speaker Notes (30s):**
    > "CitiVoice is more than a tool; it is a movement towards digital inclusion and civic empowerment. By giving local governments the tech to listen and citizens the platform to speak, we build safer, cleaner, and more transparent communities. We invite you to scan the QR code to watch our working demo. Thank you very much, and we are ready for your questions."

---

### Recommended Pitch Flow Timing (Total: 6 Minutes)
*   **Introduction (Slide 1):** 30 sec
*   **Problem (Slide 2):** 45 sec
*   **Solution (Slide 3):** 45 sec
*   **Key Features & Tech (Slides 4-7):** 2 min 10 sec
*   **Competitor & Market (Slide 8):** 40 sec
*   **Roadmap & Impact (Slides 9-10):** 1 min 10 sec
