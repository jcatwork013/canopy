# Canopy — Master Technical Specification (v2)

> **Canopy** là nền tảng chăm sóc cây trồng ứng dụng AI. Tài liệu này là bản đặc tả kỹ thuật chính (master spec), mô tả đầy đủ kiến trúc, mô hình dữ liệu, hợp đồng API, cơ chế cổng kích hoạt (readiness gate) và lớp điều phối AI. Tất cả thuật ngữ kỹ thuật, định danh (identifier), tiêu đề bảng và mã nguồn giữ nguyên tiếng Anh.

**Document status:** v2 — pro upgrade.
**Audience:** backend, frontend, mobile engineers, DevOps.
**Source of truth:** mã nguồn trong `apps/api`, `packages/shared` và file migration `apps/api/migrations/000001_init.up.sql`.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [The 7 Pillars](#2-the-7-pillars)
3. [Roles & Permissions](#3-roles--permissions)
4. [Tech Stack](#4-tech-stack)
5. [System Architecture](#5-system-architecture)
6. [Database Schema Reference (23 tables)](#6-database-schema-reference-23-tables)
7. [Readiness Gate (Activation Gate)](#7-readiness-gate-activation-gate)
8. [AI Orchestration](#8-ai-orchestration)
9. [KYC & Email Verification Flow](#9-kyc--email-verification-flow)
10. [MinIO Upload Flow](#10-minio-upload-flow)
11. [REST API Surface](#11-rest-api-surface)
12. [Background Worker (Reminders)](#12-background-worker-reminders)
13. [Security & Ops Rules](#13-security--ops-rules)
14. [Environment Variables Reference](#14-environment-variables-reference)

---

## 1. Project Overview

Canopy giúp người dùng nhận diện cây, chẩn đoán bệnh, lập kế hoạch điều trị, quản lý bộ sưu tập cây và kết nối cộng đồng (chợ mua bán cây + dịch vụ chăm sóc). Điểm khác biệt cốt lõi:

- **AI-first nhưng provider-agnostic:** Gemini là provider mặc định nhưng nằm sau một interface trừu tượng (`AIProvider`), có thể thay thế.
- **Secrets không nằm trong env:** API key của Gemini/Resend được nhập trong Admin portal và lưu **mã hóa AES-256-GCM** trong database. Chỉ `CONFIG_ENCRYPTION_KEY` nằm trong env.
- **Readiness gate:** ứng dụng **không hoạt động** cho tới khi admin cấu hình xong. `GET /api/v1/system/status` báo trạng thái; middleware `ReadinessGate` trả `503 SYSTEM_NOT_READY` trên các route nghiệp vụ.
- **Shared core cho web + mobile:** `packages/shared` chứa TS contracts + HTTP client dùng chung cho cả React (web PWA) và React Native (Expo).

---

## 2. The 7 Pillars

| # | Pillar | Mô tả | Endpoint/Table chính |
|---|--------|-------|----------------------|
| 1 | **AI plant identification** | Nhận diện loài cây từ ảnh chụp | `POST /ai/identify`, `identifications`, `plant_species` |
| 2 | **Disease diagnosis** | Chẩn đoán bệnh từ ảnh lá + mô tả triệu chứng | `POST /ai/diagnose`, `diagnoses`, `diseases` |
| 3 | **Day-by-day treatment plan** | Kế hoạch điều trị AI theo từng ngày | `POST /ai/treatment-plan`, `treatment_plans`, `treatment_steps` |
| 4 | **Plant collection management** | Quản lý bộ sưu tập cây cá nhân | `/plants`, `user_plants`, `plant_photos` |
| 5 | **Care reminders / notifications** | Lịch chăm sóc + nhắc nhở (push + in-app) | `care_schedules`, `care_logs`, `notifications`, `push_tokens` |
| 6 | **Community marketplace** | Chợ kết nối 3 vai trò: player, seller, caretaker | `listings`, `conversations`, `messages`, `reviews` |
| 7 | **Admin portal + readiness gate** | Cấu hình API keys / AI provider; app không chạy cho tới khi cấu hình xong | `system_configs`, `ai_providers`, `/system/status` |

---

## 3. Roles & Permissions

Một user có thể giữ **nhiều vai trò** cùng lúc, biểu diễn bằng các boolean flag độc lập (không phải enum role đơn).

| Flag | Default | Ý nghĩa | Điều kiện hành động |
|------|---------|---------|----------------------|
| `is_player` | `true` | Người dùng phổ thông (mặc định khi đăng ký) | Luôn có |
| `is_seller` | `false` | Bán cây trên marketplace | Bán được khi `is_seller && kyc_status === 'verified'` |
| `is_caretaker` | `false` | Cung cấp dịch vụ chăm sóc | Cung cấp được khi `is_caretaker && kyc_status === 'verified'` |
| `is_system_admin` | `false` | Quản trị hệ thống, cấu hình portal | Truy cập Admin portal |

Helper dùng chung (`packages/shared/src/types/auth.ts`):

```ts
export const roleHelpers = {
  isAdmin:       (u) => !!u?.is_system_admin,
  canSell:       (u) => !!u?.is_seller && u?.kyc_status === 'verified',
  canOfferCare:  (u) => !!u?.is_caretaker && u?.kyc_status === 'verified',
  emailVerified: (u) => !!u?.email_verified_at,
};
```

`account_status`: `pending | active | suspended | banned`.
`kyc_status`: `none | submitted | in_review | verified | rejected`.

---

## 4. Tech Stack

| Layer | Technology | Ghi chú |
|-------|-----------|---------|
| **Backend** | Go 1.25, Gin | HTTP framework |
| DB access | sqlc + pgx (`pgxpool`) | Type-safe queries |
| Migrations | golang-migrate | `000001_init.up.sql` = init schema |
| Logging | slog | Structured, không log secret |
| Auth | JWT (access + refresh), bcrypt | Refresh rotation |
| Secrets at rest | AES-256-GCM | `nonce(12) \|\| ciphertext \|\| tag` |
| **Database** | PostgreSQL 16 | UUID PKs, `timestamptz`, soft-delete |
| **Object storage** | MinIO | Presigned uploads, private KYC bucket |
| **Email** | Resend | Verify email, password reset |
| **AI** | Gemini (default) sau `AIProvider` interface | `responseMimeType: application/json` + `responseSchema` |
| **Web** | React 18 + TS + Vite PWA | `vite-plugin-pwa` |
| Routing/state | React Router, TanStack Query, Zustand | |
| Forms/validation | React Hook Form + Zod | |
| UI | Tailwind + shadcn/ui | |
| **Mobile** | React Native (Expo) | Tái sử dụng `packages/shared` |
| **Monorepo** | pnpm workspaces | `apps/{api,web,admin,mobile}`, `packages/shared` |

---

## 5. System Architecture

```mermaid
flowchart TB
  subgraph Clients
    WEB["Web PWA (React 18 + Vite)"]
    ADMIN["Admin Portal (React)"]
    MOBILE["Mobile (React Native / Expo)"]
  end

  SHARED["packages/shared\nCanopyClient + HttpClient + TS contracts"]
  WEB --- SHARED
  ADMIN --- SHARED
  MOBILE --- SHARED

  subgraph API["Go API (Gin) — /api/v1"]
    MW["Middleware chain\nRequestID -> Logger -> Recovery -> CORS -> ReadinessGate"]
    SYS["system / readiness service"]
    AUTH["auth / kyc"]
    PLANTS["plants / uploads"]
    AIORCH["AI orchestration"]
    CARE["care / reminders"]
    MKT["marketplace"]
    WORKER["background worker (reminders)"]
  end

  SHARED -->|HTTPS JSON| MW
  MW --> SYS & AUTH & PLANTS & AIORCH & CARE & MKT

  subgraph Infra
    PG[("PostgreSQL 16")]
    MINIO[("MinIO\nobject storage")]
    RESEND["Resend\n(email)"]
    GEMINI["Gemini\n(AI provider)"]
  end

  SYS --> PG
  AUTH --> PG
  AUTH --> RESEND
  PLANTS --> PG
  PLANTS --> MINIO
  AIORCH --> PG
  AIORCH --> GEMINI
  CARE --> PG
  MKT --> PG
  WORKER --> PG
  WORKER --> RESEND
```

**Middleware chain** (order matters, `apps/api/internal/httpx/server.go`):
`RequestID -> RequestLogger -> Recovery -> CORS -> ReadinessGate`.

---

## 6. Database Schema Reference (23 tables)

Conventions: UUID PKs (`gen_random_uuid()`), `timestamptz`, soft-delete bằng `deleted_at` trên các bảng chính, FK với `ON DELETE` rõ ràng, `updated_at` duy trì bằng trigger `set_updated_at()`.

**Enums:** `account_status`, `kyc_status`, `care_type`.

### Group 1 — Auth & users

| Table | Purpose | Cột nổi bật |
|-------|---------|-------------|
| `users` | Tài khoản người dùng + các role flag | `email (CITEXT UNIQUE)`, `password_hash`, `is_player/is_seller/is_caretaker/is_system_admin`, `account_status`, `email_verified_at`, `kyc_status`, `deleted_at` |
| `refresh_tokens` | JWT refresh token đã hash để xoay vòng/thu hồi | `token_hash`, `expires_at`, `revoked_at` |
| `email_tokens` | Token một lần cho `verify_email`/`reset_password` | `purpose`, `token_hash`, `expires_at`, `used_at` |

### Group 2 — KYC

| Table | Purpose | Cột nổi bật |
|-------|---------|-------------|
| `kyc_submissions` | Hồ sơ định danh để bật quyền seller/caretaker | `document_type`, `document_front_url` (MinIO key, private), `document_back_url`, `selfie_url`, `status`, `reviewed_by`, `rejection_reason` |

### Group 3 — Plants & species

| Table | Purpose | Cột nổi bật |
|-------|---------|-------------|
| `plant_species` | Danh mục loài (sinh ra từ AI hoặc admin) | `scientific_name`, `common_names[]`, `family`, `care_profile (JSONB)`, `source ('ai'\|'admin')` |
| `user_plants` | Cây trong bộ sưu tập của user | `species_id`, `nickname`, `cover_url`, `location`, `status ('healthy'\|'sick'\|'recovering'\|'dead')`, `deleted_at` |
| `plant_photos` | Ảnh theo dòng thời gian của một cây | `kind ('identification'\|'progress'\|'disease')`, `taken_at` |

### Group 4 — AI: identification, diseases, diagnoses, treatment

| Table | Purpose | Cột nổi bật |
|-------|---------|-------------|
| `identifications` | Lưu mỗi lần nhận diện (luôn lưu raw) | `photo_url`, `provider`, `model`, `species_id`, `result (JSONB)`, `confidence` |
| `diseases` | Danh mục bệnh tham chiếu | `name`, `scientific_name`, `category`, `symptoms`, `causes` |
| `diagnoses` | Mỗi lần chẩn đoán bệnh | `photo_urls[]`, `symptoms_text`, `disease_id`, `severity`, `confidence`, `result (JSONB)` |
| `treatment_plans` | Kế hoạch điều trị gắn với một diagnosis | `diagnosis_id`, `duration_days`, `status`, `summary`, `prevention` |
| `treatment_steps` | Các bước điều trị theo ngày | `day_offset`, `title`, `description`, `completed_at` |

### Group 5 — Care & reminders

| Table | Purpose | Cột nổi bật |
|-------|---------|-------------|
| `care_schedules` | Lịch chăm sóc lặp lại | `type (care_type)`, `frequency_days`, `time_of_day`, `next_due_at`, `active` |
| `care_logs` | Nhật ký đã chăm sóc | `schedule_id`, `type`, `done_at` |
| `notifications` | Thông báo in-app (và nguồn cho push) | `type ('care_reminder'\|'kyc_update'\|'message'\|'system')`, `scheduled_at`, `sent_at`, `read_at`, `data (JSONB)` |
| `push_tokens` | Token thiết bị cho push | `platform ('ios'\|'android'\|'web')`, `token`, `UNIQUE(user_id, token)` |

### Group 6 — Marketplace & community

| Table | Purpose | Cột nổi bật |
|-------|---------|-------------|
| `listings` | Tin đăng bán cây / dịch vụ chăm sóc | `kind ('plant_sale'\|'care_service')`, `price`, `currency (default VND)`, `photos[]`, `status` |
| `conversations` | Phiên hội thoại 1-1 (hoặc nhóm) | `id`, `created_at` |
| `conversation_participants` | Thành viên hội thoại | PK `(conversation_id, user_id)` |
| `messages` | Tin nhắn trong hội thoại | `sender_id`, `body`, `read_at` |
| `reviews` | Đánh giá người bán/dịch vụ | `target_user_id`, `listing_id`, `rating (1..5)`, `comment` |

### Group 7 — System configuration (activation gate)

| Table | Purpose | Cột nổi bật |
|-------|---------|-------------|
| `system_configs` | Key-value cấu hình; secret mã hóa AES-256-GCM | PK `key`, `value_enc (BYTEA, NULL = unset)`, `is_secret`, `category ('ai'\|'email'\|'storage'\|'general')` |
| `ai_providers` | Cấu hình các AI provider | `type ('gemini'\|'openai'\|...)`, `api_key_enc (BYTEA)`, `model`, `enabled`, `is_default` (unique partial index) |

> **Tổng: 23 tables.** Các bảng `users`, `user_plants` dùng soft-delete (`deleted_at`). Chỉ một `ai_providers.is_default = true` tại một thời điểm (đảm bảo bởi `uniq_ai_provider_default`).

---

## 7. Readiness Gate (Activation Gate)

App từ chối lưu lượng nghiệp vụ cho tới khi admin cấu hình xong các tích hợp bắt buộc (AI provider, email, storage).

### 7.1 Config keys bắt buộc

| Check key | Nguồn | Required for `ready` |
|-----------|-------|----------------------|
| `database` | Kết nối Postgres (`Ping`) | Luôn bắt buộc |
| `ai_provider` | `ai_providers`: tồn tại provider `enabled` có `api_key_enc` | Bắt buộc khi cấu hình thật được nối (Phase 1) |
| `email` | `system_configs['resend_api_key']` đã set | Bắt buộc |
| `storage` | MinIO bucket reachable | Bắt buộc |

### 7.2 `GET /api/v1/system/status` contract

Public, không cần auth. Luôn trả **HTTP 200** (informational). `ReadinessGate` middleware mới là nơi trả 503.

```json
{
  "ready": false,
  "version": "1.0.0",
  "missing": ["ai_provider", "email", "storage"],
  "checks": {
    "database":    { "ok": true },
    "ai_provider": { "ok": false, "detail": "no enabled AI provider with API key (configure in Admin)" },
    "email":       { "ok": false, "detail": "Resend API key not configured (configure in Admin)" },
    "storage":     { "ok": false, "detail": "object storage not verified (configure in Admin)" }
  },
  "checked_at": "2026-06-19T08:00:00Z"
}
```

TS contract (`packages/shared/src/types/system.ts`):

```ts
export interface ReadinessCheck { ok: boolean; detail?: string; }
export interface SystemStatus {
  ready: boolean;
  version: string;
  missing: string[];
  checks: Record<string, ReadinessCheck>;
  checked_at: string;
}
```

### 7.3 Middleware behavior

`ReadinessGate(rs, allowPrefixes)` (`apps/api/internal/httpx/middleware.go`):

- Allowlist prefixes luôn được đi qua, kể cả khi chưa ready:
  - `/api/v1/system`
  - `/api/v1/admin/setup`
  - `/api/v1/auth/login` (admin phải đăng nhập được để hoàn tất setup)
- Mọi route khác: nếu `Snapshot().Ready == false` → trả `503` với envelope:

```json
{ "error": { "code": "SYSTEM_NOT_READY", "message": "system is not configured yet; please try again later" } }
```

### 7.4 Frontend behavior

Client gọi `system.status()` trước tiên khi khởi động:

```mermaid
flowchart TD
  START["App boot"] --> CALL["GET /system/status"]
  CALL --> READY{ready?}
  READY -->|yes| APP["Render app bình thường"]
  READY -->|no| WHO{user là admin?}
  WHO -->|admin| WIZARD["Admin Setup Wizard\n(nhập keys, chọn provider)"]
  WHO -->|user thường| SETUP["Màn 'System is being set up'\n(không cho vào nghiệp vụ)"]
```

Client cũng xử lý `ApiError.isSystemNotReady` (`code === 'SYSTEM_NOT_READY' || status === 503`) cho bất kỳ request nào bị chặn giữa chừng.

### 7.5 Bootstrap admin

Khi migrate lần đầu, một `system_admin` được seed từ env:

- `BOOTSTRAP_ADMIN_EMAIL` (default `admin@canopy.local`)
- `BOOTSTRAP_ADMIN_PASSWORD`

Admin này đăng nhập (qua route allowlisted) → mở Setup Wizard → nhập Gemini key, Resend key, xác nhận MinIO → các check chuyển `ok: true` → `ready: true`.

### 7.6 Caching

`Readiness.Snapshot` đủ rẻ để gọi mỗi request ở Phase 0. Phase 1 thêm cache ngắn hạn (in-memory TTL) với **invalidation khi admin đổi config** để tránh ping DB/MinIO mỗi request.

---

## 8. AI Orchestration

### 8.1 `AIProvider` interface (provider-agnostic)

Gemini là default nhưng nằm sau interface trừu tượng để có thể thay (OpenAI, v.v.). Cấu hình provider lấy từ `ai_providers` (key đã giải mã AES-256-GCM tại runtime).

```go
type AIProvider interface {
    Identify(ctx context.Context, in IdentifyInput) (IdentifyResult, RawResponse, error)
    Diagnose(ctx context.Context, in DiagnoseInput) (DiagnoseResult, RawResponse, error)
    TreatmentPlan(ctx context.Context, in TreatmentInput) (TreatmentPlan, RawResponse, error)
    CareProfile(ctx context.Context, in CareProfileInput) (CareProfile, RawResponse, error)
}
```

### 8.2 Bốn endpoint AI và output schema

Tất cả gọi Gemini với `responseMimeType: "application/json"` + `responseSchema` để ép cấu trúc, và **luôn lưu raw response** vào cột `result (JSONB)` của bảng tương ứng.

#### (1) `POST /ai/identify` → `IdentifyResult`

```ts
interface IdentifyResult {
  scientific_name: string;
  common_names: string[];
  family: string;
  confidence: number;                                  // 0..1
  alternatives: { scientific_name: string; confidence: number }[];
  characteristics: string[];
  care_profile: CareProfile;
}
```

#### (2) `POST /ai/diagnose` → `DiagnoseResult`

```ts
interface DiagnoseResult {
  disease_name: string;
  category: 'fungal'|'bacterial'|'viral'|'pest'|'nutrient'|'environmental'|'unknown';
  confidence: number;
  severity: 'mild'|'moderate'|'severe';
  observed_symptoms: string[];
  likely_causes: string[];
  differential: { name: string; confidence: number }[];
  immediate_actions: string[];
  needs_more_info: string[];
}
```

#### (3) `POST /ai/treatment-plan` → `TreatmentPlan`

```ts
interface TreatmentStep {
  id?: string;
  day_offset: number;
  title: string;
  description: string;
  completed_at?: string | null;
}
interface TreatmentPlan {
  id?: string;
  diagnosis_id?: string;
  duration_days: number;
  status?: 'active'|'completed'|'abandoned';
  summary: string;
  steps: TreatmentStep[];
  prevention: string;
  warning_signs: string[];
}
```

#### (4) Care profile → `CareProfile`

```ts
interface CareProfile {
  watering: string;
  light: string;
  soil: string;
  temperature: string;
  humidity: string;
  fertilizer: string;
  special_notes: string[];
}
```

### 8.3 Gemini prompt templates (tiếng Việt)

> Tất cả prompt yêu cầu trả về **JSON thuần** đúng schema (`responseSchema`). Không kèm văn xuôi ngoài JSON.

**Identify:**
```
Bạn là chuyên gia thực vật học. Phân tích ảnh cây được cung cấp và nhận diện loài.
Trả về JSON đúng schema: scientific_name, common_names, family, confidence (0..1),
alternatives (tối đa 3, kèm confidence), characteristics (đặc điểm quan sát được),
care_profile (watering, light, soil, temperature, humidity, fertilizer, special_notes).
Nếu không chắc, hạ confidence và liệt kê alternatives. Chỉ trả JSON.
```

**Diagnose:**
```
Bạn là chuyên gia bệnh học thực vật. Dựa trên ảnh lá/cây và mô tả triệu chứng
"{symptoms_text}", chẩn đoán bệnh có khả năng nhất.
Trả về JSON: disease_name, category (fungal/bacterial/viral/pest/nutrient/environmental/unknown),
confidence, severity (mild/moderate/severe), observed_symptoms, likely_causes,
differential (chẩn đoán phân biệt kèm confidence), immediate_actions (việc cần làm ngay),
needs_more_info (thông tin/ảnh cần bổ sung nếu thiếu). Chỉ trả JSON.
```

**Treatment plan:**
```
Lập kế hoạch điều trị chi tiết theo từng ngày cho chẩn đoán: {diagnosis_summary}.
Trả về JSON: duration_days, summary, steps (mảng {day_offset, title, description}
sắp theo ngày), prevention (phòng ngừa tái phát), warning_signs (dấu hiệu cảnh báo
cần can thiệp). Hướng dẫn an toàn, ưu tiên biện pháp hữu cơ trước hóa chất. Chỉ trả JSON.
```

**Care profile:**
```
Cung cấp hồ sơ chăm sóc cho loài {scientific_name}.
Trả về JSON: watering, light, soil, temperature, humidity, fertilizer, special_notes[].
Viết ngắn gọn, thực dụng cho người trồng tại nhà ở khí hậu Việt Nam. Chỉ trả JSON.
```

### 8.4 Operational rules cho AI calls

| Rule | Chi tiết |
|------|----------|
| Timeouts | Per-call context timeout (mặc định ~30s, cấu hình được) |
| Retry | Retry idempotent với backoff khi lỗi tạm thời (5xx/timeout) |
| Resize | Ảnh được resize/nén trước khi gửi để giảm payload và chi phí token |
| Rate-limit | `RATE_LIMIT_AI_PER_MIN` (default 20) per user |
| Store raw | **Luôn** lưu raw response vào `result (JSONB)` để audit/replay |
| Structured output | `responseMimeType: application/json` + `responseSchema` |
| Disclaimer | Luôn hiển thị `AI_DISCLAIMER` cạnh kết quả AI |

```ts
export const AI_DISCLAIMER =
  'Kết quả AI mang tính tham khảo, không thay thế ý kiến chuyên gia thực vật.';
```

---

## 9. KYC & Email Verification Flow

### 9.1 Email verification (Resend)

```mermaid
sequenceDiagram
  participant C as Client
  participant API as Go API
  participant DB as Postgres
  participant R as Resend
  C->>API: POST /auth/register
  API->>DB: insert users (account_status=pending)
  API->>DB: insert email_tokens (purpose=verify_email, token_hash)
  API->>R: send verification email (link chứa raw token)
  C->>API: POST /auth/verify-email { token }
  API->>DB: match token_hash, set used_at, set users.email_verified_at
  API-->>C: 204 No Content
```

- Token lưu dạng **hash** (`email_tokens.token_hash`), raw token chỉ nằm trong link email.
- `email_tokens.purpose`: `verify_email` | `reset_password`.

### 9.2 KYC flow (bật quyền seller/caretaker)

```mermaid
sequenceDiagram
  participant C as Client
  participant API as Go API
  participant M as MinIO (private)
  participant A as Admin
  C->>API: POST /uploads/presign (purpose=kyc)
  API-->>C: { upload_url, object_key }  (private bucket)
  C->>M: PUT ảnh giấy tờ + selfie (presigned)
  C->>API: POST /kyc/submit { document_front_url, ... }
  API->>API: users.kyc_status = submitted
  A->>API: GET /admin/kyc (list submitted)
  A->>API: POST /admin/kyc/{id}/approve | reject
  API->>API: users.kyc_status = verified | rejected
  API-->>C: notification (kyc_update)
```

KYC documents lưu trong **bucket private** của MinIO; chỉ truy cập qua presigned GET có thời hạn ngắn, do admin/owner yêu cầu.

---

## 10. MinIO Upload Flow (presigned)

Client không gửi file qua API; API chỉ cấp presigned URL, client upload trực tiếp lên MinIO.

```mermaid
sequenceDiagram
  participant C as Client
  participant API as Go API
  participant M as MinIO
  C->>API: POST /uploads/presign { content_type, purpose }
  API->>API: validate content_type, sinh object_key theo purpose
  API->>M: tạo presigned PUT URL
  API-->>C: { upload_url, object_key }
  C->>M: PUT file -> upload_url
  C->>API: dùng object_key trong payload (plant cover, photo_key, kyc...)
```

- Response: `{ upload_url: string, object_key: string }`.
- `purpose` quyết định prefix/bucket (vd `kyc` → private bucket; `plant`/`identification` → bucket thường).
- Ảnh AI: client upload trước, lấy `object_key`, truyền vào `POST /ai/identify { photo_key }` hoặc `POST /ai/diagnose { photo_keys[] }`.

---

## 11. REST API Surface

**Prefix:** `/api/v1`. **Content-Type:** `application/json`.

**Standardized error envelope** (`apps/api/internal/httpx/response.go`):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "human readable", "details": { } } }
```

**Stable error codes:** `SYSTEM_NOT_READY`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR`, `NETWORK_ERROR` (client-side), `HTTP_ERROR` (client fallback).

### 11.1 System / config

| Method | Path | Auth | Gate | Mô tả |
|--------|------|------|------|-------|
| GET | `/system/status` | none | allowlisted | Readiness snapshot |
| GET | `/system/health` | none | allowlisted | Liveness probe |
| GET | `/admin/config` | admin | allowlisted (`/admin/setup`) | Đọc cấu hình (secret bị mask) |
| PUT | `/admin/config` | admin | allowlisted | Set config keys (vd `resend_api_key`) |
| GET | `/admin/ai-providers` | admin | allowlisted | Liệt kê providers |
| POST | `/admin/ai-providers` | admin | allowlisted | Tạo/cấu hình provider (Gemini key, model) |
| POST | `/admin/ai-providers/{id}/default` | admin | allowlisted | Đặt default provider |

### 11.2 Auth

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/auth/register` | none | Đăng ký (mặc định `is_player=true`, status `pending`) |
| POST | `/auth/login` | none | Đăng nhập → access + refresh token (allowlisted) |
| POST | `/auth/refresh` | refresh | Xoay access token (single-flight ở client) |
| POST | `/auth/logout` | bearer | Thu hồi refresh token |
| GET | `/auth/me` | bearer | Lấy user hiện tại |
| POST | `/auth/verify-email` | none | Xác thực email bằng token |
| POST | `/auth/forgot-password` | none | Gửi email reset password |

### 11.3 KYC

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/kyc/submit` | bearer | Nộp hồ sơ KYC (object keys từ presign) |
| GET | `/kyc/me` | bearer | Trạng thái KYC của tôi |
| GET | `/admin/kyc` | admin | Danh sách hồ sơ chờ duyệt |
| POST | `/admin/kyc/{id}/approve` | admin | Duyệt → `verified` |
| POST | `/admin/kyc/{id}/reject` | admin | Từ chối → `rejected` + reason |

### 11.4 Uploads

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/uploads/presign` | bearer | `{ content_type, purpose }` → `{ upload_url, object_key }` |

### 11.5 Plants

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/plants` | bearer | Danh sách cây của tôi |
| POST | `/plants` | bearer | Thêm cây |
| GET | `/plants/{id}` | bearer | Chi tiết cây |
| PUT | `/plants/{id}` | bearer | Cập nhật |
| DELETE | `/plants/{id}` | bearer | Soft-delete |

### 11.6 AI

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/ai/identify` | bearer | `{ photo_key }` → `IdentifyResult` |
| POST | `/ai/diagnose` | bearer | `{ photo_keys[], symptoms_text?, species_id? }` → `DiagnoseResult` |
| POST | `/ai/treatment-plan` | bearer | `{ diagnosis_id }` → `TreatmentPlan` |

### 11.7 Care

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/care/schedules` | bearer | Lịch chăm sóc |
| POST | `/care/schedules` | bearer | Tạo lịch |
| PUT | `/care/schedules/{id}` | bearer | Sửa lịch |
| POST | `/care/schedules/{id}/done` | bearer | Đánh dấu đã làm → ghi `care_logs`, tính `next_due_at` |
| GET | `/notifications` | bearer | Danh sách thông báo |
| POST | `/notifications/{id}/read` | bearer | Đánh dấu đã đọc |
| POST | `/push-tokens` | bearer | Đăng ký device token |

### 11.8 Marketplace

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/listings` | bearer | Lọc theo `kind`, `species_id`, `location` |
| POST | `/listings` | seller/caretaker (KYC verified) | Đăng tin |
| GET | `/listings/{id}` | bearer | Chi tiết tin |
| POST | `/conversations` | bearer | Mở hội thoại với người bán |
| GET | `/conversations` | bearer | Danh sách hội thoại |
| GET | `/conversations/{id}/messages` | bearer | Lịch sử tin nhắn |
| POST | `/conversations/{id}/messages` | bearer | Gửi tin nhắn |
| POST | `/reviews` | bearer | Đánh giá (rating 1..5) |

---

## 12. Background Worker (Reminders)

Một worker chạy nền (ticker) để biến `care_schedules` thành `notifications` và đẩy push qua `push_tokens`.

```mermaid
flowchart LR
  TICK["Ticker (mỗi phút)"] --> Q["SELECT care_schedules\nWHERE active AND next_due_at <= now()"]
  Q --> N["INSERT notifications\n(type=care_reminder)"]
  N --> PUSH["Gửi push tới push_tokens\n(ios/android/web)"]
  N --> ADV["Cập nhật next_due_at += frequency_days"]
```

- Idempotent: chỉ tạo notification một lần cho mỗi due window.
- `notifications.sent_at` đánh dấu đã gửi; `read_at` khi user đọc.
- Dùng index `idx_care_schedules_due` (partial `WHERE active`) cho hiệu năng.

---

## 13. Security & Ops Rules

| Domain | Rule |
|--------|------|
| Secrets at rest | Gemini/Resend keys mã hóa AES-256-GCM trong DB; chỉ `CONFIG_ENCRYPTION_KEY` (base64 32 bytes) trong env. Production bắt buộc có key hợp lệ. |
| Crypto envelope | `nonce(12) \|\| ciphertext \|\| tag` (`crypto/cipher` GCM `Seal`). |
| Passwords | bcrypt hash, không bao giờ log. |
| JWT | access TTL ngắn (`15m`), refresh TTL dài (`720h`); refresh token lưu hash, xoay vòng + thu hồi (`revoked_at`). |
| Tokens (email/refresh) | Lưu **hash**, raw chỉ trong link/cookie/response một lần. |
| Logging | slog structured; không log secret, password, token, hay nội dung nhạy cảm. |
| CORS | Chỉ allow origin trong `CORS_ALLOWED_ORIGINS`. |
| Rate limiting | `RATE_LIMIT_AUTH_PER_MIN` (10), `RATE_LIMIT_AI_PER_MIN` (20). |
| KYC storage | Bucket private; truy cập qua presigned GET có hạn. |
| Readiness gate | Chặn route nghiệp vụ khi chưa cấu hình (503). |
| Panic safety | `Recovery` middleware → 500 chuẩn, không crash. |
| Request tracing | `X-Request-ID` propagate + log correlation. |
| Admin masking | `GET /admin/config` trả secret đã mask, không trả plaintext. |

---

## 14. Environment Variables Reference

> Lưu ý: Gemini key và Resend key **không** ở đây — nhập trong Admin portal.

| Var | Default | Mô tả |
|-----|---------|-------|
| `APP_ENV` | `development` | `development \| staging \| production` |
| `APP_PORT` | `8080` | Cổng API |
| `APP_BASE_URL` | `http://localhost:5173` | Base URL cho link trong email |
| `API_PUBLIC_URL` | `http://localhost:8080` | Base các client gọi |
| `LOG_LEVEL` | `info` | `debug \| info \| warn \| error` |
| `LOG_FORMAT` | `text` | `text \| json` (json ở prod) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | CSV origin |
| `DATABASE_URL` | `postgres://canopy:canopy@localhost:5432/canopy?sslmode=disable` | Postgres DSN |
| `DB_MAX_CONNS` | `10` | pgxpool max |
| `DB_MIN_CONNS` | `2` | pgxpool min |
| `JWT_ACCESS_SECRET` | — | Secret access token |
| `JWT_REFRESH_SECRET` | — | Secret refresh token |
| `JWT_ACCESS_TTL` | `15m` | TTL access |
| `JWT_REFRESH_TTL` | `720h` | TTL refresh |
| `CONFIG_ENCRYPTION_KEY` | (dev key) | **base64 32 bytes**; bắt buộc ở production (`openssl rand -base64 32`) |
| `BOOTSTRAP_ADMIN_EMAIL` | `admin@canopy.local` | Seed admin lần đầu |
| `BOOTSTRAP_ADMIN_PASSWORD` | — | Seed admin password |
| `MINIO_ENDPOINT` | `localhost:9000` | S3 endpoint |
| `MINIO_ACCESS_KEY` | `canopyadmin` | |
| `MINIO_SECRET_KEY` | `canopyadmin` | |
| `MINIO_BUCKET` | `canopy` | Bucket mặc định |
| `MINIO_USE_SSL` | `false` | |
| `MINIO_PUBLIC_URL` | `http://localhost:9000` | Base cho presigned URL |
| `POSTGRES_PORT` | `5432` | Host port override |
| `MINIO_API_PORT` | `9000` | Host port override |
| `MINIO_CONSOLE_PORT` | `9001` | Host port override |
| `RATE_LIMIT_AUTH_PER_MIN` | `10` | |
| `RATE_LIMIT_AI_PER_MIN` | `20` | |
| `VITE_API_BASE_URL` | `http://localhost:8080/api/v1` | Build-time cho web |

---

*End of SPEC.md*
