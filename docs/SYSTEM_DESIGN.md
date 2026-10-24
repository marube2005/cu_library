# CU Library System — System Architecture & Design Specification

**Document Version:** 1.0  
**Status:** Approved for Implementation  
**Based on:** Technical and User Documentation v0.1 by Elvis Marube  
**Target Architecture:** Multi-tier decoupled architecture (`frontend/` + `backend/`)

---

## 1. Executive Summary & System Blueprint

The **CU Library System** is a purpose-built, responsive web application and Progressive Web App (PWA) designed for Christian Union campus ministries. It manages library catalogue operations, physical copy inventory, lending, reservations, overdue tracking, fine policy enforcement, and WhatsApp click-to-chat notifications for staff and students.

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT TIER                                      |
|                                                                                   |
|  +------------------------------------+  +-------------------------------------+  |
|  |     Member Web App / Mobile PWA    |  |     Staff Operations Dashboard      |  |
|  |  - Live Catalogue Search & Filter  |  |  - Fast Issue/Return Barcode Desk   |  |
|  |  - Book Request & Reservation      |  |  - Overdue Tracking & WhatsApp wa.me|  |
|  |  - My Loans, Renewals & Fines      |  |  - ISBN Auto-fetch & Bulk CSV Import|  |
|  |  - Book Suggestion Form            |  |  - Fine Payments, Waivers & Reports |  |
|  +------------------------------------+  +-------------------------------------+  |
+------------------------------------------+----------------------------------------+
                                           | HTTPS / JSON REST API (JWT Auth)
+------------------------------------------v----------------------------------------+
|                                 APPLICATION TIER                                  |
|                                                                                   |
|   [backend/] Django 5.x + Django REST Framework (DRF)                             |
|   +-------------------+  +-------------------+  +-------------------------------+ |
|   | accounts          |  | catalogue         |  | loans & circulation           | |
|   | (Custom User,     |  | (Titles, Copies,  |  | (Issue, Return, Renewal,      | |
|   |  Roles, Approval) |  |  ISBN API Lookups)|  |  Reservations, Hold Expiry)   | |
|   +-------------------+  +-------------------+  +-------------------------------+ |
|   +-------------------+  +-------------------+  +-------------------------------+ |
|   | fines             |  | notifications     |  | reports & audit               | |
|   | (Daily accrual,   |  | (WhatsApp wa.me,  |  | (Collection metrics,          | |
|   |  Payments, Waive) |  |  SMTP email)      |  |  Tamper-proof audit trail)    | |
|   +-------------------+  +-------------------+  +-------------------------------+ |
+------------------------------------------+----------------------------------------+
                                           | Database Engine
