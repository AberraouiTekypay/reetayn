# Reetayn System Architecture Specification

## 1. High-Level Architecture

Reetayn is an event-driven, zero-touch B2B subscription utility and native Stripe App. It intercepts payment failure vectors *before* they manifest as involuntary churn.

```mermaid
flowchart TD
    subgraph "External Billing & Gateway: Stripe"
        SUB_EVENT["Event: customer.subscription.created/updated"]
        FAIL_EVENT["Event: invoice.payment_failed"]
        UPD_EVENT["Event: payment_method.attached/updated"]
        D_DRAWER["Stripe Dashboard Drawer<br/>(stripe.dashboard.customer.detail)"]
        D_HOME["Stripe Home Overview<br/>(stripe.dashboard.home.overview)"]
        PORTAL_EP["Stripe Billing Portal API<br/>(billingPortal.sessions.create)"]
    end

    subgraph "Reetayn Ingestion & Verification"
        RAW_EP["Raw Body Webhook Receiver<br/>(/api/webhooks/stripe)"]
        SEC_ROT["Secret Rotation Verifier<br/>(verifyStripeWebhookWithRotation)"]
        AES_DEC["Token Decryptor<br/>(AES-256-GCM)"]
    end

    subgraph "Core Intelligence Engine"
        HEURISTIC["Deterministic Churn Heuristic<br/>(calculateChurnRisk)"]
        DATE_CALC["UTC Month-End & Leap-Year Engine<br/>(getCardExpirationDate)"]
        AUTO_RESCUE["Auto-Rescue Dispatcher<br/>(createRescuePortalSession)"]
    end

    subgraph "Persistence Layer (PostgreSQL)"
        DB_MERCHANT["Merchant Model<br/>(Settings, Encrypted Tokens)"]
        DB_CUSTOMER["TrackedCustomer Model<br/>(Composite Key: merchantId + stripeCustomerId)"]
        DB_LOG["RescueLog Model<br/>(Audit Trail & Resolution Tracking)"]
    end

    subgraph "Subscriber Experience"
        SUBSCRIBER["Subscriber with Expiring/Failed Card"]
        ONE_CLICK["Single-Use 1-Click Update Link"]
        STRIPE_HOSTED["Stripe Hosted Card Update View"]
        CONFIRM_PAGE["Success Confirmation<br/>(/rescue/success)"]
    end

    %% Webhook flows
    SUB_EVENT -->|POST| RAW_EP
    FAIL_EVENT -->|POST| RAW_EP
    UPD_EVENT -->|POST| RAW_EP
    RAW_EP --> SEC_ROT
    SEC_ROT --> HEURISTIC
    HEURISTIC --> DATE_CALC
    HEURISTIC -->|Upsert via Composite Key| DB_CUSTOMER

    %% Auto rescue flows
    FAIL_EVENT -.->|Triggers when settingsAutoRescue=true| AUTO_RESCUE
    AUTO_RESCUE -->|API Request| PORTAL_EP
    PORTAL_EP -->|Return Single-Use URL| AUTO_RESCUE
    AUTO_RESCUE -->|Save URL & Log Event| DB_CUSTOMER
    AUTO_RESCUE -->|Create RescueLog (DISPATCHED)| DB_LOG

    %% UI Extension flows
    D_DRAWER -->|GET /api/customers/risk| DB_CUSTOMER
    D_DRAWER -->|POST /api/rescue/generate-link| AUTO_RESCUE
    D_HOME -->|GET /api/metrics| DB_CUSTOMER

    %% Subscriber interaction
    AUTO_RESCUE -.-> ONE_CLICK
    ONE_CLICK --> SUBSCRIBER
    SUBSCRIBER --> STRIPE_HOSTED
    STRIPE_HOSTED --> CONFIRM_PAGE
    STRIPE_HOSTED -->|Generates payment_method.updated| UPD_EVENT
    UPD_EVENT -->|Reset consecutiveFailures & mark RESOLVED| DB_CUSTOMER
    UPD_EVENT -->|Set status: RESOLVED| DB_LOG
```

---

## 2. Component Breakdown

### 2.1 Webhook Engine (`src/app/api/webhooks/stripe/route.ts`)
- **Raw-Body Intake:** Uses Next.js App Router `req.text()` to preserve the exact byte sequence transmitted by Stripe. Any intermediate JSON parsing before signature validation would invalidate the SHA-256 HMAC digest.
- **Latency Budget:** Designed for < 250ms response to stay well beneath Stripe's drop threshold. Heavy network lookups are guarded and prioritized through composite database indexes.
- **Secret Rotation Defense:** Handles rolling secret transitions via candidate iteration without server restarts or dropped webhook events.

### 2.2 Intelligence Engine (`src/lib/scoring.ts`)
- Evaluates risk deterministically with zero non-deterministic or external LLM dependencies, ensuring auditability and predictable behaviour.
- Evaluates 4 distinct risk tiers: `CRITICAL`, `HIGH`, `MEDIUM`, and `LOW`.
- Factors in:
  - Exact UTC card expiration instant vs upcoming renewal billing cycle.
  - Number of consecutive payment failures (1 retry vs 2+ hard escalations).
  - Stripe soft decline codes (`insufficient_funds`, `try_again_later`, `card_velocity_exceeded`) within a 7-day sliding window.

### 2.3 Stripe UI Extension Layer (`src/views/`)
- Native Stripe Apps v9 extension rendered inside the merchant's native Stripe dashboard.
- Utilizes official Stripe UI Toolkit components: `ContextView`, `Box`, `Badge`, `Banner`, `PropertyList`, `Button`.
- Operates inside the iframe sandbox with scoped permissions.
- Copies 1-click self-serve recovery URLs using `@stripe/ui-extension-sdk/clipboard`.

### 2.4 Data Persistence Layer (`prisma/schema.prisma`)
- **Strict Isolation:** Every customer record is scoped to a `merchantId`.
- **Composite Index Optimization:** Primary lookups utilize `@@unique([merchantId, stripeCustomerId])`, guaranteeing $O(1)$ indexed reads and updates during peak webhook throughput.
- **Audit Trails:** Every automated or manual intervention creates a `RescueLog` record with lifecycle tracking (`PENDING` $\to$ `DISPATCHED` $\to$ `RESOLVED` / `EXPIRED`).
