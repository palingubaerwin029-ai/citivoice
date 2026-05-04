# CitiVoice Diagrams

Here are the Entity Relationship Diagram (ERD) and Data Flow Diagrams (DFD) for the CitiVoice project.

> [!TIP]
> **How to use this in Figma:**
> 1. In Figma, go to **Plugins** and search for **"Mermaid"** (there are several free ones like *Mermaid to Figma* or *Mermaid Chart*).
> 2. Run the plugin and copy-paste the raw Mermaid code block below into it.
> 3. It will automatically draw the diagrams for you inside Figma as editable vectors!

---

## Entity Relationship Diagram (ERD)

This diagram shows the complete database structure derived from the MySQL schema (`schema.sql`) and how the different tables relate to each other.

```mermaid
erDiagram
    USERS {
        int id PK
        varchar name
        varchar email "UNIQUE"
        varchar password_hash
        varchar phone
        varchar barangay
        enum role "admin | citizen"
        enum verification_status "unverified | pending | verified | rejected"
        tinyint is_verified
        varchar id_type
        varchar id_number
        text id_image_url
        text fcm_token
        text rejection_reason
        datetime submitted_at
        datetime verified_at
        datetime created_at
        datetime updated_at
    }

    CONCERNS {
        int id PK
        varchar title
        text description
        varchar category
        enum priority "High | Medium | Low"
        enum status "Pending | In Progress | Resolved | Rejected"
        text image_url
        text location_address
        decimal location_lat
        decimal location_lng
        int user_id FK
        varchar user_name
        varchar user_barangay
        text admin_note
        int upvotes
        datetime created_at
        datetime updated_at
    }

    CONCERN_UPVOTES {
        int id PK
        int concern_id FK
        int user_id FK
        datetime created_at
    }

    NOTIFICATIONS {
        int id PK
        int user_id FK
        varchar title
        text message
        boolean is_read
        datetime created_at
    }

    BARANGAYS {
        int id PK
        varchar name "UNIQUE"
        datetime created_at
        datetime updated_at
    }

    ANNOUNCEMENTS {
        int id PK
        varchar title
        text body
        enum type "info | warning | urgent | success"
        varchar author
        varchar barangay
        text link
        datetime created_at
        datetime updated_at
    }

    EVENTS {
        int id PK
        varchar title
        text description
        enum category "meeting | maintenance | health | emergency | celebration | other"
        datetime date
        varchar location
        varchar organizer
        text link
        datetime created_at
        datetime updated_at
    }

    %% ── Physical Foreign Key Relationships ──
    USERS ||--o{ CONCERNS : "submits (user_id → users.id, ON DELETE SET NULL)"
    USERS ||--o{ CONCERN_UPVOTES : "casts (user_id → users.id, ON DELETE CASCADE)"
    CONCERNS ||--o{ CONCERN_UPVOTES : "receives (concern_id → concerns.id, ON DELETE CASCADE)"
    USERS ||--o{ NOTIFICATIONS : "receives (user_id → users.id, ON DELETE CASCADE)"

    %% ── Logical / Text-Based Relationships ──
    BARANGAYS ||--o{ USERS : "resides in (users.barangay)"
    BARANGAYS ||--o{ CONCERNS : "reported from (concerns.user_barangay)"
    BARANGAYS ||--o{ ANNOUNCEMENTS : "targeted at (announcements.barangay)"
```

---

## Data Flow Diagram (DFD) — Level 0 Context Diagram

This diagram shows the external entities and the high-level data flows entering and leaving the CitiVoice system boundary.

```mermaid
flowchart TD
    %% ── External Entities ──
    Citizen[Citizen]
    Admin[City Administrator]
    ExtEmail[[Email Service — Gmail SMTP]]
    ExtSMS[[SMS Service — Twilio]]

    %% ── Central Process ──
    System(("0.0<br/>CitiVoice<br/>System"))

    %% ── Citizen → System ──
    Citizen -- "Registration Credentials" --> System
    Citizen -- "Government ID for Verification" --> System
    Citizen -- "Civic Concern (Photo, GPS, Details)" --> System
    Citizen -- "Upvote Action" --> System

    %% ── System → Citizen ──
    System -- "JWT Auth Token" --> Citizen
    System -- "Concern Status Updates" --> Citizen
    System -- "In-App Notifications" --> Citizen
    System -- "Announcements & Events Feed" --> Citizen
    System -- "Verification Decision" --> Citizen

    %% ── Admin → System ──
    Admin -- "Login Credentials" --> System
    Admin -- "Concern Status & Admin Note" --> System
    Admin -- "Verification Approve / Reject" --> System
    Admin -- "New Announcement" --> System
    Admin -- "New Event" --> System
    Admin -- "Barangay Data" --> System

    %% ── System → Admin ──
    System -- "Dashboard Analytics & Reports" --> Admin
    System -- "Pending Verification Queue" --> Admin
    System -- "Concerns List & Map View" --> Admin

    %% ── System → External Services ──
    System -- "Email Notification" --> ExtEmail
    System -- "SMS Notification" --> ExtSMS
    ExtEmail -- "Delivery Status" --> System
    ExtSMS -- "Delivery Status" --> System
```

