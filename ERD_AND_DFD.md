# 📊 CitiVoice — Entity-Relationship Diagram (ERD) & Data Flow Diagrams (DFD)

This document provides the complete database **Entity-Relationship Diagram (ERD)** and multi-level **Data Flow Diagrams (DFD Level 0, Level 1, Level 2.1, 2.2, 2.3, and 2.4)** for the **CitiVoice** municipal civic reporting platform (**City of Kabankalan, Negros Occidental**).

---

## 📑 Table of Contents

1. [Entity-Relationship Diagram (ERD)](#-1-entity-relationship-diagram-erd)
   - [1.1 Visual Mermaid ERD](#11-visual-mermaid-erd)
   - [1.2 Database Relationships & Cardinality Summary](#12-database-relationships--cardinality-summary)
   - [1.3 Table & Entity Dictionary](#13-table--entity-dictionary)
2. [Data Flow Diagrams (DFD)](#-2-data-flow-diagrams-dfd)
   - [2.1 DFD Symbol Legend](#21-dfd-symbol-legend)
   - [2.2 DFD Level 0 — Context Diagram](#22-dfd-level-0--context-diagram)
   - [2.3 DFD Level 1 — System Overview Diagram](#23-dfd-level-1--system-overview-diagram)
   - [2.4 DFD Level 2.1 — Citizen Registration & Camera-Only ID Verification](#24-dfd-level-21--citizen-registration--camera-only-id-verification)
   - [2.5 DFD Level 2.2 — Concern Intake, Dual-AI Failover Triage & Duplicate Linking](#25-dfd-level-22--concern-intake-dual-ai-failover-triage--duplicate-linking)
   - [2.6 DFD Level 2.3 — Admin 2FA, Resolution Lifecycle & Rejection Workflow](#26-dfd-level-23--admin-2fa-resolution-lifecycle--rejection-workflow)
   - [2.7 DFD Level 2.4 — Citizen Concern Editing & Version History Tracking](#27-dfd-level-24--citizen-concern-editing--version-history-tracking)
   - [2.8 Data Store Dictionary](#28-data-store-dictionary)

---

## 🗄️ 1. Entity-Relationship Diagram (ERD)

### 1.1 Visual Mermaid ERD

The schema below reflects all **11 production InnoDB tables** defined in [`backend/database/schema.sql`](backend/database/schema.sql) and synchronized via [`backend/database/autoMigrate.js`](backend/database/autoMigrate.js).

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
        tinyint is_super_admin "0 | 1 (Primary Admin)"
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
        text resolved_image_url "NULL (Resolution Proof; NULL if Rejected)"
        text location_address "NULL"
        decimal location_lat "DECIMAL(10,7)"
        decimal location_lng "DECIMAL(10,7)"
        int user_id FK "REFERENCES users(id) ON DELETE SET NULL"
        varchar user_name "Citizen Name Snapshot"
        varchar user_barangay "Citizen Home Barangay"
        varchar incident_barangay "GPS-Matched Incident Barangay"
        text admin_note "Official Resolution / Rejection Note"
        datetime admin_viewed_at "NULL"
        int edit_count "DEFAULT 0"
        datetime last_edited_at "NULL"
        tinyint is_validated "DEFAULT 0"
        datetime validated_at "NULL"
        varchar validated_by_name "NULL"
        datetime created_at "DEFAULT CURRENT_TIMESTAMP"
        datetime updated_at "ON UPDATE CURRENT_TIMESTAMP"
    }

    CONCERN_EDIT_HISTORY {
        int id PK "AUTO_INCREMENT"
        int concern_id FK "REFERENCES concerns(id) ON DELETE CASCADE"
        int edited_by FK "REFERENCES users(id) ON DELETE CASCADE"
        varchar edited_by_name "Citizen / Admin Name Snapshot"
        varchar edited_by_role "citizen | admin"
        varchar old_title "Previous Title"
        varchar new_title "Updated Title"
        text old_description "Previous Description"
        text new_description "Updated Description"
        varchar old_category "Previous Category"
        varchar new_category "Updated Category"
        text old_location_address "Previous Address"
        text new_location_address "Updated Address"
        text old_image_url "Previous Photo URL"
        text new_image_url "Updated Photo URL"
        text change_summary "Human-readable changes summary"
        datetime created_at "DEFAULT CURRENT_TIMESTAMP"
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
        varchar image_url "NULL (Optional Attachment)"
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
        varchar action "status_change | citizen_edit | verify | etc."
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
    USERS ||--o{ CONCERN_EDIT_HISTORY : "performs edit"
    USERS ||--o{ CONCERN_COMMENTS : "authors"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ AUDIT_LOG : "performs action"
    USERS }o..|| EMAIL_VERIFICATIONS : "verifies email via"
    BARANGAYS ||..o{ USERS : "resides in (by name)"
    BARANGAYS ||..o{ CONCERNS : "located in (user/incident barangay)"
    CONCERNS ||--o{ CONCERN_EDIT_HISTORY : "versioned in"
    CONCERNS ||--o{ CONCERN_COMMENTS : "contains thread"
    CONCERNS ||--o{ NOTIFICATIONS : "triggers alert"
    CONCERNS ||--o{ CONCERN_LINKS : "source concern"
    CONCERNS ||--o{ CONCERN_LINKS : "target concern"
    CONCERNS ||..o{ AUDIT_LOG : "tracked by (entity_id)"
    FILE_STORAGE ||..o{ USERS : "stores id_image_url / avatar_url"
    FILE_STORAGE ||..o{ CONCERNS : "stores image_url / resolved_image_url"
    FILE_STORAGE ||..o{ CONCERN_EDIT_HISTORY : "stores old/new image blobs"
```

---

### 1.2 Database Relationships & Cardinality Summary

| Parent Entity | Child Entity | Cardinality | Foreign Key / Join Column | Referential Action |
|---------------|--------------|-------------|---------------------------|--------------------|
| `users` | `admin_2fa_codes` | `1 : 0..1` | `admin_2fa_codes.user_id -> users.id` | `ON DELETE CASCADE` |
| `users` | `concerns` | `1 : N` | `concerns.user_id -> users.id` | `ON DELETE SET NULL` |
| `users` | `concern_edit_history` | `1 : N` | `concern_edit_history.edited_by -> users.id` | `ON DELETE CASCADE` |
| `users` | `concern_comments` | `1 : N` | `concern_comments.user_id -> users.id` | `ON DELETE CASCADE` |
| `users` | `notifications` | `1 : N` | `notifications.user_id -> users.id` | `ON DELETE CASCADE` |
| `users` | `audit_log` | `1 : N` | `audit_log.changed_by -> users.id` | `ON DELETE SET NULL` |
| `concerns` | `concern_edit_history` | `1 : N` | `concern_edit_history.concern_id -> concerns.id` | `ON DELETE CASCADE` |
| `concerns` | `concern_comments` | `1 : N` | `concern_comments.concern_id -> concerns.id` | `ON DELETE CASCADE` |
| `concerns` | `notifications` | `1 : N` | `notifications.concern_id -> concerns.id` | `ON DELETE CASCADE` |
| `concerns` | `concern_links` (Source) | `1 : N` | `concern_links.source_concern_id -> concerns.id` | `ON DELETE CASCADE` |
| `concerns` | `concern_links` (Target) | `1 : N` | `concern_links.target_concern_id -> concerns.id` | `ON DELETE CASCADE` |
| `barangays` | `users` / `concerns` | `1 : N` (Logical) | `barangays.name = users.barangay / concerns.incident_barangay` | Logical Reference |
| `file_storage` | `users` / `concerns` / `edit_history` | `1 : 1` (Logical) | `file_storage.filename` referenced in media URLs | Persistent Binary Store |

---

### 1.3 Table & Entity Dictionary

1. **`users`**: Stores `citizen` and `admin` accounts, contact details, assigned home barangay, street/purok address, `is_super_admin` flag, password reset OTP hashes, live-captured government ID metadata, verification states (`unverified`, `pending`, `verified`, `rejected`), and Expo push token (`fcm_token`).
2. **`admin_2fa_codes`**: Holds active bcrypt-hashed 6-digit OTP codes and 10-minute expiration timestamps required for Administrator Two-Factor Authentication.
3. **`email_verifications`**: Tracks pre-registration 6-digit OTP codes sent to citizen `@gmail.com` addresses prior to account creation.
4. **`barangays`**: Master reference list of the **32 official barangays** of Kabankalan City for resident assignment and geographic GPS centroid distance matching.
5. **`concerns`**: Core civic incident table storing report title, description, category, priority (`Low`, `Medium`, `High`), lifecycle status (`Pending`, `In Progress`, `Resolved`, `Rejected`), GPS coordinates (`location_lat`, `location_lng`), citizen barangay vs. nearest pinned `incident_barangay`, camera evidence (`image_url`), resolution proof (`resolved_image_url`, automatically cleared if `Rejected`), official `admin_note`, `edit_count`, and `last_edited_at`.
6. **`concern_edit_history`**: Comprehensive version history tracking citizen modifications to concerns prior to resolution (records previous/new title, description, category, address, photo, and audit timestamps).
7. **`concern_links`**: Self-referencing join table linking duplicate and recurring reports with a `similarity_score` (`duplicate` for active tickets, `related` for resolved incidents).
8. **`concern_comments`**: Stores real-time two-way conversation messages and optional image attachments between the reporting citizen and municipal administrators.
9. **`notifications`**: Stores citizen in-app notification records (status updates, admin replies, priority escalations, ID verification results) with read/unread tracking.
10. **`audit_log`**: Immutable JSON-backed ledger recording every administrative status transition, citizen edit, priority escalation, and ID verification decision.
11. **`file_storage`**: Stores binary image payloads (`LONGBLOB`) alongside disk storage, ensuring uploaded ID photos, avatars, and concern images persist across ephemeral cloud container restarts.

---

## 🔄 2. Data Flow Diagrams (DFD)

### 2.1 DFD Symbol Legend

| Component | Representation in Diagrams | Description |
|-----------|----------------------------|-------------|
| **External Entity** | `["👤 Citizen"]` / `["🛡️ Administrator"]` | Actors or external third-party cloud services |
| **Process** | `(["1.0 Process Name"])` | Transformation, validation, AI triage, or business logic |
| **Data Store** | `[("D1: Table Name")]` | Persistent MySQL database table or local offline cache |
| **Data Flow** | `-->|Data Payload|` | Directed movement of requests, events, or database records |

---

### 2.2 DFD Level 0 — Context Diagram

The **Context Diagram (Level 0)** represents **CitiVoice** as a unified system interacting with citizens, city administrators, and external AI/cloud services, featuring automatic AI failover between **Groq** and **Google Gemini**.

```mermaid
flowchart LR
    Citizen["👤 Citizen (Mobile App & Public Web)"]
    Admin["🛡️ City Administrator (Admin Web Console)"]
    AI["🤖 Dual AI Engine (Groq Llama 3.3 + Gemini Flash Fallback)"]
    MailPush["📨 Email SMTP & Expo Push Service"]
    Google["🔐 Google OAuth 2.0"]

    System(["0.0 CitiVoice Municipal Civic Reporting Platform"])

    %% Citizen Flows
    Citizen -->|"Registration, Google/OTP Auth, Live Camera ID"| System
    Citizen -->|"Submit Concern (Photo + GPS Pin) & Edit Details"| System
    Citizen -->|"Concern Comments & Profile Updates"| System
    System -->|"Verification Status, Docket Receipt, Live Alerts, Rejection Reason"| Citizen
    System -->|"APK Download, QR Code & Offline SWR Sync"| Citizen

    %% Admin Flows
    Admin -->|"Credentials + 6-Digit 2FA OTP"| System
    Admin -->|"Set Status (Progress, Resolved, Valid Rejection Reason)"| System
    Admin -->|"GIS Filters, Print Reports & Backup Triggers"| System
    System -->|"Real-Time Dashboards, GIS Heatmaps, OCR Comparisons"| Admin
    System -->|"Official Print Reports & SQL/JSON Backups"| Admin

    %% AI Failover Engine Flows
    System -->|"Text Context, Live Photo, Government ID Image"| AI
    AI -->|"Triage, Strict Image-Text Alignment, ID OCR Match"| System

    %% External Service Flows
    System -->|"OTP Codes, 2FA Challenges, Status & Push Payloads"| MailPush
    MailPush -->|"Email Delivery & Push Alerts"| Citizen
    MailPush -->|"Admin 2FA OTP Email"| Admin

    Citizen <-->|"OAuth 2.0 Consent & ID Token"| Google
    Google -->|"Verified Gmail Identity"| System
```

---

### 2.3 DFD Level 1 — System Overview Diagram

**DFD Level 1** decomposes the platform into its **7 primary functional processes** across **8 MySQL Data Stores (`D1`–`D8`)**.

```mermaid
flowchart TB
    %% External Entities
    Citizen["👤 Citizen"]
    Admin["🛡️ Administrator"]
    AI["🤖 Groq + Gemini Failover AI"]
    MailPush["📨 SMTP & Expo Push"]

    %% Core Processes
    P1(["1.0 Authentication, 2FA & Camera ID Verification"])
    P2(["2.0 Concern Intake, Dual-AI Triage & Duplicate Linking"])
    P3(["3.0 Incident Resolution & Rejection Management"])
    P4(["4.0 Citizen Concern Editing & Version History"])
    P5(["5.0 Two-Way Live Chat & Comment Thread"])
    P6(["6.0 GIS Spatial Analytics & Official Print Reports"])
    P7(["7.0 Priority Escalation, Alerts & Database Backups"])

    %% Data Stores
    D1[("D1: users / admin_2fa / email_verifications")]
    D2[("D2: concerns & concern_links")]
    D3[("D3: concern_comments")]
    D4[("D4: notifications")]
    D5[("D5: audit_log")]
    D6[("D6: barangays")]
    D7[("D7: file_storage")]
    D8[("D8: concern_edit_history")]

    %% Process 1 Flows
    Citizen -->|"Sign Up, OTP / Google Token, Live ID Photo"| P1
    Admin -->|"Login & 2FA OTP"| P1
    P1 <-->|"OCR Name Match Check"| AI
    P1 -->|"Send OTP / 2FA Email"| MailPush
    P1 <-->|"Read/Write User & Auth Records"| D1
    P1 -->|"Store ID & Avatar Binary"| D7
    P1 -->|"Log ID Decision"| D5

    %% Process 2 Flows
    Citizen -->|"Submit Concern (Live Photo + GPS Pin)"| P2
    P2 <-->|"Strict Visual Alignment & Category Triage"| AI
    P2 <-->|"Match Nearest of 32 Barangays"| D6
    P2 -->|"Store Incident Photo"| D7
    P2 <-->|"Save Concern & Link Duplicates"| D2
    P2 -->|"Return Municipal Docket Receipt"| Citizen

    %% Process 3 Flows
    Admin -->|"Select Status (In Progress, Resolved, Rejected)"| P3
    Admin -->|"Select Valid Rejection Reason or Proof Photo"| P3
    P3 <-->|"Auto-Draft Official Response (Progress / Resolved)"| AI
    P3 <-->|"Update Status, Admin Note & Clear Photo if Rejected"| D2
    P3 -->|"Record Status Transition Audit"| D5
    P3 -->|"Trigger Status Notification"| P7

    %% Process 4 Flows
    Citizen -->|"Edit Title, Description, Address or Photo"| P4
    P4 <-->|"Verify Edited Details against Photo"| AI
    P4 -->|"Store New Photo (if changed)"| D7
    P4 -->|"Update Concern (edit_count, last_edited_at)"| D2
    P4 -->|"Insert Version History Record"| D8
    P4 -->|"Record Edit Audit Entry"| D5

    %% Process 5 Flows
    Citizen & Admin <-->|"Post & Receive Live Comments"| P5
    P5 <-->|"Save & Fetch Thread"| D3
    P5 -->|"Trigger Comment Notification"| P7

    %% Process 6 Flows
    Admin -->|"Filter GIS Map, KPIs & Print Ledger"| P6
    D2 & D6 -->|"Coordinates, Barangays & Metrics"| P6
    P6 -->|"Heatmaps, Clusters & Official Print Report"| Admin

    %% Process 7 Flows
    D2 -->|"Hourly Check Open Reports (>3d / >7d)"| P7
    P7 -->|"Escalate Priority (Low->Med->High)"| D2
    P7 -->|"Save Notification"| D4
    D4 -->|"Deliver Notification & Push Alert"| MailPush
    D1 & D2 & D3 & D4 & D5 & D6 & D8 -->|"Execute Scheduled / Manual DB Dump"| P7
```

---

### 2.4 DFD Level 2.1 — Citizen Registration & Camera-Only ID Verification

```mermaid
flowchart TD
    Citizen["👤 Citizen (Mobile App)"]
    Admin["🛡️ Administrator"]
    Google["🔐 Google OAuth"]
    AI_OCR["🤖 Groq + Gemini Vision OCR"]
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

    P1_4 <-->|"Extract Printed Name (Groq -> Gemini Fallback)"| AI_OCR
    P1_4 -->|" >= 80% Match: Set status = verified "| D_Users
    P1_4 -->|" < 80% Match: Set status = pending "| D_Users

    D_Users -->|"Pending ID Queue"| P1_5
    Admin -->|"Approve / Reject with Reason"| P1_5
    P1_5 -->|"Update verification_status"| D_Users
    P1_5 -->|"Write Verification Audit Entry"| D_Audit
    P1_5 -->|"Send Rejection / Approval Notice"| D_Notif
```

---

### 2.5 DFD Level 2.2 — Concern Intake, Dual-AI Failover Triage & Duplicate Linking

```mermaid
flowchart TD
    Citizen["👤 Citizen (Mobile App)"]
    AI["🤖 Groq Vision (Primary) ➔ Gemini Vision (Backup)"]
    Socket["⚡ Socket.io Server"]
    AdminUI["🛡️ Admin Live Dashboard"]

    P2_1(["2.1 Live Camera Capture & GPS Coordinate Pinning"])
    P2_2(["2.2 Strict AI Visual Alignment & Category Triage"])
    P2_3(["2.3 Offline Detection & SWR Local Queue Sync"])
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
    P2_2 <-->|"Strict Concept Alignment (Groq -> Gemini Fallback)"| AI
    P2_2 -->|"If Mismatched / Inappropriate: Reject with Reason"| Citizen

    P2_2 -->|"If Valid: Forward Submission Payload"| P2_3
    P2_3 -->|"If Offline: Save to Queue"| D_Async
    D_Async -->|"When Online: Auto-Flush Queued Reports"| P2_4
    P2_3 -->|"If Online: Forward Payload"| P2_4

    P2_4 <-->|"Compare Lat/Lng to 32 Barangay Centroids"| D_Barangays
    P2_4 -->|"Assign incident_barangay"| P2_5

    P2_5 <-->|"Query Existing Concerns in Barangay & Category"| D_Concerns
    P2_5 -->|"Active Match: Link as duplicate & Sync In-Progress"| D_Links
    P2_5 -->|"Resolved Match: Link as related (Recurring)"| D_Links

    P2_5 -->|"Validated Concern Record"| P2_6
    P2_6 -->|"Store Photo Binary"| D_Files
    P2_6 -->|"Insert Concern Record"| D_Concerns
    P2_6 -->|"Update Local SWR Cache (cv_my_concerns)"| D_Async
    P2_6 -->|"Broadcast new_concern Event"| Socket
    Socket -->|"Instant Table & Map Update"| AdminUI
    P2_6 -->|"Return Official Municipal Docket Receipt"| Citizen
```

---

### 2.6 DFD Level 2.3 — Admin 2FA, Resolution Lifecycle & Rejection Workflow

```mermaid
flowchart TD
    Admin["🛡️ Administrator"]
    Citizen["👤 Citizen"]
    AI["🤖 Groq + Gemini AI"]
    Socket["⚡ Socket.io & Expo Push"]

    P3_1(["3.1 Admin Login & 6-Digit Email 2FA Verification"])
    P3_2(["3.2 Status Selection & Workflow Routing"])
    P3_3(["3.3 In Progress / Resolved: AI Draft & Proof Photo Upload"])
    P3_4(["3.4 Rejected: Strip Photo & Select Valid Municipal Reason"])
    P3_5(["3.5 Persist Status, Audit Trail & Real-Time Sync"])

    D_2FA[("D1c: admin_2fa_codes")]
    D_Concerns[("D2: concerns")]
    D_Audit[("D5: audit_log")]
    D_Notif[("D4: notifications")]

    Admin -->|"Email + Password"| P3_1
    P3_1 <-->|"Store & Verify 6-Digit OTP Hash"| D_2FA
    P3_1 -->|"Issue Admin JWT"| Admin

    Admin -->|"Select Concern & Choose Target Status"| P3_2

    %% Branch 1: In Progress / Resolved
    P3_2 -->|"If In Progress or Resolved"| P3_3
    P3_3 <-->|"Auto-Draft Tailored Official Response"| AI
    P3_3 -->|"Attach Proof of Work Photo (Optional / Required)"| P3_5

    %% Branch 2: Rejected
    P3_2 -->|"If Rejected"| P3_4
    P3_4 -->|"Hide & Strip Photo (resolved_image_url = null)"| P3_4
    P3_4 -->|"Select Valid Municipal Rejection Reason"| P3_5

    P3_5 -->|"Update status, admin_note, resolved_image_url"| D_Concerns
    P3_5 -->|"Insert Audit Log Record (old vs new state)"| D_Audit
    P3_5 -->|"Create Citizen Notification"| D_Notif
    P3_5 -->|"Emit status_updated Event"| Socket
    Socket -->|"Display Status or Rejection Alert Card"| Citizen
```

---

### 2.7 DFD Level 2.4 — Citizen Concern Editing & Version History Tracking

```mermaid
flowchart TD
    Citizen["👤 Citizen (Mobile App)"]
    Admin["🛡️ Administrator"]
    AI["🤖 Groq + Gemini Vision Verification"]
    Socket["⚡ Socket.io Server"]

    P4_1(["4.1 Validate Concern Status (Only Pending / In Progress Allowed)"])
    P4_2(["4.2 Strict Visual Alignment Check on Edited Content"])
    P4_3(["4.3 Record Edit Version Snapshot in History"])
    P4_4(["4.4 Update Concern Record & Increment Edit Counter"])
    P4_5(["4.5 Broadcast Update & Log Audit Entry"])

    D_Concerns[("D2: concerns")]
    D_History[("D8: concern_edit_history")]
    D_Audit[("D5: audit_log")]
    D_Files[("D7: file_storage")]

    Citizen -->|"Submit Edited Title, Description, Address or Photo"| P4_1
    P4_1 <-->|"Verify status is NOT Resolved or Rejected"| D_Concerns

    P4_1 -->|"Forward Changes for AI Inspection"| P4_2
    P4_2 <-->|"Check that Edited Text Still Matches Attached Photo"| AI
    P4_2 -->|"If Mismatched: Reject with Alignment Reason"| Citizen

    P4_2 -->|"If Valid: Store New Photo Blob (if changed)"| D_Files
    P4_2 -->|"Old vs New Field Values"| P4_3
    P4_3 -->|"Insert Row with change_summary"| D_History

    P4_3 -->|"Update Concern Fields (edit_count++, last_edited_at)"| P4_4
    P4_4 -->|"Save Changes"| D_Concerns

    P4_4 -->|"Write Audit Trail Entry"| D_Audit
    P4_4 -->|"Emit concern_updated Event"| Socket
    Socket -->|"Live Update on Admin Web Detail View"| Admin
    Socket -->|"Live Refresh on Citizen Mobile App"| Citizen
```

---

### 2.8 Data Store Dictionary

| Data Store ID | Physical Implementation | Contents & Purpose |
|---------------|-------------------------|--------------------|
| **`D1`** | MySQL: `users`, `admin_2fa_codes`, `email_verifications` | Citizen and administrator profiles, credentials, 2FA OTP hashes, pre-registration OTP states, and government ID verification records. |
| **`D2`** | MySQL: `concerns`, `concern_links` | Civic incident reports, GPS coordinates, 32-barangay matching, lifecycle status, resolution photos, edit counters, and AI duplicate links. |
| **`D3`** | MySQL: `concern_comments` | Chronological two-way live conversation messages and image attachments between citizens and administrators. |
| **`D4`** | MySQL: `notifications` | In-app notification records linked to citizens and concerns with read/unread tracking and push dispatch states. |
| **`D5`** | MySQL: `audit_log` | Immutable JSON-backed administrative change history (`old_value`, `new_value`, `changed_by`) for full institutional accountability. |
| **`D6`** | MySQL: `barangays` | Master reference table of the **32 official barangays** of Kabankalan City with centroid coordinates. |
| **`D7`** | MySQL: `file_storage` + Disk `/uploads` | Hybrid binary image store (`LONGBLOB`) ensuring ID photos, avatars, incident photos, and resolution proof survive cloud container restarts. |
| **`D8`** | MySQL: `concern_edit_history` | Dedicated version history tracking citizen modifications to concerns prior to resolution (old vs new title, description, address, and photo). |
| **`Mobile Cache`** | Mobile `AsyncStorage` | Offline-first Stale-While-Revalidate (SWR) cache (`cv_user`, `cv_my_concerns_*`, `cv_concern_detail_*`, `cv_notifications_*`, `offline_concerns_queue`). |
