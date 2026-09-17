# Reetayn (reetayn.com) — Zero-Touch Churn Elimination Utility & Stripe App

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Stripe Apps](https://img.shields.io/badge/Stripe_Apps-SDK_v9-635BFF.svg)](https://stripe.com/docs/stripe-apps)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748.svg)](https://www.prisma.io/)
[![Tests](https://img.shields.io/badge/Tests-21%20Passed-emerald.svg)](https://vitest.dev/)

> **Mission Brief:** Reetayn is a zero-touch, high-margin B2B subscription utility and native Stripe App designed to eliminate involuntary churn and payment failures **before renewals fail**.

An **[EM300.co](https://em300.co)** Company.

---

## Documentation Index

Comprehensive engineering guides are available in the [`docs/`](./docs) directory:

| Document | Topic | Description |
| :--- | :--- | :--- |
| **[Architecture Blueprint](./docs/ARCHITECTURE.md)** | System Design | Full data flow diagrams, security boundaries, and async pipelines. |
| **[Scoring Heuristic](./docs/SCORING_HEURISTIC.md)** | Mathematical Heuristic | UTC month-end proofs, leap-year calculations, and tier definitions. |
| **[Webhook Engine & Security](./docs/WEBHOOK_ENGINE.md)** | Webhook & Ingestion | Raw body verification, secret rotation defense playbook, and SLA limits. |
| **[Stripe App Extension](./docs/STRIPE_APP_EXTENSION.md)** | Stripe App SDK v9 | Manifest specification, drawer view, home overview, and clipboard APIs. |
| **[REST API Reference](./docs/API_REFERENCE.md)** | API Documentation | Endpoints, query parameters, payloads, and response schemas. |
| **[Deployment & Operations](./docs/DEPLOYMENT_GUIDE.md)** | Production Deployment | Docker, Vercel, PostgreSQL setup, and Stripe Marketplace checklist. |
| **[Subscriber Rescue Journey](./docs/SUBSCRIBER_JOURNEY.md)** | Lifecycle State Machine | State machine and sequence flow for automated churn prevention. |

---

## Architecture & System Overview

```mermaid
flowchart TD
    subgraph Stripe Ecosystem
        SE_SUB[customer.subscription.created / updated]
        SE_INV[invoice.payment_failed]
        SE_PM[payment_method.attached / updated]
        D_DRAWER[Native Stripe Drawer View<br/>stripe.dashboard.customer.detail]
        D_HOME[Native Stripe Overview View<br/>stripe.dashboard.home.overview]
    end

    subgraph Reetayn Cloud Engine
        WH[Webhook Ingestion Engine<br/>src/app/api/webhooks/stripe/route.ts]
        SEC_ROT[Raw-Body Signature Verification<br/>with Secret Rotation Defense]
        SCORE[Deterministic Churn Heuristic<br/>src/lib/scoring.ts]
        PORTAL[1-Click Rescue Link Generator<br/>src/lib/stripe.ts]
    end

    subgraph Data & Storage
        PG[(PostgreSQL Database)]
        PRISMA[Prisma ORM<br/>TrackedCustomer + Merchant + RescueLog]
    end

    subgraph Subscriber Experience
        CUST[Subscriber]
        PORTAL_UI[Single-Use Customer Portal<br/>payment_method_update flow]
        SUCC[Instant Confirmation<br/>src/app/rescue/success]
    end

    SE_SUB -->|POST Webhook| WH
    SE_INV -->|POST Webhook| WH
    SE_PM -->|POST Webhook| WH
    WH --> SEC_ROT --> SCORE
    SCORE -->|Composite Index Upsert| PRISMA
    PRISMA --> PG

    D_DRAWER -->|GET /api/customers/risk| SCORE
    D_DRAWER -->|POST /api/rescue/generate-link| PORTAL
    D_HOME -->|GET /api/metrics| PRISMA

    PORTAL -->|Single-Use URL| CUST
    CUST --> PORTAL_UI --> SUCC
    PORTAL_UI -->|payment_method.updated| SE_PM
    SE_PM -->|Reset Failures to 0 & Resolve RescueLog| PRISMA
```

---

## 1. Deterministic Churn Risk Heuristic (`src/lib/scoring.ts`)

Reetayn evaluates subscription payment friction deterministically using exact UTC card expiration mathematics and billing renewal period ends:

| Risk Tier | Trigger Conditions | Action & Escalation |
| :--- | :--- | :--- |
| **`CRITICAL`** | • `consecutiveFailures >= 2`<br/>• Card expiration date `< nextRenewalDate` (guaranteed failure)<br/>• Card already expired relative to current reference instant | • Badge: **Payment At Immediate Risk**<br/>• Auto-Rescue generates single-use billing portal URL<br/>• Recorded in `RescueLog` as `DISPATCHED` |
| **`HIGH`** | • Card expiration within **30 days** of next renewal date<br/>• Soft decline code logged within the last **7 days** (`insufficient_funds`, `try_again_later`, `card_velocity_exceeded`) | • Badge: **Expiring Before Next Cycle**<br/>• Proactive notifications queued<br/>• Drawer highlights renewal risk |
| **`MEDIUM`** | • Card expiration within **60 days** of renewal date<br/>• 1 failure logged (Stripe smart retries active) | • Badge: **Expiring Soon (30-60 Days)**<br/>• Monitored proactively |
| **`LOW`** | • Card valid for **> 60 days** past next renewal<br/>• Zero recent failures | • Badge: **Payment Method Healthy**<br/>• Nominal subscription state |

---

## 2. Webhook Ingestion Engine (`src/app/api/webhooks/stripe/route.ts`)

- **Sub-250ms Response Time:** Optimized database operations and indexing guarantee responses well within Stripe's 250ms drop threshold.
- **Raw Body Signature Verification:** Verified using Next.js App Router `req.text()` to preserve exact payload bytes.
- **Secret Rotation Defense:** Supports comma-delimited `STRIPE_WEBHOOK_SECRET` and fallback candidates (`STRIPE_WEBHOOK_SECRET_SECONDARY`) to prevent downtime during key rotations.
- **Event Handling:**
  - `customer.subscription.updated` / `created`: Ingests upcoming `current_period_end` as `nextRenewalDate`, extracts card expiration details, evaluates churn score, and upserts `TrackedCustomer`.
  - `invoice.payment_failed`: Increments `consecutiveFailures`, ingests `decline_code`, escalates to `CRITICAL`, and generates an automated 1-click rescue portal link if `merchant.settingsAutoRescue == true`.
  - `payment_method.attached` / `updated`: Resets `consecutiveFailures = 0`, recalculates risk to `LOW`, and marks pending `RescueLog` records as `RESOLVED`.

---

## 3. Stripe App Manifest & UI Extension

### Manifest (`stripe-app.json`)
Configured for native drawer and overview viewports with restricted security permissions:
- `stripe.dashboard.customer.detail` &rarr; `CustomerRiskDrawer`
- `stripe.dashboard.home.overview` &rarr; `OverviewDashboard`

### Drawer Extension (`src/views/CustomerRiskDrawer.tsx`)
Constructed using `@stripe/ui-extension-sdk/ui` primitives (`ContextView`, `Box`, `Button`, `Banner`, `Badge`, `PropertyList`, `Divider`):
- Reads contextual customer ID via `environment.objectContext.id`
- Queries live risk analysis from `/api/customers/risk`
- One-click **"Generate Instant Recovery Link"** copies single-use card update link to clipboard via `@stripe/ui-extension-sdk/clipboard`

---

## 4. Environment Configuration

Create a `.env` file in the project root:

```env
# Database Connection URL (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reetayn?schema=public"

# Stripe API Keys
STRIPE_API_KEY="sk_test_51...your_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="pk_test_51...your_stripe_publishable_key"

# Stripe Webhook Signing Secret (Supports comma-separated secrets for rotation defense)
STRIPE_WEBHOOK_SECRET="whsec_...primary_secret"
STRIPE_WEBHOOK_SECRET_SECONDARY="whsec_...rotation_candidate_secret"

# Reetayn Application URL & Encryption Key
NEXT_PUBLIC_APP_URL="https://reetayn.com"
ENCRYPTION_SECRET="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

---

## 5. Local Installation & Development

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/reetayn/reetayn.git
cd reetayn
npm install
```

### 2. Generate Prisma Client & Migrate Database
```bash
# Generate Prisma Client
npx prisma generate

# Apply migrations to your PostgreSQL instance
npx prisma migrate dev --name init
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the Reetayn marketing portal and [http://localhost:3000/dashboard](http://localhost:3000/dashboard) to view the merchant dashboard.

---

## 6. Testing & Stripe CLI Simulation

### Run Automated Unit Tests (Vitest)
```bash
npm test
```
Runs 21 unit tests covering leap years, month roll-over, multi-failure escalation, soft declines, and secret rotation defense.

### Run TypeScript & Lint Gates
```bash
npm run typecheck
npm run lint
```

### Stripe CLI Webhook Forwarding
Forward live Stripe events directly to your local Reetayn webhook engine:

```bash
# 1. Login to Stripe CLI
stripe login

# 2. Forward events to local route
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
Copy the webhook signing secret output by `stripe listen` (`whsec_...`) and paste it into your `.env` as `STRIPE_WEBHOOK_SECRET`.

### Trigger Test Events
```bash
# Simulate subscription creation
stripe trigger customer.subscription.created

# Simulate invoice payment failure (triggers auto-rescue portal generation)
stripe trigger invoice.payment_failed

# Simulate payment method update (triggers resolution and failure reset)
stripe trigger payment_method.updated
```

### Start Stripe App Local Emulator
```bash
stripe apps start
```
Open your Stripe Dashboard to view the native Reetayn Customer Detail drawer and Home Overview widget in test mode.

---

## 7. Quality Gates Summary

- [x] Strict TypeScript 5+ compilation (`tsc --noEmit` &rarr; 0 errors).
- [x] 21 automated unit tests in `__tests__/scoring.test.ts` & `__tests__/webhook.test.ts`.
- [x] Sub-250ms webhook response with raw body signature verification and secret rotation defense.
- [x] Composite indexed database queries (`merchantId` + `stripeCustomerId`).
- [x] Official `@stripe/ui-extension-sdk` v9 UI components for drawer & overview.
- [x] Zero-login 1-click rescue portal generation via `stripe.billingPortal.sessions.create`.
