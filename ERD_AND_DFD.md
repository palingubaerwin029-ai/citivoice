# 📊 CitiVoice — Entity-Relationship Diagram (ERD) & Data Flow Diagrams (DFD)

This document provides the complete database **Entity-Relationship Diagram (ERD)** and multi-level **Data Flow Diagrams (DFD Level 0, Level 1, and Level 2)** for the **CitiVoice** municipal reporting platform (**City of Kabankalan, Negros Occidental**).

---

## 📑 Table of Contents

1. [Entity-Relationship Diagram (ERD)](#-1-entity-relationship-diagram-erd)
   - [Visual Mermaid ERD](#11-visual-mermaid-erd)
   - [Database Relationships & Cardinality Summary](#12-database-relationships--cardinality-summary)
   - [Table & Entity Dictionary](#13-table--entity-dictionary)
2. [Data Flow Diagrams (DFD)](#-2-data-flow-diagrams-dfd)
   - [DFD Symbol Legend](#21-dfd-symbol-legend)
   - [DFD Level 0 — Context Diagram](#22-dfd-level-0--context-diagram)
   - [DFD Level 1 — System Overview Diagram](#23-dfd-level-1--system-overview-diagram)
   - [DFD Level 2.1 — Citizen Registration & Camera-Only ID Verification](#24-dfd-level-21--citizen-registration--camera-only-id-verification)
   - [DFD Level 2.2 — Concern Submission, Offline Queue & AI Triage](#25-dfd-level-22--concern-submission-offline-queue--ai-triage)
   - [DFD Level 2.3 — Admin 2FA, Incident Resolution, Live Chat & Reporting](#26-dfd-level-23--admin-2fa-incident-resolution-live-chat--reporting)
   - [Data Store Dictionary](#27-data-store-dictionary)

---

## 🗄️ 1. Entity-Relationship Diagram (ERD)

### 1.1 Visual Mermaid ERD

The schema below reflects all **10 production InnoDB tables** defined in [`backend/database/schema.sql`](backend/database/schema.sql).

```mermaid
erDiagram
    USERS {
        int id PK "AUTO_INCREMENT"
        varchar name "NOT NULL"
        varchar email UK "NOT NULL, UNIQUE"
        varchar password_hash "NOT NULL"
        varchar phone "NULL"
        varchar barangay "NULL (Home Barangay)"
        varchar address "NULL (Street / Purok)"
        enum role "admin | citizen"
        enum verification_status "unverified | pending | verified | rejected"
        tinyint is_verified "0 | 1"
        varchar id_type "NULL (PhilSys, LTO, UMID, etc.)"
        varchar id_number "NULL"
        text id_image_url "NULL"
        text avatar_url "NULL"
        text fcm_token "NULL (Expo Push Token)"
        text rejection_reason "NULL"
        varchar reset_otp "NULL (Bcrypt Hash)"
        datetime reset_otp_expires "NULL"
        datetime submitted_at "NULL"
        datetime verified_at "NULL"
        datetime created_at "DEFAULT CURRENT_TIMESTAMP"
        datetime updated_at "ON UPDATE CURRENT_TIMESTAMP"
    }

    ADMIN_2FA_CODES {
        int user_id PK,FK "REFERENCES users(id) ON DELETE CASCADE"
        varchar otp_hash "NOT NULL"
        datetime expires_at "NOT NULL"
        datetime created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    EMAIL_VERIFICATIONS {
        varchar email PK "Target Gmail Address"
        varchar otp_hash "NOT NULL"
        datetime expires_at "NOT NULL"
        tinyint is_verified "0 | 1"
        datetime created_at "DEFAULT CURRENT_TIMESTAMP"
        datetime updated_at "ON UPDATE CURRENT_TIMESTAMP"
    }

    BARANGAYS {
        int id PK "AUTO_INCREMENT"
        varchar name UK "NOT NULL, UNIQUE (32 Barangays)"
        datetime created_at "DEFAULT CURRENT_TIMESTAMP"
        datetime updated_at "ON UPDATE CURRENT_TIMESTAMP"
    }

    CONCERNS {
        int id PK "AUTO_INCREMENT"
        varchar title "NOT NULL"
        text description "NOT NULL"
        varchar category "NOT NULL"
        enum priority "High | Medium | Low"
        enum status "Pending | In Progress | Resolved | Rejected"
        text image_url "NULL (Incident Camera Photo)"
        text resolved_image_url "NULL (Admin Proof Photo)"
        text location_address "NULL"
        decimal location_lat "DECIMAL(10,7)"
        decimal location_lng "DECIMAL(10,7)"
        int user_id FK "REFERENCES users(id) ON DELETE SET NULL"
        varchar user_name "Citizen Name Snapshot"
        varchar user_barangay "Citizen Home Barangay"
        varchar incident_barangay "GPS-Matched Incident Barangay"
        text admin_note "Official Resolution Note"
        datetime admin_viewed_at "NULL"
        datetime created_at "DEFAULT CURRENT_TIMESTAMP"
        datetime updated_at "ON UPDATE CURRENT_TIMESTAMP"
    }

    CONCERN_LINKS {
        int id PK "AUTO_INCREMENT"
        int source_concern_id FK "REFERENCES concerns(id) ON DELETE CASCADE"
        int target_concern_id FK "REFERENCES concerns(id) ON DELETE CASCADE"
        enum link_type "duplicate | related"
        decimal similarity_score "DECIMAL(5,2)"
        datetime created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    CONCERN_COMMENTS {
        int id PK "AUTO_INCREMENT"
        int concern_id FK "REFERENCES concerns(id) ON DELETE CASCADE"
        int user_id FK "REFERENCES users(id) ON DELETE CASCADE"
        varchar user_name "Author Name Snapshot"
        text comment "NOT NULL"
        varchar image_url "NULL"
        datetime created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    NOTIFICATIONS {
        int id PK "AUTO_INCREMENT"
        int user_id FK "REFERENCES users(id) ON DELETE CASCADE"
        int concern_id FK "REFERENCES concerns(id) ON DELETE CASCADE"
        varchar title "NOT NULL"
        text message "NOT NULL"
        tinyint is_read "0 | 1"
        datetime created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    AUDIT_LOG {
        int id PK "AUTO_INCREMENT"
        varchar entity_type "concern | user | barangay"
        int entity_id "Target Record ID"
        varchar action "status_change | verify | reject | etc."
        int changed_by FK "REFERENCES users(id) ON DELETE SET NULL"
        varchar changed_by_name "Actor Name Snapshot"
        json old_value "Previous State JSON"
        json new_value "Updated State JSON"
        datetime created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    FILE_STORAGE {
        int id PK "AUTO_INCREMENT"
        varchar filename UK "NOT NULL, UNIQUE"
        varchar mimetype "image/jpeg | image/png"
        longblob data "Binary Image Payload"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    %% Relationships
    USERS ||--o| ADMIN_2FA_CODES : "has active 2FA code"
    USERS ||--o{ CONCERNS : "submits"
    USERS ||--o{ CONCERN_COMMENTS : "authors"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ AUDIT_LOG : "performs action"
    USERS }o..|| EMAIL_VERIFICATIONS : "verifies email via"
    BARANGAYS ||..o{ USERS : "resides in (by name)"
    BARANGAYS ||..o{ CONCERNS : "located in (user/incident barangay)"
    CONCERNS ||--o{ CONCERN_COMMENTS : "contains thread"
    CONCERNS ||--o{ NOTIFICATIONS : "triggers alert"
    CONCERNS ||--o{ CONCERN_LINKS : "source concern"
    CONCERNS ||--o{ CONCERN_LINKS : "target concern"
    CONCERNS ||..o{ AUDIT_LOG : "tracked by (entity_id)"
    FILE_STORAGE ||..o{ USERS : "stores id_image_url / avatar_url"
    FILE_STORAGE ||..o{ CONCERNS : "stores image_url / resolved_image_url"
```

---

### 1.2 Database Relationships & Cardinality Summary

| Parent Entity | Child Entity | Cardinality | Foreign Key / Join Column | Referential Action |
|---------------|--------------|-------------|---------------------------|--------------------|
| `users` | `admin_2fa_codes` | `1 : 0..1` | `admin_2fa_codes.user_id -> users.id` | `ON DELETE CASCADE` |
| `users` | `concerns` | `1 : N` | `concerns.user_id -> users.id` | `ON DELETE SET NULL` |
| `users` | `concern_comments` | `1 : N` | `concern_comments.user_id -> users.id` | `ON DELETE CASCADE` |
| `users` | `notifications` | `1 : N` | `notifications.user_id -> users.id` | `ON DELETE CASCADE` |
| `users` | `audit_log` | `1 : N` | `audit_log.changed_by -> users.id` | `ON DELETE SET NULL` |
| `concerns` | `concern_comments` | `1 : N` | `concern_comments.concern_id -> concerns.id` | `ON DELETE CASCADE` |
| `concerns` | `notifications` | `1 : N` | `notifications.concern_id -> concerns.id` | `ON DELETE CASCADE` |
| `concerns` | `concern_links` (Source) | `1 : N` | `concern_links.source_concern_id -> concerns.id` | `ON DELETE CASCADE` |
| `concerns` | `concern_links` (Target) | `1 : N` | `concern_links.target_concern_id -> concerns.id` | `ON DELETE CASCADE` |
| `barangays` | `users` / `concerns` | `1 : N` (Logical) | `barangays.name = users.barangay / concerns.incident_barangay` | Logical Reference |
| `file_storage` | `users` / `concerns` | `1 : 1` (Logical) | `file_storage.filename` referenced in media URLs | Persistent Binary Store |

---

### 1.3 Table & Entity Dictionary

1. **`users`**: Stores both `citizen` and `admin` accounts, profile fields (`phone`, `barangay`, `address`), live-captured government ID metadata (`id_type`, `id_number`, `id_image_url`), verification state (`unverified`, `pending`, `verified`, `rejected`), and Expo push token (`fcm_token`).
2. **`admin_2fa_codes`**: Holds the active bcrypt-hashed 6-digit OTP and 10-minute expiration timestamp required for Administrator Two-Factor Authentication.
3. **`email_verifications`**: Tracks pre-registration 6-digit OTP codes sent to citizen `@gmail.com` addresses prior to account creation.
4. **`barangays`**: Master list of the **32 barangays** of Kabankalan City used for resident assignment and GPS centroid matching.
5. **`concerns`**: Core civic incident table storing the report title, description, AI/citizen category, priority (`Low`, `Medium`, `High`), lifecycle status (`Pending`, `In Progress`, `Resolved`, `Rejected`), GPS coordinates (`location_lat`, `location_lng`), resident barangay vs. pinned `incident_barangay`, camera photo evidence, and official `admin_note`.
6. **`concern_links`**: Self-referencing join table linking newly submitted concerns to existing concerns as either `duplicate` (active tickets) or `related` (previously resolved tickets) with a `similarity_score`.
7. **`concern_comments`**: Stores the real-time two-way conversation messages between the reporting citizen and city administrators for each concern.
8. **`notifications`**: Stores citizen in-app notifications (status updates, admin replies, priority escalations, ID verification results) with `is_read` tracking.
9. **`audit_log`**: Immutable JSON-backed ledger recording every administrative status change, priority adjustment, and identity verification decision.
10. **`file_storage`**: Stores binary image blobs (`LONGBLOB`) alongside local disk storage so uploaded ID photos, avatars, and concern images survive ephemeral container restarts.

---

## 🔄 2. Data Flow Diagrams (DFD)

### 2.1 DFD Symbol Legend

| Component | Representation in Diagrams | Description |
|-----------|----------------------------|-------------|
| **External Entity** | `["👤 Citizen"]` / `["🛡️ Administrator"]` | Actors or third-party services outside the core backend boundary |
| **Process** | `(["1.0 Process Name"])` | Transformation, validation, AI inference, or business logic |
| **Data Store** | `[("D1: Table Name")]` | Persistent MySQL database table or local offline storage |
| **Data Flow** | `-->|Data Payload|` | Directed movement of requests, events, or records |

---

### 2.2 DFD Level 0 — Context Diagram

The **Context Diagram (Level 0)** illustrates **CitiVoice** as a single unified system interacting with its external actors and third-party cloud services.

```mermaid
flowchart LR
    Citizen["👤 Citizen (Mobile App & Public Web)"]
    Admin["🛡️ City Administrator (Admin Web Console)"]
    Groq["🤖 Groq AI Engine (Llama 3.3 & Vision)"]
    MailPush["📨 Email SMTP & Expo Push Service"]
    Google["🔐 Google OAuth 2.0"]

    System(["0.0 CitiVoice Municipal Civic Reporting Platform"])

    %% Citizen Flows
    Citizen -->|"Registration, Google/OTP Auth, Live Camera ID Photo"| System
    Citizen -->|"Incident Report (Camera Photo, GPS Coords, Description)"| System
    Citizen -->|"Concern Comments & Profile Updates"| System
    System -->|"Verification Status, Municipal Docket Receipt, Live Alerts"| Citizen
    System -->|"APK Download, QR Code & Offline Cache Sync"| Citizen

    %% Admin Flows
    Admin -->|"Credentials + 6-Digit 2FA OTP"| System
    Admin -->|"Status Updates, Resolution Photo/Note, ID Decisions"| System
    Admin -->|"GIS Filter Queries, Print Ledger & Backup Triggers"| System
    System -->|"Real-Time Dashboards, GIS Heatmaps, OCR Comparisons"| Admin
    System -->|"Official 2-Page Landscape Print Reports & SQL/JSON Dumps"| Admin

    %% External Service Flows
    System -->|"Incident Text, Concern Photo, Government ID Photo"| Groq
    Groq -->|"Category/Priority Triage, Image Alignment, ID OCR Match"| System

    System -->|"OTP Codes, 2FA Challenges, Status & Push Payloads"| MailPush
    MailPush -->|"Email Delivery & Native Push Alerts"| Citizen
    MailPush -->|"Admin 2FA OTP Email"| Admin

    Citizen <-->|"OAuth 2.0 Consent & ID Token"| Google
    Google -->|"Verified Gmail Identity"| System
```

---

### 2.3 DFD Level 1 — System Overview Diagram

**DFD Level 1** decomposes the platform into its **6 primary functional processes** and shows how data moves across the **MySQL Data Stores (`D1`–`D7`)**.

```mermaid
flowchart TB
    %% External Entities
    Citizen["👤 Citizen"]
    Admin["🛡️ Administrator"]
    Groq["🤖 Groq AI & Vision"]
    MailPush["📨 SMTP & Expo Push"]

    %% Core Processes
    P1(["1.0 Authentication, 2FA & Camera ID Verification"])
    P2(["2.0 Concern Intake, AI Triage & Duplicate Engine"])
    P3(["3.0 Incident Resolution & Two-Way Live Chat"])
    P4(["4.0 GIS Spatial Analytics & Official Print Reporting"])
    P5(["5.0 Priority Escalation & Notification Dispatch"])
    P6(["6.0 Automated & On-Demand Database Backup"])

    %% Data Stores
    D1[("D1: users / admin_2fa / email_verifications")]
    D2[("D2: concerns & concern_links")]
    D3[("D3: concern_comments")]
    D4[("D4: notifications")]
    D5[("D5: audit_log")]
    D6[("D6: barangays")]
    D7[("D7: file_storage")]

    %% Process 1 Flows
    Citizen -->|"Sign Up, OTP/Google Token, Live ID Photo"| P1
    Admin -->|"Login & 2FA OTP"| P1
    P1 <-->|"OCR Name Match Check"| Groq
    P1 -->|"Send OTP / 2FA Email"| MailPush
    P1 <-->|"Read/Write User & Auth Records"| D1
    P1 -->|"Store ID & Avatar Binary"| D7
    P1 -->|"Log ID Verification Action"| D5

    %% Process 2 Flows
    Citizen -->|"Submit Concern (Camera Photo + GPS Pin)"| P2
    P2 <-->|"Analyze Text, Verify Image & Similarity"| Groq
    P2 <-->|"Match Nearest of 32 Barangays"| D6
    P2 -->|"Store Incident Photo"| D7
    P2 <-->|"Save Concern & Link Duplicates"| D2
    P2 -->|"Return Municipal Docket Receipt"| Citizen

    %% Process 3 Flows
    Admin -->|"Update Status, Admin Note, Resolution Photo, AI Reply"| P3
    Citizen <-->|"Post & Read Live Comments"| P3
    Admin <-->|"Post & Read Admin Replies"| P3
    P3 <-->|"Generate AI Draft Response"| Groq
    P3 <-->|"Update Concern Status & Notes"| D2
    P3 <-->|"Read/Write Comment Thread"| D3
    P3 -->|"Record Status & Resolution Audit"| D5
    P3 -->|"Trigger Status/Reply Alert"| P5

    %% Process 4 Flows
    Admin -->|"Filter GIS Map, KPIs & Print Ledger"| P4
    D2 -->|"Concern Coordinates & Status Metrics"| P4
    D6 -->|"Barangay Boundaries & Centroids"| P4
    P4 -->|"Heatmaps, Clusters & Official Print Report"| Admin

    %% Process 5 Flows
    D2 -->|"Check Open Concerns (>3d / >7d)"| P5
    P5 -->|"Escalate Priority (Low->Med->High)"| D2
    P5 -->|"Save In-App Notification"| D4
    D4 -->|"Sync Cached Notifications"| Citizen
    P5 -->|"Dispatch Push & Email Alert"| MailPush

    %% Process 6 Flows
    Admin -->|"Trigger Dump / JSON Export / Restore"| P6
    D1 & D2 & D3 & D4 & D5 & D6 -->|"Read Schema & Table Rows"| P6
    P6 -->|"SQL Snapshot / JSON Archive / OneDrive Sync"| Admin
```

---

### 2.4 DFD Level 2.1 — Citizen Registration & Camera-Only ID Verification

This diagram details **Process 1.0**, showing how citizens verify their Gmail, register an account, and complete **Camera-Only Government ID Verification** with AI OCR auto-verification and manual admin fallback.

```mermaid
flowchart TD
    Citizen["👤 Citizen (Mobile App)"]
    Admin["🛡️ Administrator"]
    Google["🔐 Google OAuth"]
    GroqOCR["🤖 Groq Vision OCR"]
    SMTP["📧 Nodemailer SMTP"]

    P1_1(["1.1 Pre-Verify Email (OTP or Google OAuth)"])
    P1_2(["1.2 Create Citizen Account"])
    P1_3(["1.3 Capture Live ID Photo & Format-Validate ID Number"])
    P1_4(["1.4 AI OCR Name Matching & Auto-Verification"])
    P1_5(["1.5 Manual Admin ID Review (Approve / Reject / Revoke)"])

    D_Email[("D1a: email_verifications")]
    D_Users[("D1b: users")]
    D_Files[("D7: file_storage")]
    D_Audit[("D5: audit_log")]
    D_Notif[("D4: notifications")]

    Citizen -->|"Enter @gmail.com or Tap Google Sign-In"| P1_1
    P1_1 <-->|"Verify ID Token"| Google
    P1_1 -->|"Send 6-Digit OTP"| SMTP
    P1_1 <-->|"Save & Verify OTP Hash"| D_Email
    P1_1 -->|"Issue verificationToken"| P1_2

    Citizen -->|"Name, Password, Phone, Barangay + verificationToken"| P1_2
    P1_2 -->|"Insert Unverified Citizen"| D_Users

    Citizen -->|"Select ID Type, Formatted ID No., Live Camera Photo"| P1_3
    P1_3 -->|"Persist ID Image Blob"| D_Files
    P1_3 -->|"Pass ID Image & Citizen Name"| P1_4

    P1_4 <-->|"Extract Printed Name & Confidence"| GroqOCR
    P1_4 -->|" >= 80% Name Match: Set status = verified "| D_Users
    P1_4 -->|" < 80% Match: Set status = pending "| D_Users

    D_Users -->|"Pending ID Queue"| P1_5
    Admin -->|"Approve / Reject with Reason"| P1_5
    P1_5 -->|"Update verification_status"| D_Users
    P1_5 -->|"Write Verification Audit Entry"| D_Audit
    P1_5 -->|"Send Rejection / Approval Notice"| D_Notif
```

---

### 2.5 DFD Level 2.2 — Concern Submission, Offline Queue & AI Triage

This diagram details **Process 2.0**, illustrating how the mobile app handles **Camera-Only Evidence Capture**, **Stale-While-Revalidate (SWR) Offline Queuing**, **AI Image-to-Text Alignment**, **32-Barangay Centroid Matching**, and **Status-Aware Duplicate Detection**.

```mermaid
flowchart TD
    Citizen["👤 Citizen (Mobile App)"]
    GroqAI["🤖 Groq Llama 3.3 & Vision"]
    Socket["⚡ Socket.io Server"]
    AdminUI["🛡️ Admin Live Dashboard"]

    P2_1(["2.1 Live Camera Capture & GPS Coordinate Pinning"])
    P2_2(["2.2 AI Visual Alignment & Draft Categorization"])
    P2_3(["2.3 Offline Detection & Local Queue Sync"])
    P2_4(["2.4 32-Barangay Centroid Distance Calculation"])
    P2_5(["2.5 Status-Aware Similarity & Duplicate Linking"])
    P2_6(["2.6 Persist Concern & Emit Municipal Docket"])

    D_Async[("Mobile AsyncStorage: offline_concerns_queue & SWR Cache")]
    D_Barangays[("D6: barangays")]
    D_Files[("D7: file_storage")]
    D_Concerns[("D2a: concerns")]
    D_Links[("D2b: concern_links")]

    Citizen -->|"Take Live Camera Photo + Pin Map Location"| P2_1
    P2_1 -->|"Photo + Title + Description"| P2_2
    P2_2 <-->|"Check Image-Text Match & Suggest Category/Priority"| GroqAI

    P2_2 -->|"Submit Report Payload"| P2_3
    P2_3 -->|"If Offline: Save to Queue"| D_Async
    D_Async -->|"When Online: Auto-Flush Queued Reports"| P2_4
    P2_3 -->|"If Online: Forward Payload"| P2_4

    P2_4 <-->|"Compare Lat/Lng to 32 Barangay Centroids"| D_Barangays
    P2_4 -->|"Assign incident_barangay"| P2_5

    P2_5 <-->|"Query Existing Concerns in Barangay/Category"| D_Concerns
    P2_5 -->|"Active Match: Link as duplicate & Sync In-Progress"| D_Links
    P2_5 -->|"Resolved Match: Link as related (Recurring)"| D_Links

    P2_5 -->|"Validated Concern Data"| P2_6
    P2_6 -->|"Store Photo Binary"| D_Files
    P2_6 -->|"Insert Concern Record"| D_Concerns
    P2_6 -->|"Update Local SWR Cache (cv_my_concerns)"| D_Async
    P2_6 -->|"Broadcast new_concern Event"| Socket
    Socket -->|"Instant Table & Map Update"| AdminUI
    P2_6 -->|"Return Official Municipal Docket Receipt"| Citizen
```

---

### 2.6 DFD Level 2.3 — Admin 2FA, Incident Resolution, Live Chat & Reporting

This diagram details **Processes 3.0 & 4.0**, covering **Administrator 2FA Sign-In**, **Incident Status Updates**, **AI-Assisted Replies**, **Real-Time Citizen-Admin Comments**, and **Official Landscape Print Reports**.

```mermaid
flowchart TD
    Admin["🛡️ Administrator"]
    Citizen["👤 Citizen"]
    Groq["🤖 Groq Llama 3.3"]
    Socket["⚡ Socket.io & Expo Push"]

    P3_1(["3.1 Admin Login & 6-Digit Email 2FA Verification"])
    P3_2(["3.2 Review Concern, Generate AI Draft & Update Status"])
    P3_3(["3.3 Two-Way Live Comment Thread"])
    P3_4(["3.4 Immutable Audit Trail Recording"])
    P4_1(["4.1 GIS Heatmap Aggregation & Official Print Ledger"])

    D_2FA[("D1c: admin_2fa_codes")]
    D_Concerns[("D2: concerns")]
    D_Comments[("D3: concern_comments")]
    D_Notif[("D4: notifications")]
    D_Audit[("D5: audit_log")]

    Admin -->|"Email + Password"| P3_1
    P3_1 <-->|"Store & Verify 6-Digit OTP Hash"| D_2FA
    P3_1 -->|"Issue Admin JWT"| Admin

    Admin -->|"Select Concern, Upload Proof Photo, Set Status/Note"| P3_2
    P3_2 <-->|"Request Official AI Draft Reply"| Groq
    P3_2 -->|"Update status, priority, admin_note, resolved_image_url"| D_Concerns
    P3_2 -->|"Old vs New JSON State"| P3_4
    P3_4 -->|"Insert Audit Record"| D_Audit

    Admin -->|"Post Admin Reply"| P3_3
    Citizen -->|"Post Citizen Comment"| P3_3
    P3_3 <-->|"Save & Fetch Thread"| D_Comments

    P3_2 & P3_3 -->|"Create Notification Record"| D_Notif
    P3_2 & P3_3 -->|"Emit status_updated / new_comment"| Socket
    Socket -->|"Real-Time Mobile & Web Update"| Citizen
    Socket -->|"Real-Time Thread Update"| Admin

    D_Concerns -->|"Aggregate by Barangay, Status, Date & Coordinates"| P4_1
    P4_1 -->|"Interactive Leaflet GIS Clusters & Heatmaps"| Admin
    P4_1 -->|"2-Page Landscape Municipal Print Report"| Admin
```

---

### 2.7 Data Store Dictionary

| Data Store ID | Physical Implementation | Contents & Purpose |
|---------------|-------------------------|--------------------|
| **`D1`** | MySQL: `users`, `admin_2fa_codes`, `email_verifications` | Citizen and administrator profiles, credentials, 2FA OTP hashes, pre-registration OTP states, and ID verification statuses. |
| **`D2`** | MySQL: `concerns`, `concern_links` | Reported civic incidents, GPS coordinates, matched barangays, status/priority states, resolution notes, and AI duplicate/related links. |
| **`D3`** | MySQL: `concern_comments` | Chronological two-way messages and image attachments between citizens and administrators. |
| **`D4`** | MySQL: `notifications` | In-app notification records linked to users and concerns with read/unread state tracking. |
| **`D5`** | MySQL: `audit_log` | Immutable JSON change history (`old_value`, `new_value`, `changed_by`) for administrative accountability. |
| **`D6`** | MySQL: `barangays` | Reference table of the 32 official barangays of Kabankalan City. |
| **`D7`** | MySQL: `file_storage` + Disk `/uploads` | Hybrid binary image storage for live camera ID photos, concern photos, resolution proof photos, and avatars. |
| **`Mobile Cache`** | Mobile `AsyncStorage` | Offline-first Stale-While-Revalidate cache (`cv_user`, `cv_my_concerns_*`, `cv_concern_detail_*`, `cv_notifications_*`, `offline_concerns_queue`). |