---

## Data Flow Diagram (DFD) — Level 1

This diagram decomposes the Level 0 process into sub-processes and introduces the Data Stores.

```mermaid
flowchart LR
    Citizen[Citizen]
    Admin[City Administrator]

    P1(("1.0 Manage<br/>Users & Auth"))
    P2(("2.0 Process<br/>Concerns"))
    P3(("3.0 Manage<br/>Events &<br/>Announcements"))
    P4(("4.0 Dispatch<br/>Notifications"))

    DB[(System Database)]

    ExtNotif[[Email & SMS<br/>Services]]

    Citizen -- "Register / Login / ID" --> P1
    P1 -- "Token / Status" --> Citizen
    Citizen -- "Concern / Upvote" --> P2
    P2 -- "Updates" --> Citizen
    P3 -- "Feed" --> Citizen
    P4 -- "Push Alert" --> Citizen

    Admin -- "Credentials / Verify" --> P1
    P1 -- "Pending Users" --> Admin
    Admin -- "Status & Notes" --> P2
    P2 -- "List & Analytics" --> Admin
    Admin -- "CRUD" --> P3

    P1 <--> DB
    P2 <--> DB
    P3 <--> DB
    P4 <--> DB

    P2 -- "Trigger" --> P4
    P1 -- "Trigger" --> P4
    P4 -- "Payload" --> ExtNotif
```

---

## Data Flow Diagram (DFD) — Level 2 (Process 2.0 — Civic Concerns)

This diagram decomposes **Process 2.0 (Process Civic Concerns)** into its detailed sub-processes showing how concerns are submitted, reviewed, upvoted, and how notifications are triggered.

```mermaid
flowchart TD
    %% ── External Entities ──
    Citizen[Citizen]
    Admin[City Administrator]

    %% ── Level 2 Sub-Processes ──
    P21(("2.1<br/>Submit New<br/>Concern"))
    P22(("2.2<br/>Review &<br/>Update Status"))
    P23(("2.3<br/>Process<br/>Upvotes"))
    P24(("2.4<br/>Delete<br/>Concern"))
    P25(("2.5<br/>Dispatch<br/>Notifications"))

    %% ── Data Stores ──
    D1[(D1 — Users)]
    D2[(D2 — Concerns)]
    D7[(D7 — Concern Upvotes)]
    D5[(D5 — Notifications)]

    %% ── External Service ──
    ExtNotif[[External Notification Services<br/>Gmail SMTP & Twilio SMS]]

    %% ════════════════════════════════════════
    %% 2.1 — Submit New Concern
    %% ════════════════════════════════════════
    Citizen -- "Concern Details (Title, Description,<br/>Category, Priority, Photo, GPS)" --> P21
    D1 -. "Validate Authenticated User" .-> P21
    P21 -- "New Concern Record" --> D2

    %% ════════════════════════════════════════
    %% 2.2 — Review & Update Status (Admin)
    %% ════════════════════════════════════════
    Admin -- "Status Change & Admin Note" --> P22
    D2 -. "Existing Concern Record" .-> P22
    P22 -- "Updated Concern Record" --> D2
    P22 -- "Status/Note Change Trigger" --> P25

    %% ════════════════════════════════════════
    %% 2.3 — Process Upvotes (Toggle)
    %% ════════════════════════════════════════
    Citizen -- "Upvote / Remove Upvote" --> P23
    D7 -. "Check Existing Vote" .-> P23
    P23 -- "Insert / Delete Vote" --> D7
    P23 -- "Increment / Decrement Count" --> D2

    %% ════════════════════════════════════════
    %% 2.4 — Delete Concern (Admin)
    %% ════════════════════════════════════════
    Admin -- "Delete Request" --> P24
    D2 -. "Concern Record & Image" .-> P24
    P24 -- "Remove Concern" --> D2
    P24 -- "Remove Associated Upvotes" --> D7

    %% ════════════════════════════════════════
    %% 2.5 — Dispatch Notifications
    %% ════════════════════════════════════════
    P25 -- "In-App Notification Record" --> D5
    P25 -- "Push Alert" --> Citizen
    D1 -. "User Contact Info (Email, Phone)" .-> P25
    P25 -- "Email & SMS Payload" --> ExtNotif
```

