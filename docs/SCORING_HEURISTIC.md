# Deterministic Churn Risk Heuristic Specification

## 1. Overview

Reetayn utilizes a deterministic, multi-factor heuristic to compute the involuntary churn risk of recurring subscriptions. Unlike heuristic approximations that only trigger *after* a payment fails, Reetayn evaluates the payment method's lifetime against the subscription's next renewal date (`current_period_end`).

---

## 2. Card Expiration Mathematics & Edge Cases

Credit card expiration dates in payment gateways (like Stripe) consist of an expiration month $M \in [1, 12]$ and expiration year $Y$ (either 2-digit $YY$ or 4-digit $YYYY$).

### 2.1 The End-of-Month Rule
A credit card valid for month $M$ and year $Y$ remains valid until the **final millisecond of the last day of month $M$ in UTC**.

In JavaScript / TypeScript, passing day `0` to `Date.UTC` with month index $M$ computes the exact final day of month $M$:
```ts
export function getCardExpirationDate(month: number, year: number): Date {
  const fullYear = year < 100 ? 2000 + year : year;
  // Passing (month, 0) retrieves the last day of 'month' (1-indexed month passed directly)
  return new Date(Date.UTC(fullYear, month, 0, 23, 59, 59, 999));
}
```

### 2.2 Leap-Year Verification
February card expirations vary depending on whether the year is a leap year:
- **February 2024 (Leap Year):** `getCardExpirationDate(2, 2024)` $\to$ `2024-02-29T23:59:59.999Z`
- **February 2025 (Standard Year):** `getCardExpirationDate(2, 2025)` $\to$ `2025-02-28T23:59:59.999Z`
- **February 2028 (Leap Year):** `getCardExpirationDate(2, 2028)` $\to$ `2028-02-29T23:59:59.999Z`

### 2.3 Month Roll-Over Verification
- **31-day months (e.g. December 2026):** `getCardExpirationDate(12, 2026)` $\to$ `2026-12-31T23:59:59.999Z`
- **30-day months (e.g. April 2026):** `getCardExpirationDate(4, 2026)` $\to$ `2026-04-30T23:59:59.999Z`

---

## 3. Days Remaining Buffer Calculation

Given:
- $T_{\text{card\_expiry}}$: Card expiration instant (UTC)
- $T_{\text{renewal}}$: Upcoming subscription renewal instant (`current_period_end` in UTC)

The remaining buffer $\Delta_{\text{days}}$ is calculated as:
$$\Delta_{\text{days}} = \frac{T_{\text{card\_expiry}} - T_{\text{renewal}}}{86,400,000\text{ ms}}$$

---

## 4. Risk Tier Classification Matrix

The scoring engine evaluates conditions in strict deterministic sequence:

### Tier 1: `CRITICAL` (Score: 90 - 95 / 100)
A subscriber is classified as `CRITICAL` if **any** of the following conditions evaluate to true:
1. **Multi-Failure Escalation:** $\text{consecutiveFailures} \ge 2$.
   - *Rationale:* Stripe smart retries have already attempted payment multiple times without success. The subscriber is at immediate risk of churn or subscription cancellation.
2. **Card Pre-Expiry:** $\Delta_{\text{days}} < 0$ ($T_{\text{card\_expiry}} < T_{\text{renewal}}$).
   - *Rationale:* The card will expire *before* the next billing attempt. The upcoming renewal is mathematically guaranteed to fail.
3. **Card Already Expired:** $T_{\text{card\_expiry}} < T_{\text{ref}}$ (where $T_{\text{ref}}$ is current timestamp).
   - *Rationale:* Card has already expired in the past.

*Badge:* **Payment At Immediate Risk** (Red / Critical)

---

### Tier 2: `HIGH` (Score: 70 - 75 / 100)
A subscriber is classified as `HIGH` if not `CRITICAL` and **either** of the following conditions holds:
1. **Expiring Within 30 Days:** $0 \le \Delta_{\text{days}} \le 30$.
   - *Rationale:* Card expires within 30 days after the renewal date. Any retry delay, billing date shift, or prorated invoice will fall past the card's valid lifespan.
2. **Recent Soft Decline Within 7 Days:**
   $$\text{declineCode} \in \mathcal{S}_{\text{soft}} \quad \land \quad (T_{\text{ref}} - T_{\text{decline}}) \le 7\text{ days}$$
   Where $\mathcal{S}_{\text{soft}} = \{ \text{insufficient\_funds}, \text{try\_again\_later}, \text{card\_velocity\_exceeded}, \text{processing\_error}, \text{temporary\_lookup\_failure} \}$.
   - *Rationale:* Soft declines indicate intermittent payment friction or spending limits. Escalating to HIGH ensures proactive monitoring while Stripe smart retries are underway.

*Badge:* **Expiring Before Next Cycle** or **Recent Soft Decline Logged** (Amber / Warning)

---

### Tier 3: `MEDIUM` (Score: 45 - 50 / 100)
A subscriber is classified as `MEDIUM` if not higher tier and:
1. **Expiring Within 60 Days:** $30 < \Delta_{\text{days}} \le 60$.
   - *Rationale:* The card is within two billing cycles of expiration.
2. **Single Failure Logged:** $\text{consecutiveFailures} = 1$ (without recent soft decline).
   - *Rationale:* A single payment attempt has failed; Stripe smart retries are pending.

*Badge:* **Expiring Soon (30-60 Days)** or **Single Failure Logged** (Yellow / Warning)

---

### Tier 4: `LOW` (Score: 0 - 25 / 100)
A subscriber is classified as `LOW` when:
- $\Delta_{\text{days}} > 60$ days
- $\text{consecutiveFailures} = 0$
- No recent active declines

*Badge:* **Payment Method Healthy** (Green / Positive)

---

## 5. Summary Table

| Tier | Risk Score | Trigger Conditions | Automated Action |
| :--- | :---: | :--- | :--- |
| **`CRITICAL`** | 90 - 95 | $\ge 2$ failures OR card expires before renewal | Generate single-use rescue portal link; write to RescueLog |
| **`HIGH`** | 70 - 75 | Expires $\le 30$ days of renewal OR soft decline $\le 7$ days | Proactive drawer badge; queue for pre-billing notice |
| **`MEDIUM`** | 45 - 50 | Expires 31-60 days of renewal OR 1 failure | Proactive health monitoring |
| **`LOW`** | 10 | Valid $> 60$ days past renewal, 0 failures | Nominal state |