+------------------------------------------v----------------------------------------+
|                                   DATA TIER                                       |
|                                                                                   |
|   PostgreSQL / SQLite (Local Dev) with Strict Foreign Keys & Unique Constraints   |
|   Media Storage: Local / Cloudinary (Book covers, labels, export files)           |
+-----------------------------------------------------------------------------------+
```

---

## 2. Directory & Repository Structure

The project is structured into clean decoupled directories for frontend and backend:

```
library-system/
|-- backend/                       # Django + DRF Web API Service
|   |-- manage.py
|   |-- requirements.txt
|   |-- core/                      # Project root settings, URLs, WSGI/ASGI
|   |   |-- settings.py
|   |   |-- urls.py
|   |   +-- wsgi.py
|   |-- apps/
|   |   |-- accounts/              # User model, Auth, Registration approval, Roles
|   |   |-- catalogue/             # Titles, Copies, Categories, ISBN OpenLibrary fetch
|   |   |-- loans/                 # Borrowing, Returns, Renewals, Reservations queue
|   |   |-- fines/                 # Fine calculation, Waivers, Payments (Cash/M-Pesa)
|   |   |-- notifications/         # Template rendering, wa.me links, email dispatch
|   |   |-- reports/               # Statistical queries, CSV/PDF generation
|   |   +-- audit/                 # Immutable staff activity logging
|   |-- templates/labels/          # Printable QR/Barcode label templates
|   +-- media/covers/              # Uploaded book cover photographs
|
|-- frontend/                      # Modern Next.js / React Web Application
|   |-- package.json
|   |-- public/
|   |   |-- icons/                 # PWA icons, Favicons
|   |   +-- manifest.json          # PWA installation manifest
|   |-- src/
|   |   |-- app/                   # App Router / Pages
|   |   |   |-- (auth)/            # Login, Register, Forgot Password
|   |   |   |-- (member)/          # Member Portal (Catalog, My Loans, Reservations)
|   |   |   |-- (staff)/           # Desk (Issue/Return, Overdue, Fines, Catalogue)
|   |   |   |-- admin/             # Admin Settings, Staff Accounts, Policy Config
|   |   |   +-- layout.tsx
|   |   |-- components/
|   |   |   |-- ui/                # Buttons, Modals, Badges, Inputs, Tables
|   |   |   |-- catalogue/         # BookCard, FilterBar, ISBNSearchBox, BarcodeScanner
|   |   |   |-- desk/              # IssueReturnWidget, CopyLookup, WhatsAppModal
|   |   |   +-- layout/            # Navbar, MobileNav, Sidebar, MemberBadge
|   |   |-- lib/                   # API client, Auth Context, WhatsApp URL generator
|   |   +-- styles/                # Design tokens and responsive styles
|
+-- docs/                          # Architecture, User manuals, API Specifications
    |-- SYSTEM_DESIGN.md           # (This document)
    +-- API_SPECIFICATION.md
```

---

## 3. UI/UX Design System & Aesthetics

### 3.1 Design Philosophy
- **Campus & Ministry Tone**: Trustworthy, elegant, clean academic feel with modern, warm accents.
- **High-Efficiency Staff Desk**: The circulation desk needs lightning-fast actions: keyboard focus on copy-code input, clear audio/visual confirmations on Issue/Return, and 1-click WhatsApp message triggers.
- **Mobile PWA First for Students**: Bottom navigation bar, fast thumb-reach buttons, instant offline cache for "My Loans", card layout with clear due date status badges.

### 3.2 Color Palette & Semantic Tokens
- **Primary Navy**: `#0F172A` (Background headers, active states, brand trust)
- **Accent Gold / Amber**: `#D97706` / `#F59E0B` (Christian Union warm identity, pending badges)
- **Success Emerald**: `#10B981` (Available copies, successful return, on-time)
- **Warning Amber**: `#F59E0B` (Due in <= 2 days, reserved hold)
- **Danger Crimson**: `#EF4444` (Overdue loans, unpaid fines > threshold, blocked borrower)
- **Surface & Cards**: `#FFFFFF` / Dark slate `#1E293B`
- **Soft Muted**: `#64748B` / Background subtle `#F8FAFC`

### 3.3 Status Badges & Indicators
| Entity Status | Badge Color | Visual Meaning |
|---|---|---|
| `AVAILABLE` | Emerald Solid | Available on shelf for immediate borrow |
| `BORROWED` | Slate Muted | Currently loaned out; shows expected return date |
| `RESERVED` | Amber Solid | Waiting for pickup on hold shelf (3 days) |
| `OVERDUE` | Red Pulse | Past due date, fine actively accruing |
| `DAMAGED` | Orange Outline | Under repair / flagged by librarian |
| `LOST` | Red Outline | Pending replacement or settlement |

---

## 4. Database Schema Design (Entity-Relationship)

### 4.1 Core Tables & Fields

#### 1. `users_user`
- `id` (UUID / BigInt, PK)
- `email` (VARCHAR, Unique, indexed)
- `full_name` (VARCHAR)
- `phone_whatsapp` (VARCHAR) — Format: +2547XXXXXXXX (normalized for WhatsApp links)
- `reg_no` (VARCHAR, Unique, e.g. Student ID)
- `password_hash` (VARCHAR)
- `role` (ENUM: `MEMBER`, `ASSISTANT`, `LIBRARIAN`, `ADMIN`)
- `status` (ENUM: `PENDING`, `APPROVED`, `SUSPENDED`, `INACTIVE`)
- `whatsapp_consent` (BOOLEAN, default: TRUE)
- `created_at` (TIMESTAMP)

