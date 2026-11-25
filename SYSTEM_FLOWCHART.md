# 🧭 CitiVoice — System and Program Flowcharts
**Kabankalan City Citizen Engagement & Municipal Incident Management Platform**

---

## 📑 Document Structure & Navigation

This document is divided into two distinct engineering specifications adhering to standard Systems Analysis & Design (SAD) conventions:

1. [**PART I — SYSTEM FLOWCHARTS (High-Level Architecture & Physical Data Flow)**](#-part-i--system-flowcharts-architecture--physical-data-flow)
   - *Scope:* Broad overview of hardware, software components, external AI services, database stores, communication media, human actors, and physical outputs.
   - 1.1 [Master System Flowchart (End-to-End System Boundary)](#11-master-system-flowchart-end-to-end-system-boundary)
   - 1.2 [Citizen Mobile Subsystem & Offline Caching Flowchart](#12-citizen-mobile-subsystem--offline-caching-flowchart)
   - 1.3 [Admin Web Subsystem, 2FA & Notification Dispatch Flowchart](#13-admin-web-subsystem-2fa--notification-dispatch-flowchart)

2. [**PART II — PROGRAM FLOWCHARTS (Low-Level Algorithmic & Control Logic)**](#-part-ii--program-flowcharts-algorithmic--control-logic)
   - *Scope:* Narrow focus on specific routines, branching decisions, mathematical calculations, and step-by-step code instructions.
   - 2.1 [Standard ANSI/ISO Logic Symbol Guide](#21-standard-ansiiso-logic-symbol-guide)
   - 2.2 [Program 1: Citizen Registration & AI OCR ID Verification Algorithm](#22-program-1-citizen-registration--ai-ocr-id-verification-algorithm)
   - 2.3 [Program 2: Incident Intake & Dual-AI Visual Alignment Algorithm](#23-program-2-incident-intake--dual-ai-visual-alignment-algorithm)
   - 2.4 [Program 3: Spatial Haversine & Duplicate Hazard Detection Algorithm](#24-program-3-spatial-haversine--duplicate-hazard-detection-algorithm)
   - 2.5 [Program 4: Administrative Resolution & Standardized Rejection Algorithm](#25-program-4-administrative-resolution--standardized-rejection-algorithm)
   - 2.6 [Program 5: Citizen Concern Editing & Audit Snapshot Algorithm](#26-program-5-citizen-concern-editing--audit-snapshot-algorithm)

3. [**PART III — TRACEABILITY MATRIX**](#-part-iii--traceability-matrix)
   - Cross-references each physical system component to its specific algorithmic program flowchart.

---

# 🏛️ PART I — SYSTEM FLOWCHARTS (Architecture & Physical Data Flow)

> **Definition (System Flowchart):**  
> Depicts the **broad overview of the whole system** — tracking how data physically moves across **people (users), hardware devices, software modules, cloud microservices, communication protocols, persistent data stores, and generated outputs**.

---

### 1.1 Master System Flowchart (End-to-End System Boundary)

Illustrates the end-to-end physical data flow connecting the citizen's handheld device, network protocols, server controllers, external AI services, persistent relational storage, and administrator workstations.

```mermaid
flowchart TD
    %% Human Actors
    subgraph ACTORS ["👥 System Stakeholders"]
        CitizenUser["👤 Registered Citizen<br/>(Resident of Kabankalan)"]
        AdminUser["🛡️ Municipal Administrator<br/>(LGU Public Safety / CSWDO)"]
    end

    %% Hardware & Client Devices
    subgraph HARDWARE_LAYER ["📱 Hardware & Client Endpoints"]
        MobilePhone["Citizen Smartphone<br/>(Android / iOS Device)"]
        CameraHardware["Integrated Camera<br/>(Direct Hardware Access)"]
        GPSHardware["GPS Hardware Sensor<br/>(Latitude/Longitude)"]
        AdminWorkstation["City Hall Desktop Terminal<br/>(Web Browser / Chrome)"]
        
        MobilePhone --- CameraHardware
        MobilePhone --- GPSHardware
    end

    CitizenUser -->|Operates| MobilePhone
    AdminUser -->|Operates| AdminWorkstation

    %% Software Client Applications
    subgraph CLIENT_APPS ["💻 Software Client Applications"]
        MobileApp["CitiVoice Mobile Client<br/>(React Native 0.81 + Expo)"]
        AdminWeb["CitiVoice Admin Console<br/>(React 18 SPA + Vite/CRA)"]
    end

    MobilePhone -->|Runs| MobileApp
    AdminWorkstation -->|Accesses| AdminWeb

    %% Communication Channels & Protocols
    subgraph PROTOCOLS ["🌐 Transmission & Gateway Layer"]
        HTTPS_REST["Encrypted HTTPS REST API<br/>(JSON Payloads + JWT Tokens)"]
        WSS_SOCKET["WebSocket Channel<br/>(WSS / Socket.io v4 Engine)"]
    end

    MobileApp -->|HTTP Requests| HTTPS_REST
    MobileApp <-->|Real-Time Streams| WSS_SOCKET
    AdminWeb -->|Admin API Calls| HTTPS_REST
    AdminWeb <-->|Live Updates & Chimes| WSS_SOCKET

    %% Application Server & Backend Micro-Modules
    subgraph SERVER ["⚙️ CitiVoice Backend Application Server (Node.js & Express)"]
        AuthGateway["Auth & RBAC Middleware<br/>(bcrypt, JWT, 2FA OTP)"]
        ConcernModule["Concern Processing Engine<br/>(Validation, Centroid Matching)"]
        VerificationModule["Citizen Verification Module<br/>(Badge & Queue Manager)"]
        SocketServer["Real-Time Event Dispatcher<br/>(Socket.io Server)"]
    end

    HTTPS_REST --> AuthGateway
    HTTPS_REST --> ConcernModule
    HTTPS_REST --> VerificationModule
    WSS_SOCKET <--> SocketServer

    %% External Microservices & Cloud AI
    subgraph EXTERNAL_SERVICES ["☁️ External Cloud Microservices"]
        DualAIEngine["Dual-AI Vision Client<br/>• Primary: Groq Llama 3.3 70B<br/>• Fallback: Google Gemini 1.5 Flash"]
        SMTPService["SMTP Nodemailer Relay<br/>(Official City Gmail Gateway)"]
        FCMService["Firebase Cloud Messaging (FCM)<br/>(Push Notification Daemon)"]
    end

    ConcernModule <-->|Image Semantic Alignment| DualAIEngine
    VerificationModule <-->|ID OCR & Name Extraction| DualAIEngine
    AuthGateway -->|Send 2FA & OTP Codes| SMTPService
    ConcernModule -->|Trigger Push Alerts| FCMService

    %% Data Stores & Files
    subgraph DATA_STORES ["💾 Persistent Storage Media"]
        MySQL_DB[("MySQL 8.0 Relational DB<br/>• users, concerns, audit_log<br/>• concern_links, otp_codes")]
        MediaStorage[("Server File Storage<br/>(Local Storage / uploads/)")]
        DeviceStorage[("Device AsyncStorage<br/>(Offline Queue & Cache)")]
    end

    MobileApp <-->|Offline Caching| DeviceStorage
    ConcernModule -->|Read / Write| MySQL_DB
    VerificationModule -->|Read / Write| MySQL_DB
    AuthGateway -->|Read / Write| MySQL_DB
    ConcernModule -->|Persist Images| MediaStorage
    VerificationModule -->|Persist ID Photos| MediaStorage

    %% Output Documents & Displays
    subgraph OUTPUTS ["📄 Physical Outputs & UI Displays"]
        DocketOutput[/"Citizen Official Docket Receipt<br/>(Tracking Number + Timeline)"/]
        AdminHeatmap[/"GIS Incident Heatmap & Dashboard<br/>(Spatial Markers & KPI Cards)"/]
        ResolutionReport[/"Exported Municipal Reports<br/>(Excel .XLSX / PDF Records)"/]
    end

    MobileApp --> DocketOutput
    AdminWeb --> AdminHeatmap
    AdminWeb --> ResolutionReport
```

---

### 1.2 Citizen Mobile Subsystem & Offline Caching Flowchart

Shows the flow of data from mobile sensors, through offline SQLite/AsyncStorage storage, over HTTPS/WSS, to server-side controllers.

```mermaid
flowchart LR
    subgraph SENSORS ["Hardware Input"]
        Cam["Live Camera Sensor"]
        GPS["GPS Location Sensor"]
    end

    subgraph CLIENT ["Mobile App (React Native)"]
        UI_Form["Concern Report Form"]
        NetDetector["NetInfo Connection Monitor"]
        AsyncQueue[("Local Offline Queue<br/>AsyncStorage")]
    end

    subgraph NETWORK ["Network Transport"]
        REST["REST API POST<br/>/api/concerns"]
        SocketStream["Socket.io Listener"]
    end

    subgraph SERVER_STORAGE ["Backend & Database"]
        Controller["concerns.controller.js"]
        DB[("MySQL: concerns")]
        UploadFolder[("Disk: /uploads/concerns/")]
    end

    Cam --> UI_Form
    GPS --> UI_Form
    UI_Form --> NetDetector
    
    NetDetector -- "Device Offline" --> AsyncQueue
    AsyncQueue -.->|"On Network Reconnected"| NetDetector
    NetDetector -- "Device Online" --> REST
    
    REST --> Controller
    Controller --> DB
    Controller --> UploadFolder
    Controller --> SocketStream
```

---

### 1.3 Admin Web Subsystem, 2FA & Notification Dispatch Flowchart

Shows the data flow during administrative oversight, real-time sidebar badge synchronization, dual-factor authentication, and citizen notification fan-out.

```mermaid
flowchart LR
    subgraph ADMIN_CLIENT ["Admin Web Console (React SPA)"]
        BrowserUI["Web Browser (Chrome/Edge)"]
        SidebarBadge["Real-Time Sidebar Badge<br/>Pending Verification Counter"]
        DetailDrawer["Incident Resolution Panel"]
    end

    subgraph TRANSPORT ["Network"]
        AdminREST["HTTPS REST API<br/>Bearer Admin JWT"]
        AdminWSS["WebSocket Channels:<br/>• new_concern<br/>• verification_stats_updated"]
    end

    subgraph BACKEND_ENGINES ["Express Application Layer"]
        AuthEngine["2FA Mailer Service<br/>(Nodemailer)"]
        UsersCtrl["users.controller.js"]
        ConcernsCtrl["concerns.controller.js"]
        PushEngine["FCM Push Service"]
    end

    subgraph STORAGE_AUDIT ["Storage Layer"]
        MySQL_Main[("MySQL: users, concerns")]
        AuditLog[("MySQL: audit_log")]
    end

    BrowserUI -->|Login Request| AdminREST
    AdminREST --> AuthEngine
    AuthEngine -->|Deliver 6-Digit OTP| BrowserUI

    AdminWSS -->|Live Increment / Decrement| SidebarBadge
    BrowserUI -->|Approve/Reject User| AdminREST
    BrowserUI -->|Resolve/Reject Hazard| AdminREST

    AdminREST --> UsersCtrl
    AdminREST --> ConcernsCtrl

    UsersCtrl --> MySQL_Main
    UsersCtrl --> AuditLog
    ConcernsCtrl --> MySQL_Main
    ConcernsCtrl --> AuditLog

    UsersCtrl -->|Emit Event| AdminWSS
    ConcernsCtrl -->|Emit Event| AdminWSS
    ConcernsCtrl --> PushEngine
```

---

# ⚙️ PART II — PROGRAM FLOWCHARTS (Algorithmic & Control Logic)

> **Definition (Program Flowchart):**  
> Depicts the **narrow focus on a single program, script, or algorithm** — mapping out control flow, decision branches (`if/else`), arithmetic calculations, error handling loops, and sequential instructions using strict ANSI/ISO symbols.

---

### 2.1 Standard ANSI/ISO Logic Symbol Guide

| Symbol | Syntax | Standard Function |
| :---: | :---: | :--- |
| **Terminal** | `([Start / End])` | Indicates the start, end, or exit point of the program. |
| **Input / Output** | `[/Input or Output/]` | Data entered by the user (camera, keyboard) or output displayed to the screen. |
| **Process** | `[Instruction / Computation]` | Single code statement, assignment, database query, or computation. |
| **Decision** | `{"Conditional Check?"}` | Evaluates a Boolean condition with explicit `True / Yes` and `False / No` paths. |
| **Subroutine** | `[["Subroutine / Function Call"]]` | Reference to a separate named function or external client module. |
| **Database Transaction** | `[("SQL Transaction")]` | Read, insert, update, or delete transaction on a persistent table. |

---

### 2.2 Program 1: Citizen Registration & AI OCR ID Verification Algorithm

**Source Controller:** `backend/controllers/auth.controller.js` & `backend/controllers/users.controller.js`  
**Purpose:** Handles pre-registration validation, password hashing, anti-spoofing camera capture, and automated AI OCR name matching with manual admin fallback.

```mermaid
flowchart TD
    P1_Start(["Start: Citizen Registration"]) --> P1_InCreds[/"Input: Email, Password, Name, Phone, Barangay, Address"/]
    
    P1_InCreds --> P1_ValPass{"Password >= 8 chars with Upper, Lower, Digit, Special?"}
    P1_ValPass -- "No" --> P1_ErrPass[/"Display: Password Complexity Error"/]
    P1_ErrPass --> P1_InCreds
    
    P1_ValPass -- "Yes" --> P1_CheckDup{"Email, Phone, or Name Already in users Table?"}
    P1_CheckDup -- "Yes" --> P1_ErrDup[/"Display: Account Already Registered Error"/]
    P1_ErrDup --> P1_InCreds
    
    P1_CheckDup -- "No" --> P1_Hash["bcrypt.hash(password, 10)"]
    P1_Hash --> P1_SelectID[/"Input: Select ID Type & Input ID Number"/]
    
    P1_SelectID --> P1_LaunchCam[["Hardware Call: launchCamera (Gallery Blocked)"]]
    P1_LaunchCam --> P1_Snap[/"Input: Citizen Captures Real-Time Photo of ID"/]
    
    P1_Snap --> P1_TriggerOCR[["Call: aiClient.extractIdName(idImageBuffer)"]]
    P1_TriggerOCR --> P1_GroqLive{"Groq Vision API Healthy?"}
    P1_GroqLive -- "Yes" --> P1_RunGroq["Primary: Groq Llama 3.3 Vision OCR"]
    P1_GroqLive -- "No (Timeout/5xx)" --> P1_RunGemini["Failover: Google Gemini Flash Vision OCR"]
    
    P1_RunGroq --> P1_ComputeSimilarity["Compute Levenshtein Similarity(ExtractedName, RegisteredName)"]
    P1_RunGemini --> P1_ComputeSimilarity
    
    P1_ComputeSimilarity --> P1_EvalScore{"Match Score >= 80%?"}
    
    %% Automated Approval Branch
    P1_EvalScore -- "Yes (High Confidence)" --> P1_SetVerified["Set verification_status = 'verified', is_verified = 1"]
    P1_SetVerified --> P1_InsertUser1[("INSERT INTO users VALUES (...)")]
    P1_InsertUser1 --> P1_GenJWT1["Generate Session JWT Token"]
    P1_GenJWT1 --> P1_EmitStats1[["Socket.io: emit 'verification_stats_updated'"]]
    P1_EmitStats1 --> P1_NotifyUser1[/"Display: 'Account Instantly Verified!' & Redirect to Home"/]
    P1_NotifyUser1 --> P1_EndSuccess(["End: Registration Complete"])
    
    %% Manual Queue Fallback Branch
    P1_EvalScore -- "No (< 80% or Unclear)" --> P1_SetPending["Set verification_status = 'pending', is_verified = 0"]
    P1_SetPending --> P1_InsertUser2[("INSERT INTO users VALUES (...)")]
    P1_InsertUser2 --> P1_GenJWT2["Generate Session JWT Token"]
    P1_GenJWT2 --> P1_EmitStats2[["Socket.io: emit 'verification_stats_updated'"]]
    P1_EmitStats2 --> P1_NotifyUser2[/"Display: 'ID Submitted for Manual Review' Notice"/]
    P1_NotifyUser2 --> P1_AdminReview[/"Admin Console: Admin Compares ID Photo vs Registered Name"/]
    
    P1_AdminReview --> P1_AdminChoice{"Admin Decision?"}
    P1_AdminChoice -- "Approved" --> P1_ApproveUser[("UPDATE users SET verification_status='verified', is_verified=1")]
    P1_ApproveUser --> P1_EmitStats1
    
    P1_AdminChoice -- "Rejected" --> P1_PromptReason[/"Input: Admin Selects Rejection Reason"/]
    P1_PromptReason --> P1_RejectUser[("UPDATE users SET verification_status='rejected', rejection_reason=reason")]
    P1_RejectUser --> P1_EmitStats3[["Socket.io: emit 'verification_stats_updated'"]]
    P1_EmitStats3 --> P1_AlertRejection[/"Send Push Alert to Citizen: 'ID Verification Rejected'"/]
    P1_AlertRejection --> P1_EndRejected(["End: Awaiting New ID Submission"])
```

---

### 2.3 Program 2: Incident Intake & Dual-AI Visual Alignment Algorithm

**Source Controller:** `backend/controllers/concerns.controller.js` & `backend/services/aiClient.js`  
**Purpose:** Validates citizen photo evidence, checks semantic alignment against report description, calculates urgency score, and saves incident.

```mermaid
flowchart TD
    P2_Start(["Start: Concern Submission Routine"]) --> P2_CheckVerif{"User verification_status == 'verified'?"}
    
    P2_CheckVerif -- "No" --> P2_BlockSubmission[/"Display: 'Identity Verification Required to File Reports'"/]
    P2_BlockSubmission --> P2_EndBlocked(["End: Action Blocked"])
    
    P2_CheckVerif -- "Yes" --> P2_OpenCam[["Hardware: launchCamera (Anti-Spoofing Check)"]]
    P2_OpenCam --> P2_Capture[/"Input: Real-Time Incident Photo"/]
    P2_Capture --> P2_InText[/"Input: Report Title, Description & User Category"/]
    
    P2_InText --> P2_GetGPS[["Call: Expo Location API (Fetch GPS Coords)"]]
    P2_GetGPS --> P2_CheckNet{"NetInfo: Device Online?"}
    
    %% Offline Branch
    P2_CheckNet -- "No" --> P2_SaveQueue[("AsyncStorage: Append to offline_concerns_queue")]
    P2_SaveQueue --> P2_AlertQueue[/"Display: 'Saved to Local Queue. Will Upload When Online.'"/]
    P2_AlertQueue --> P2_EndQueue(["End: Queued Locally"])
    
    %% Online Branch
    P2_CheckNet -- "Yes" --> P2_CallVision[["Call: aiClient.alignImageWithConcept(photoBuffer, title, desc)"]]
    P2_CallVision --> P2_HealthGroq{"Groq API Available?"}
    P2_HealthGroq -- "Yes" --> P2_GroqEval["Evaluate: Groq Llama 3.3 Vision"]
    P2_HealthGroq -- "No" --> P2_GeminiEval["Failover: Google Gemini 1.5 Flash Vision"]
    
    P2_GroqEval --> P2_ResultParse["Parse JSON: { isAligned, confidence, category, urgency, reason }"]
    P2_GeminiEval --> P2_ResultParse
    
    P2_ResultParse --> P2_CheckAligned{"isAligned == true AND confidence >= 0.70?"}
    
    P2_CheckAligned -- "No (Mismatched/Selfie/Irrelevant)" --> P2_ShowMismatch[/"Display: 'Image Mismatch — Photo does not show reported civic hazard.'"/]
    P2_ShowMismatch --> P2_Capture
    
    P2_CheckAligned -- "Yes (Concept Aligned)" --> P2_CalcCentroid[["Call: HaversineCentroid(lat, lng) vs 32 Barangays"]]
    P2_CalcCentroid --> P2_AssignBarangay["Set incident_barangay = Nearest Barangay"]
    
    P2_AssignBarangay --> P2_DupCheckRoutine[["Call: DuplicateDetection(incident_barangay, category, lat, lng)"]]
    P2_DupCheckRoutine --> P2_SaveDB[("INSERT INTO concerns: title, desc, category, urgency, status='Pending'")]
    P2_SaveDB --> P2_SaveFile[("Write File: /uploads/concerns/photo_*.jpg")]
    
    P2_SaveFile --> P2_SocketEmit[["Socket.io: emit 'new_concern' & 'concern_stats_updated'"]]
    P2_SocketEmit --> P2_DocketOut[/"Output: Generate Official Municipal Docket Receipt"/]
    P2_DocketOut --> P2_EndSuccess(["End: Report Active"])
```

---

### 2.4 Program 3: Spatial Haversine & Duplicate Hazard Detection Algorithm

**Source Controller:** `backend/controllers/concerns.controller.js` (Spatial Subroutine)  
**Purpose:** Calculates nearest barangay centroid and identifies duplicate open reports in the same geographic zone.

```mermaid
flowchart TD
    P3_Start(["Start: Spatial & Duplicate Detection Subroutine"]) --> P3_InCoords[/"Input: Latitude (lat1), Longitude (lng1), Category, Title"/]
    
    %% Haversine Centroid Calculation
    P3_InCoords --> P3_LoadCentroids["Load Coordinates for 32 Kabankalan Barangays"]
    P3_LoadCentroids --> P3_HaversineLoop["For each Barangay B in Centroids:<br/>dLat = toRad(lat2 - lat1)<br/>dLng = toRad(lng2 - lng1)<br/>a = sin²(dLat/2) + cos(lat1)*cos(lat2)*sin²(dLng/2)<br/>distance = 2 * R * atan2(√a, √(1-a))"]
    P3_HaversineLoop --> P3_MinDistance["Find min(distance)"]
    P3_MinDistance --> P3_SetBrgy["Assign assigned_barangay = B.name"]
    
    %% Duplicate Check
    P3_SetBrgy --> P3_QueryActive[("SELECT * FROM concerns WHERE barangay = assigned_barangay AND status IN ('Pending', 'In Progress')")]
    P3_QueryActive --> P3_ActiveRows{"Active Concerns Exist in Barangay?"}
    
    P3_ActiveRows -- "No" --> P3_NoDup["isDuplicate = false, linkType = NULL"]
    P3_NoDup --> P3_End(["Return: { assigned_barangay, isDuplicate, linkedId }"])
    
    P3_ActiveRows -- "Yes" --> P3_CompareLoop["For each Open Concern C:<br/>1. Distance = Haversine(IncidentGPS, C.GPS)<br/>2. TextSim = CosineSimilarity(NewTitle, C.Title)<br/>3. CategoryMatch = (NewCategory == C.Category)"]
    
    P3_CompareLoop --> P3_CheckThreshold{"Distance <= 150m AND (CategoryMatch OR TextSim >= 0.75)?"}
    
    P3_CheckThreshold -- "No Matches" --> P3_NoDup
    P3_CheckThreshold -- "Match Found" --> P3_SetDup["isDuplicate = true<br/>linkedId = C.id<br/>linkType = 'duplicate'"]
    P3_SetDup --> P3_RecordLink[("INSERT INTO concern_links: source_id, target_id, link_type='duplicate'")]
    P3_RecordLink --> P3_End
```

---

### 2.5 Program 4: Administrative Resolution & Standardized Rejection Algorithm

**Source Controller:** `backend/controllers/concerns.controller.js`  
**Purpose:** Enforces strict municipal accountability rules: status dispatch, proof photo attachment, AI response drafting, and standardized rejection classification.

```mermaid
flowchart TD
    P4_Start(["Start: Admin Concern Lifecycle Update"]) --> P4_InAction[/"Input: Target Status ('In Progress', 'Resolved', 'Rejected')"/]
    
    P4_InAction --> P4_BranchStatus{"Evaluate Target Status"}
    
    %% Branch A: In Progress
    P4_BranchStatus -- "In Progress" --> P4_InNote[/"Input: Optional Dispatch Note"/]
    P4_InNote --> P4_UpdProgress[("UPDATE concerns SET status='In Progress', updated_at=NOW()")]
    P4_UpdProgress --> P4_Audit1[("INSERT INTO audit_log: action='status_change', new_status='In Progress'")]
    P4_Audit1 --> P4_Emit1[["Socket.io: emit 'concern_updated'"]]
    P4_Emit1 --> P4_Push1[["Call FCM: Send Push 'Field Crew Dispatched' to Citizen"]]
    P4_Push1 --> P4_EndComplete(["End: Status Updated"])
    
    %% Branch B: Resolved
    P4_BranchStatus -- "Resolved" --> P4_CheckProof{"Has Resolution Proof Photo Been Attached?"}
    P4_CheckProof -- "No" --> P4_WarnProof[/"Display: 'Proof of Resolution Photo Required'"/]
    P4_WarnProof --> P4_InAction
    
    P4_CheckProof -- "Yes" --> P4_AIDraftPrompt[/"Input: Click '✨ AI Draft' or Write Official Resolution Text"/]
    P4_AIDraftPrompt --> P4_UpdResolved[("UPDATE concerns SET status='Resolved', resolved_image_url=photoUrl, admin_note=note")]
    P4_UpdResolved --> P4_Audit2[("INSERT INTO audit_log: action='status_change', new_status='Resolved'")]
    P4_Audit2 --> P4_Emit2[["Socket.io: emit 'concern_updated'"]]
    P4_Emit2 --> P4_Push2[["Call FCM: Send Push 'Concern Resolved with Photo Proof' to Citizen"]]
    P4_Push2 --> P4_EndComplete
    
    %% Branch C: Rejected
    P4_BranchStatus -- "Rejected" --> P4_StripPhoto["Execute: Set resolved_image_url = NULL (Strip Staged Proof)"]
    P4_StripPhoto --> P4_SelectReason[/"Input: Select 1 of 7 Standard Grounds:<br/>1. Duplicate Report<br/>2. Private Property<br/>3. Utility/National Scope (DPWH/CENECO)<br/>4. Insufficient Details<br/>5. Not a Safety Hazard<br/>6. Cleared Upon Inspection<br/>7. Invalid/Non-Civic"/]
    
    P4_SelectReason --> P4_UpdRejected[("UPDATE concerns SET status='Rejected', admin_note=selectedReason, resolved_image_url=NULL")]
    P4_UpdRejected --> P4_Audit3[("INSERT INTO audit_log: action='status_change', new_status='Rejected'")]
    P4_Audit3 --> P4_Emit3[["Socket.io: emit 'concern_updated'"]]
    P4_Emit3 --> P4_Push3[["Call FCM: Send High-Visibility Rejection Alert to Citizen"]]
    P4_Push3 --> P4_EndComplete
```

---

### 2.6 Program 5: Citizen Concern Editing & Audit Snapshot Algorithm

**Source Controller:** `backend/controllers/concerns.controller.js`  
**Purpose:** Restricts editing to open tickets, re-evaluates visual alignment against existing photos, and preserves historical version snapshots.

```mermaid
flowchart TD
    P5_Start(["Start: Edit Concern Request"]) --> P5_FetchCurrent[("SELECT * FROM concerns WHERE id = param.id")]
    
    P5_FetchCurrent --> P5_CheckOwner{"req.user.id == concern.user_id?"}
    P5_CheckOwner -- "No" --> P5_Err403[/"HTTP 403: Forbidden Action"/]
    P5_Err403 --> P5_EndAbort(["End: Edit Aborted"])
    
    P5_CheckOwner -- "Yes" --> P5_CheckLock{"concern.status IN ('Pending', 'In Progress')?"}
    P5_CheckLock -- "No (Resolved or Rejected)" --> P5_ErrLock[/"Display: 'Resolved or Rejected concerns are permanently locked.'"/]
    P5_ErrLock --> P5_EndAbort
    
    P5_CheckLock -- "Yes" --> P5_InputEdits[/"Input: New Title & New Description (Photo, Location & Category Locked)"/]
    
    P5_InputEdits --> P5_HasPhoto{"concern.image_url != NULL?"}
    P5_HasPhoto -- "Yes" --> P5_RevalidateAI[["Call: aiClient.alignImageWithConcept(existingPhoto, newTitle, newDesc)"]]
    P5_RevalidateAI --> P5_AIValid{"New Text Aligned with Existing Photo?"}
    P5_AIValid -- "No" --> P5_ErrAlign[/"Display: 'New description contradicts original photo evidence.'"/]
    P5_ErrAlign --> P5_InputEdits
    
    P5_AIValid -- "Yes" --> P5_AssembleHistory
    P5_HasPhoto -- "No" --> P5_AssembleHistory
    
    P5_AssembleHistory["Assemble Snapshot: old_title, new_title, old_desc, new_desc, edited_at"]
    P5_AssembleHistory --> P5_InsertHistory[("INSERT INTO concern_edit_history VALUES (...)")]
    P5_InsertHistory --> P5_UpdateConcern[("UPDATE concerns SET title=newTitle, description=newDesc, edit_count=edit_count+1, updated_at=NOW()")]
    P5_UpdateConcern --> P5_Audit[("INSERT INTO audit_log: action='citizen_edit'")]
    P5_Audit --> P5_Emit[["Socket.io: emit 'concern_updated'"]]
    P5_Emit --> P5_SuccessMsg[/"Display: 'Concern successfully updated. Version history recorded.'"/]
    P5_SuccessMsg --> P5_EndSuccess(["End: Edit Persisted"])
```

---

# 📌 PART III — TRACEABILITY MATRIX

This table cross-references each physical system element from the **System Flowcharts (Part I)** with its implementing algorithmic logic in the **Program Flowcharts (Part II)**:

| System Flowchart Component | Operational Role | Corresponding Program Flowchart | Source File / Implementation |
| :--- | :--- | :--- | :--- |
| **Citizen Smartphone (Camera & GPS)** | Captures anti-spoofing live photos & coordinates | **Program 2** *(Incident Intake Algorithm)* | `mobile/src/screens/citizen/SubmitConcernScreen.jsx` |
| **Dual-AI Vision Client** | Llama 3.3 / Gemini Flash failover alignment | **Program 2** & **Program 5** *(Vision Subroutine)* | `backend/services/aiClient.js` |
| **Centroid & Duplicate Engine** | Haversine distance & spatial similarity | **Program 3** *(Spatial Duplicate Detection)* | `backend/controllers/concerns.controller.js` |
| **OCR Verification Subsystem** | Government ID name extraction & matching | **Program 1** *(ID Verification Algorithm)* | `backend/controllers/users.controller.js` |
| **Sidebar Real-Time Badge** | Live indicator for pending citizen queue | **Program 1** & **Program 4** *(Socket Sync)* | `admin-web/src/components/Sidebar.jsx` |
| **Admin Incident Resolution Panel** | Enforces proof photo & standardized rejection | **Program 4** *(Resolution & Rejection Algorithm)* | `admin-web/src/pages/Concerns.jsx` |
| **Version History Snapshot Engine** | Immutable audit trail for edited concerns | **Program 5** *(Concern Editing Algorithm)* | `backend/models/concern.model.js` |
| **Database & File Media Store** | Relational integrity & image persistence | **All Programs (1 to 5)** | `backend/db.js` & `backend/uploads/` |