---

## Data Flow Diagram (DFD) — Level 2 (Process 1.0 — Users & Authentication)

This diagram decomposes **Process 1.0 (Manage Users & Authentication)** into its detailed sub-processes.

```mermaid
flowchart TD
    %% ── External Entities ──
    Citizen[Citizen]
    Admin[City Administrator]
    ExtNotif[[External Notification Services<br/>Gmail SMTP & Twilio SMS]]

    %% ── Level 2 Sub-Processes ──
    P11(("1.1<br/>Register<br/>New User"))
    P12(("1.2<br/>Authenticate<br/>User"))
    P13(("1.3<br/>Manage ID<br/>Verification"))
    P14(("1.4<br/>Update User<br/>Profile"))
    P15(("1.5<br/>Manage<br/>Barangays"))

    %% ── Data Stores ──
    D1[(D1 — Users)]
    D6[(D6 — Barangays)]

    %% ════════════════════════════════════════
    %% 1.1 — Register
    %% ════════════════════════════════════════
    Citizen -- "Name, Email, Password, Phone, Barangay" --> P11
    P11 -- "Hashed Credentials" --> D1
    P11 -- "JWT Token & User Profile" --> Citizen

    %% ════════════════════════════════════════
    %% 1.2 — Authenticate (Login + /me)
    %% ════════════════════════════════════════
    Citizen -- "Email & Password" --> P12
    Admin -- "Email & Password" --> P12
    D1 -. "Stored Hash for Comparison" .-> P12
    P12 -- "JWT Token & User Profile" --> Citizen
    P12 -- "JWT Token & Admin Profile" --> Admin

    %% ════════════════════════════════════════
    %% 1.3 — ID Verification (Admin Actions)
    %% ════════════════════════════════════════
    Admin -- "Approve / Reject / Revoke" --> P13
    D1 -. "Pending Users Queue" .-> P13
    P13 -- "Updated Verification Status" --> D1
    P13 -- "Email & SMS Notification" --> ExtNotif

    %% ════════════════════════════════════════
    %% 1.4 — Update Profile (Citizen Self-Service)
    %% ════════════════════════════════════════
    Citizen -- "Profile Changes / ID Upload / FCM Token" --> P14
    P14 -- "Updated User Record" --> D1

    %% ════════════════════════════════════════
    %% 1.5 — Manage Barangays (Admin)
    %% ════════════════════════════════════════
    Admin -- "Add / Edit / Delete Barangay" --> P15
    P15 <--> D6
    D6 -. "Barangay List for Dropdowns" .-> P11
    D6 -. "Barangay List for Dropdowns" .-> P14
```
---

## System Flowchart

This flowchart illustrates the overall process flow of the CitiVoice system.

```mermaid
flowchart TD
    Start([Start]) --> OpenApp[User Opens CitiVoice]
    OpenApp --> HasAccount{Has Account?}

    HasAccount -- No --> Register[Register Account]
    Register --> Login
    HasAccount -- Yes --> Login[Login]

    Login --> AuthCheck{Valid Credentials?}
    AuthCheck -- No --> Login
    AuthCheck -- Yes --> CheckRole{User Role?}

    CheckRole -- Citizen --> CitizenHome[Citizen Dashboard]
    CheckRole -- Admin --> AdminHome[Admin Dashboard]

    CitizenHome --> CitizenAction{Select Feature}
    CitizenAction --> SubmitConcern[Submit Civic Concern]
    CitizenAction --> ViewStatus[View Concern Status]
    CitizenAction --> ViewFeed[View Announcements & Events]
    CitizenAction --> VerifyID[Submit ID for Verification]

    SubmitConcern --> DB[(System Database)]
    ViewStatus --> DB
    VerifyID --> DB

    AdminHome --> AdminAction{Select Feature}
    AdminAction --> ManageConcerns[Review & Update Concerns]
    AdminAction --> VerifyUsers[Verify / Reject Users]
    AdminAction --> ManageContent[Manage Events & Announcements]
    AdminAction --> ViewReports[Generate Reports]

    ManageConcerns --> DB
    VerifyUsers --> DB
    ManageContent --> DB
    ViewReports --> DB

    DB --> Notify[Send Notification to Citizen]
    Notify --> End([End])
```

---

## System Flowchart — Admin Web Console

This flowchart shows the process flow of the CitiVoice **Admin Web Console**.