#### 2. `catalogue_category`
- `id` (INT, PK)
- `name` (VARCHAR, Unique, e.g. "Theology", "Leadership", "Prayer", "Marriage", "Bible Study")
- `slug` (VARCHAR)

#### 3. `catalogue_title`
- `id` (UUID, PK)
- `title` (VARCHAR, indexed)
- `author` (VARCHAR, indexed)
- `isbn` (VARCHAR, indexed, nullable)
- `publisher` (VARCHAR, nullable)
- `publication_year` (INT, nullable)
- `category_id` (FK -> `catalogue_category`)
- `language` (VARCHAR, default 'English')
- `description` (TEXT, nullable)
- `cover_url` (VARCHAR, nullable)
- `is_hidden` (BOOLEAN, default FALSE)
- `created_at` (TIMESTAMP)

#### 4. `catalogue_copy`
- `id` (UUID, PK)
- `title_id` (FK -> `catalogue_title`, indexed)
- `copy_code` (VARCHAR, Unique, indexed, e.g. `CU-0001`)
- `shelf_location` (VARCHAR, e.g. "Shelf A-3")
- `condition` (ENUM: `NEW`, `GOOD`, `FAIR`, `POOR`, `DAMAGED`)
- `status` (ENUM: `AVAILABLE`, `BORROWED`, `RESERVED`, `LOST`, `DAMAGED`, `WITHDRAWN`)
- `replacement_cost` (DECIMAL, default 800.00 Ksh)
- `barcode_qr_data` (VARCHAR)

#### 5. `loans_loan`
- `id` (UUID, PK)
- `copy_id` (FK -> `catalogue_copy`, indexed)
- `member_id` (FK -> `users_user`, indexed)
- `issued_by_id` (FK -> `users_user`)
- `issue_date` (DATE)
- `due_date` (DATE, indexed)
- `return_date` (DATE, nullable)
- `renewals_count` (INT, default 0)
- `status` (ENUM: `REQUESTED`, `ISSUED`, `RETURNED`, `OVERDUE`, `LOST`, `CLOSED`)
- `created_at`, `updated_at` (TIMESTAMP)

#### 6. `loans_reservation`
- `id` (UUID, PK)
- `title_id` (FK -> `catalogue_title`)
- `member_id` (FK -> `users_user`)
- `status` (ENUM: `QUEUED`, `READY_FOR_PICKUP`, `FULFILLED`, `EXPIRED`, `CANCELLED`)
- `queue_position` (INT)
- `notified_at` (TIMESTAMP, nullable)
- `hold_expires_at` (TIMESTAMP, nullable)
- `created_at` (TIMESTAMP)

#### 7. `fines_fine`
- `id` (UUID, PK)
- `loan_id` (FK -> `loans_loan`)
- `member_id` (FK -> `users_user`)
- `amount` (DECIMAL)
- `paid_amount` (DECIMAL, default 0.00)
- `status` (ENUM: `UNPAID`, `PARTIAL`, `PAID`, `WAIVED`)
- `waive_reason` (TEXT, nullable)
- `waived_by_id` (FK -> `users_user`, nullable)
- `created_at`, `updated_at` (TIMESTAMP)

#### 8. `fines_payment`
- `id` (UUID, PK)
- `fine_id` (FK -> `fines_fine`)
- `amount` (DECIMAL)
- `method` (ENUM: `CASH`, `MPESA`)
- `reference` (VARCHAR, nullable — e.g. M-Pesa transaction code `QK89...`)
- `received_by_id` (FK -> `users_user`)
- `payment_date` (TIMESTAMP)

