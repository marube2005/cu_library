# CU Library System — REST API Specification & Endpoint Contracts

**Base URL:** `/api/v1`  
**Authentication:** Bearer JWT (`Authorization: Bearer <token>`)

---

## 1. Authentication & Member Management (`/api/v1/auth`, `/api/v1/members`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register/` | Public | Register new member (`email`, `password`, `full_name`, `phone_whatsapp`, `reg_no`, `whatsapp_consent`) |
| `POST` | `/auth/login/` | Public | Obtain JWT Access and Refresh tokens |
| `POST` | `/auth/token/refresh/` | Public | Refresh expired access token |
| `GET` | `/auth/me/` | Authenticated | Retrieve current user profile and role |
| `PATCH` | `/auth/me/` | Authenticated | Update contact phone, email, WhatsApp consent toggle |
| `GET` | `/members/` | Staff | List members with filters (`search`, `status=PENDING|APPROVED|SUSPENDED`) |
| `POST` | `/members/{id}/approve/` | Librarian/Admin | Approve pending member account |
| `POST` | `/members/{id}/suspend/` | Librarian/Admin | Suspend a member's borrowing rights |

---

## 2. Catalogue & Copies (`/api/v1/catalogue`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/catalogue/categories/` | Public | List categories with title counts |
| `GET` | `/catalogue/titles/` | Public | Search titles (`search`, `category`, `available_only=true`, pagination) |
| `GET` | `/catalogue/titles/{id}/` | Public | Detailed title info, copy breakdown, shelf locations, reservation queue size |
| `POST` | `/catalogue/titles/` | Staff | Create new title entry manually |
| `POST` | `/catalogue/titles/isbn-lookup/` | Staff | Fetch metadata and cover thumbnail from OpenLibrary / Google Books |
| `POST` | `/catalogue/titles/bulk-import/` | Staff | Upload CSV/Excel template with copy codes and batch create records |
| `GET` | `/catalogue/titles/missing-covers/` | Staff | List titles lacking front cover photos |
| `POST` | `/catalogue/copies/` | Staff | Add new copy to existing title (`copy_code`, `shelf_location`, `condition`, `replacement_cost`) |
| `PATCH` | `/catalogue/copies/{id}/` | Staff | Update copy condition or status (`AVAILABLE`, `DAMAGED`, `LOST`, `WITHDRAWN`) |
| `GET` | `/catalogue/copies/labels/` | Staff | Generate printable barcode / QR code label sheets (PDF/HTML) |

---

## 3. Circulation: Lending, Returns & Reservations (`/api/v1/circulation`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/circulation/request/` | Member | Request hold on an available book (held for 3 days) |
| `POST` | `/circulation/issue/` | Staff | Confirm physical handover (`member_reg_or_id`, `copy_code`) -> creates Loan |
| `POST` | `/circulation/return/` | Staff | Record return by `copy_code`, inspect condition, calculate fines, notify queue |
| `POST` | `/circulation/loans/{id}/renew/` | Member/Staff | Renew eligible loan for +7 days (blocked if reservation exists or max renewals reached) |
| `GET` | `/circulation/loans/` | Staff | List loans with filters (`status=ISSUED|OVERDUE|RETURNED`, `overdue_only=true`, `member_id`) |
| `GET` | `/circulation/my-loans/` | Member | Active and historical loans for logged-in member |
| `POST` | `/circulation/reservations/` | Member | Join waitlist for a title whose copies are all out |
| `DELETE` | `/circulation/reservations/{id}/` | Member/Staff | Cancel an active reservation |
| `GET` | `/circulation/my-reservations/` | Member | Active reservations with queue position and hold expiration |

---

## 4. Fines, Payments & Waivers (`/api/v1/fines`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/fines/` | Staff | List all fines with filter (`status=UNPAID|PAID|WAIVED`, `member_id`) |
| `GET` | `/fines/my-fines/` | Member | Outstanding fines and payment history for logged-in member |
| `POST` | `/fines/{id}/payments/` | Staff | Record payment (`amount`, `method=CASH|MPESA`, `reference`) |
| `POST` | `/fines/{id}/waive/` | Librarian/Admin | Waive fine with compulsory audit reason (`reason`) |
| `POST` | `/fines/{id}/mark-lost/` | Staff | Flag book as lost, halt daily fine growth, record replacement requirement |

---

## 5. Notifications & WhatsApp Reminders (`/api/v1/notifications`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/notifications/generate-reminder/` | Staff | Input: `loan_id`, `template_type` (`DUE_SOON`, `OVERDUE`, `READY_FOR_PICKUP`). Output: normalized `wa.me` URL, preview text, recipient consent status. Logs draft in message history. |
| `GET` | `/notifications/history/` | Staff | Audit log of reminders sent to members |

---

## 6. System Settings & Reports (`/api/v1/admin`, `/api/v1/reports`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/admin/settings/` | Staff | Retrieve policy rules (loan days, grace days, fine rates, templates) |
| `PATCH` | `/admin/settings/` | Admin | Update system settings |
| `GET` | `/reports/dashboard-stats/` | Staff | Aggregated counters: Books out, due this week, overdue count, fine sum, pending approvals |
| `GET` | `/reports/export/{type}/` | Librarian/Admin | Export report as CSV/Excel/PDF (`type=CURRENT_LOANS|OVERDUE|MOST_BORROWED|COLLECTION`) |
| `GET` | `/reports/audit-logs/` | Admin | Filterable audit trail of staff operations |