```mermaid
flowchart TD
    Start([Start]) --> OpenWeb[Open Admin Web Console]
    OpenWeb --> Login[Enter Email & Password]
    Login --> Auth{Valid Admin<br/>Credentials?}
    Auth -- No --> Login
    Auth -- Yes --> Dashboard[View Dashboard<br/>Statistics & Analytics]

    Dashboard --> Menu{Select Module}

    Menu --> Concerns[Concerns Management]
    Menu --> Verify[User Verification]
    Menu --> Events[Events Management]
    Menu --> Announce[Announcements Management]
    Menu --> Barangays[Barangay Management]
    Menu --> Reports[Reports & Analytics]
    Menu --> MapView[Map View]
    Menu --> Logout([Logout])

    Concerns --> ViewList[View Concerns List]
    ViewList --> SelectConcern[Select a Concern]
    SelectConcern --> ViewDetail[View Details, Photo & Location]
    ViewDetail --> UpdateStatus[Update Status & Add Admin Note]
    UpdateStatus --> DB[(System Database)]
    DB --> NotifyCitizen[Notify Citizen via<br/>Email, SMS & In-App]
    NotifyCitizen --> Dashboard

    Verify --> ViewPending[View Pending Users]
    ViewPending --> ReviewID[Review ID Photo & Details]
    ReviewID --> Decision{Approve or Reject?}
    Decision -- Approve --> ApproveUser[Set Verified]
    Decision -- Reject --> RejectUser[Set Rejected & Add Reason]
    ApproveUser --> DB
    RejectUser --> DB

    Events --> CRUDEvent[Create / Edit / Delete Event]
    CRUDEvent --> DB

    Announce --> CRUDAnnounce[Create / Edit / Delete Announcement]
    CRUDAnnounce --> DB

    Barangays --> CRUDBarangay[Add / Edit / Delete Barangay]
    CRUDBarangay --> DB

    Reports --> GenReport[Filter by Category,<br/>Status, Barangay & Date]
    GenReport --> DB

    MapView --> ViewMap[View All Concerns on Map]
    ViewMap --> DB
```

---

## Program Flowchart

This flowchart shows the internal execution flow of the CitiVoice application when processing a request.

```mermaid
flowchart TD
    Start([Client Sends HTTP Request])
    Start --> Server[Express Server Receives Request]
    Server --> Helmet[Apply Security Headers]
    Helmet --> CORS[Check CORS Policy]
    CORS --> RateLimit{Rate Limited?}

    RateLimit -- Yes --> Block[Return 429 Too Many Requests]
    RateLimit -- No --> ParseBody[Parse JSON Body]

    ParseBody --> Route{Match API Route}
    Route -- No Match --> NotFound[Return 404 Not Found]

    Route -- "/api/auth" --> AuthRoute[Auth Route]
    Route -- "/api/concerns" --> ConcernRoute[Concerns Route]
    Route -- "/api/users" --> UserRoute[Users Route]
    Route -- "/api/events" --> EventRoute[Events Route]
    Route -- "/api/announcements" --> AnnounceRoute[Announcements Route]
    Route -- "/api/notifications" --> NotifRoute[Notifications Route]
    Route -- "/api/barangays" --> BarangayRoute[Barangays Route]

    AuthRoute --> NeedAuth{Requires Auth?}
    ConcernRoute --> NeedAuth
    UserRoute --> NeedAuth
    EventRoute --> NeedAuth
    AnnounceRoute --> NeedAuth
    NotifRoute --> NeedAuth
    BarangayRoute --> NeedAuth

    NeedAuth -- No --> Process
    NeedAuth -- Yes --> VerifyJWT{Valid JWT Token?}
    VerifyJWT -- No --> Unauthorized[Return 401 Unauthorized]
    VerifyJWT -- Yes --> CheckRole{Requires Admin Role?}

    CheckRole -- No --> Process
    CheckRole -- Yes --> IsAdmin{User is Admin?}
    IsAdmin -- No --> Forbidden[Return 403 Forbidden]
    IsAdmin -- Yes --> Process

    Process[Execute Business Logic]
    Process --> DBQuery[Query MySQL Database]
    DBQuery --> DBResult{Query Successful?}

    DBResult -- No --> ServerError[Return 500 Server Error]
    DBResult -- Yes --> NeedNotify{Status Changed or<br/>Verification Decision?}

    NeedNotify -- No --> Response
    NeedNotify -- Yes --> SaveNotif[Save In-App Notification]
    SaveNotif --> SendExternal[Send Email & SMS<br/>via Gmail & Twilio]
    SendExternal --> Response

    Response[Return JSON Response to Client]
    Response --> End([End])
```