#### 9. `notifications_messagelog`
- `id` (UUID, PK)
- `member_id` (FK -> `users_user`)
- `channel` (ENUM: `WHATSAPP_LINK`, `WHATSAPP_API`, `EMAIL`)
- `template_used` (VARCHAR)
- `content_preview` (TEXT)
- `sent_by_id` (FK -> `users_user`)
- `created_at` (TIMESTAMP)

#### 10. `system_setting`
- `key` (VARCHAR, PK) — e.g. `LOAN_PERIOD_DAYS` (14), `MAX_BOOKS_PER_MEMBER` (2), `GRACE_PERIOD_DAYS` (2), `DAILY_FINE_RATE_KSH` (5), `BORROWING_BLOCK_FINE_THRESHOLD` (50), `HOLD_DAYS` (3).
- `value` (JSON / TEXT)
- `description` (TEXT)
- `updated_at` (TIMESTAMP)

#### 11. `system_auditlog`
- `id` (UUID, PK)
- `user_id` (FK -> `users_user`)
- `action` (VARCHAR: `ISSUE_BOOK`, `RETURN_BOOK`, `WAIVE_FINE`, `EDIT_CATALOGUE`, etc.)
- `details` (JSON)
- `ip_address` (VARCHAR, nullable)
- `timestamp` (TIMESTAMP, indexed)

---

## 5. Main Functional Flows & Business Logic

### 5.1 Issue & Return Workflow
```
[Member requests online] OR [Visits library with book]
                   |
     [Librarian enters Member Reg & Copy Code]
                   |
         +---------v---------+
         | Eligibility Check |
         +---------+---------+
                   |
    +--------------+--------------+
    |                             |
[Passes Checks]             [Fails Checks: Fines > 50 / >2 books]
    |                             |
[Issue Book]                [Display Alert to Staff & Member]
Set due_date = today + 14d
Copy status = BORROWED
```

### 5.2 Dynamic WhatsApp Click-to-Chat Mechanism
In Version 1, reminders use the zero-cost **`wa.me` Click-to-Chat standard**:
1. When staff views an overdue or due-soon loan, a single button **"Send WhatsApp Reminder"** is available.
2. The URL is compiled dynamically:
   ```
   https://wa.me/254712345678?text=Hello%20John%2C%20a%20gentle%20reminder%20that%20Mere%20Christianity%20is%20due%20on%2028-Oct-2026.%20Blessings%2C%20CU%20Library.
   ```
3. Clicking opens WhatsApp Web on PC or the WhatsApp App on mobile with the message prepopulated.
4. Staff taps send. An entry is recorded in `MESSAGE_LOG` with timestamp and user.

### 5.3 Automated Nightly Job Calculations
Runs at 00:01 daily:
1. `LOAN` records where `due_date < today` and `status == 'ISSUED'` are transitioned to `status = 'OVERDUE'`.
2. Fines are calculated:
   $$\text{Days Late} = \text{today} - \text{due\_date}$$
   $$\text{Chargeable Days} = \max(0, \text{Days Late} - \text{Grace Days})$$
   $$\text{Accrued Fine} = \min(\text{Chargeable Days} \times \text{Rate}, \text{Replacement Cost})$$
3. Unclaimed reservations past `hold_expires_at` are expired and assigned to the next student in the queue.

---

## 6. Security, Compliance & Kenya Data Protection Act 2019

1. **Role-Based Authorization (RBAC)**:
   - `MEMBER`: Own profile, own loans, own fines, public catalogue.
   - `ASSISTANT`: Catalogue view, Issue/Return desk, WhatsApp click-to-chat.
   - `LIBRARIAN`: Full catalogue edits, fine waivers, member approvals, reports.
   - `ADMIN`: Staff account provisioning, system policy configuration, raw audit log inspection.
2. **Privacy**: Student phone numbers and registration numbers are masked or accessible strictly to authorized staff.
3. **Explicit WhatsApp Consent**: Opt-in check at registration with profile revocation toggle.
