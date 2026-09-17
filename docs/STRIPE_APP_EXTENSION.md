# Stripe App UI Extension & Manifest Guide

## 1. App Manifest Specification (`stripe-app.json`)

The Stripe App manifest declares metadata, required capabilities, redirect URIs, and registered extension viewports.

```json
{
  "id": "com.reetayn.app",
  "version": "0.0.1",
  "name": "Reetayn",
  "icon": "./assets/icon.png",
  "permissions": [
    { "permission": "customers_read" },
    { "permission": "subscriptions_read" },
    { "permission": "payment_methods_read" },
    { "permission": "billing_portal_write" }
  ],
  "allowed_redirect_uris": [
    "https://reetayn.com/api/auth/callback"
  ],
  "ui_extension": {
    "views": [
      {
        "viewport": "stripe.dashboard.customer.detail",
        "component": "CustomerRiskDrawer"
      },
      {
        "viewport": "stripe.dashboard.home.overview",
        "component": "OverviewDashboard"
      }
    ]
  }
}
```

### Permission Scopes Justification
- `customers_read`: Required to identify customer metadata, default payment methods, and invoice settings.
- `subscriptions_read`: Required to inspect subscription recurring schedules and `current_period_end`.
- `payment_methods_read`: Required to read card expiration dates (`exp_month`, `exp_year`, `last4`, `brand`).
- `billing_portal_write`: Required to create single-use Customer Portal sessions for 1-click card recovery without requiring customer authentication.

---

## 2. Customer Detail Drawer (`src/views/CustomerRiskDrawer.tsx`)

### 2.1 Viewport Registration
Targeted at `stripe.dashboard.customer.detail`. Renders inside the right-hand collapsible drawer whenever an operator or support representative views a customer profile in the Stripe Dashboard.

### 2.2 Context Extraction
The contextual customer identifier is extracted from the SDK environment context:
```ts
const customerId =
  directCustomerId ||
  environment?.objectContext?.id ||
  '';
```

### 2.3 Visual Risk Indicator Badges
Matches Stripe UI design tokens:
- **`CRITICAL`:** `<Badge type="negative">Payment At Immediate Risk</Badge>`
- **`HIGH`:** `<Badge type="warning">Expiring Before Next Cycle</Badge>`
- **`MEDIUM`:** `<Badge type="warning">Expiring Soon (30-60 Days)</Badge>`
- **`LOW`:** `<Badge type="positive">Payment Method Healthy</Badge>`

### 2.4 One-Click Recovery Link Generation
1. Support rep clicks **"Generate Instant Recovery Link"**.
2. Client issues `POST` to `/api/rescue/generate-link`.
3. Reetayn calls `stripe.billingPortal.sessions.create` configured with `flow_data: { type: 'payment_method_update' }`.
4. The generated single-use URL is copied directly to the operator's clipboard via `clipboardWriteText(url)`.
5. An in-drawer `<Banner type="default">` confirms the link is copied and ready to be shared with the customer.

---

## 3. Home Overview Dashboard (`src/views/OverviewDashboard.tsx`)

### 3.1 Viewport Registration
Targeted at `stripe.dashboard.home.overview`. Renders at the top level of the merchant's Stripe Dashboard.

### 3.2 Displayed Intelligence
- **MRR At Risk This Cycle:** Currency-formatted aggregate value of subscriptions classified as `CRITICAL` and `HIGH`.
- **Subscribers at Risk:** Counter of critical and high risk accounts.
- **Automated Rescues Dispatched:** Count of automated single-use links sent.
- **Recovery Success Rate (%):** Percentage of rescue events that transitioned from `DISPATCHED` to `RESOLVED`.

---

## 4. Local Development & Testing

Use the Stripe CLI to preview and test the UI Extension locally:

```bash
# 1. Start Stripe Apps development server
stripe apps start

# 2. View in browser
# The CLI opens your test mode Stripe Dashboard with the extension injected.
```
