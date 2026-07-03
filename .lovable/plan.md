## Prescribly's Health Wallet

A closed-loop wallet: users top up via Hitchpay, and the balance can only be spent inside Prescribly (consultations now, HMO later). Every user gets a unique virtual bank account number they can transfer to; incoming transfers auto-credit their wallet.

---

### 1. Database (Lovable Cloud)

New tables (all RLS-protected, user-scoped except admin):

- `wallets` — one row per user: `user_id`, `balance_cents`, `currency`, `status` (active/frozen), timestamps.
- `wallet_virtual_accounts` — one row per user: `user_id`, `provider` ("hitchpay"), `provider_account_id`, `bank_name`, `account_number`, `account_name`, `status`.
- `wallet_transactions` — append-only ledger: `user_id`, `wallet_id`, `type` (topup / consultation_charge / refund / adjustment), `direction` (credit/debit), `amount_cents`, `balance_after_cents`, `status` (pending/succeeded/failed), `provider_reference`, `related_id` (appointment/consultation), `metadata`, timestamps.
- `hitchpay_events` — raw webhook log for auditing/idempotency: `event_id`, `event_type`, `payload`, `processed_at`, `signature_verified`.

Grants + RLS: users read only their own wallet, virtual account, and transactions. Writes happen only from edge functions using the service role. Admin role can read all. Ledger rows are insert-only (no update/delete for users).

A DB function `credit_wallet(user_id, amount, type, reference, metadata)` and `debit_wallet(user_id, amount, type, reference, metadata)` wrap the balance update + ledger insert atomically and reject negative balances.

### 2. Edge functions

- `wallet-provision` — called on first wallet page visit. Creates the `wallets` row if missing, then calls Hitchpay to create a virtual bank account for the user and stores it in `wallet_virtual_accounts`.
- `wallet-topup-initiate` — input: amount. Creates a `pending` topup ledger row, calls Hitchpay Checkout API, returns the redirect URL.
- `hitchpay-webhook` — public endpoint. Verifies Hitchpay signature using the secret key, is idempotent on `event_id`, credits the wallet on successful `payment.completed` or `virtual_account.credited` events, logs everything to `hitchpay_events`.
- `wallet-pay-consultation` — input: appointment/consultation id. Validates the price against the DB (never trusts client), calls `debit_wallet`, marks the consultation as paid, returns the updated appointment.

Secrets used: `HITCHPAY_CLIENT_ID`, `HITCHPAY_SECRET_KEY`, `HITCHPAY_WEBHOOK_SECRET`. Requested via the secrets tool during build — never hardcoded.

### 3. Frontend

New route `/wallet` ("Prescribly Health Wallet") with:

- **Balance card** — big balance, currency, "Add money" and "How to fund" buttons.
- **Your account number card** — bank name, account number (with copy button), account holder name, and a one-line note: "Transfers to this account are credited to your Prescribly wallet within minutes. Funds can only be used inside Prescribly."
- **Add money sheet** — amount input → calls `wallet-topup-initiate` → redirects to Hitchpay checkout → returns to `/wallet?topup=success|failed`.
- **Transactions list** — paged, with type, amount, status, date, and reference.
- **Empty state** — friendly "Set up your wallet" CTA that calls `wallet-provision`.

Entry points:

- New "Wallet" tile on the user dashboard and a wallet icon in the header.
- On the consultation booking / payment screen, add "Pay with Prescribly Wallet" as the first option when the balance covers the fee. If insufficient, show "Top up $X to pay with wallet" that opens the top-up sheet.

Wallet balance and account number are read directly from the DB via Supabase client with realtime subscription so the balance updates the moment the webhook credits it.

### 4. Constraints & safeguards

- Wallet is store-credit only: no withdrawal UI, no external payouts, no P2P transfers. All debit paths go through server-side edge functions that only accept known internal `type` values (`consultation_charge`, later `hmo_charge`).
- Server always re-fetches the price from the DB before debiting; the client never sends the amount to charge.
- Ledger is the source of truth; balance is recomputed from ledger in a nightly reconciliation edge function and compared to `wallets.balance_cents`.
- Currency is stored on the wallet; top-ups in a different currency are rejected until multi-currency support is added.
- HMO is out of scope for this build but the ledger `type` enum and payment function are designed to accept `hmo_charge` later without schema changes.

### 5. Technical notes

- Hitchpay integration assumes the provider exposes a Virtual Accounts API (real bank account per user) and a Checkout API for one-off top-ups. If the Virtual Accounts API isn't available on the account tier, `wallet-provision` falls back to generating a Prescribly reference code (`PRB-XXXX-XXXX`) and shows top-up-via-checkout only, with a clear message. This fallback is coded in from day one.
- All amounts stored as integer cents to avoid float drift.
- Webhook uses raw body + HMAC verification with `HITCHPAY_WEBHOOK_SECRET`; unverified requests return 401 and are logged.
- Types file will regenerate after the migration; wallet client code is written after that.

### 6. Out of scope (for a later pass)

- HMO section and HMO-funded charges.
- Withdrawals / payouts.
- Wallet-to-wallet transfers between users.
- Multi-currency conversion on top-up.  
  
also i have my client ID and client Secret key
- &nbsp;