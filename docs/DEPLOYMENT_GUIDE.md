# Reetayn Production Deployment & Operations Guide

## 1. Production Architecture Checklist

Before deploying Reetayn to production, ensure the following requirements are met:
- [ ] Managed PostgreSQL 15+ database (Supabase, Neon, AWS RDS, or Railway).
- [ ] Stripe Account in Live Mode with App Developer privileges.
- [ ] HTTPS domain (`https://reetayn.com`).
- [ ] High-entropy 32-byte secret for `ENCRYPTION_SECRET`.

---

## 2. Environment Variables Configuration

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection pool URL. | `postgresql://user:pass@host:5432/reetayn?sslmode=require` |
| `STRIPE_API_KEY` | **Yes** | Live Stripe Secret Key (`sk_live_...`). | `sk_live_51...` |
| `STRIPE_PUBLISHABLE_KEY` | **Yes** | Live Stripe Publishable Key (`pk_live_...`). | `pk_live_51...` |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | Primary Webhook Signing Secret (`whsec_...`). | `whsec_live_...` |
| `STRIPE_WEBHOOK_SECRET_SECONDARY` | No | Secondary candidate for secret rotation defense. | `whsec_rot_...` |
| `ENCRYPTION_SECRET` | **Yes** | 64-char hex string (32 bytes) for AES-256-GCM. | `a4f9b2c3d4e5...` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Canonical public URL. | `https://reetayn.com` |

---

## 3. Database Migration & Initialization

Apply the Prisma schema to your production database:

```bash
# Apply migrations to production database
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

---

## 4. Deploying to Vercel

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Link & Deploy
vercel --prod
```

Configure the environment variables listed above in the Vercel Dashboard under **Project Settings &rarr; Environment Variables**.

---

## 5. Docker Deployment

If deploying to AWS ECS, Google Cloud Run, or a VPS:

### `Dockerfile`
```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
ENV PORT=3000
CMD ["npm", "start"]
```

---

## 6. Stripe App Marketplace Publishing Checklist

1. **Manifest Validation:** Ensure `stripe-app.json` has icon asset at `assets/icon.png` (128x128 PNG).
2. **Review Permissions:** Verify permissions match minimum operational requirements (`customers_read`, `subscriptions_read`, `payment_methods_read`, `billing_portal_write`).
3. **Upload App Bundle:**
   ```bash
   stripe apps upload
   ```
4. **Submit for Review:** Navigate to the Stripe Partner Dashboard and submit Reetayn for marketplace publication.
