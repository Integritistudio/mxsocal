# Individual ride waiver and payment

Admin acceptance reserves equipment, sets `pending_payment`, and transactionally queues one personal email per rider. The account owner can open their form from My Bookings and resend buddy links; staff with `booking:update` can resend all rider links. Resends are limited to once per minute per rider.

Each rider sees only their own selections, waiver, and charge. Bike and gear charges belong to their rider. Individual coaching belongs to the assigned rider. A group coach is charged entirely to rider zero (the account owner). Amounts are stored in cents and must reconcile exactly to the estimate.

The waiver precedes Stripe Checkout. Its full text, version, signature, signer role, rider, dates, total, timestamp, IP and user agent are retained. Underage buddies require a guardian signature. Edit `lib/ride-waiver-terms.js` and bump its version when changing the starter terms.

The request becomes `approved` only when all participants have signed and paid. Reserved booking rows remain pending until then. Paid cancellations require a separate refund workflow and are deliberately rejected by the existing cancel action.

## Setup

1. Run `node scripts/migrate-ride-participants.js` before deploying the code. To also convert future unpaid legacy approved requests and queue their links, run it with `--include-existing`. Paid legacy bookings are skipped. No migration is performed merely by importing this script.
2. Set `FRONTEND_URL`, `STRIPE_SECRET_KEY` (test or live), and `STRIPE_RIDE_WEBHOOK_SECRET`. Register `POST /ride-requests/webhook` in Stripe for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. This is separate from the existing rental webhook.
3. Configure a strong `RIDE_LINK_SECRET` (or the existing `JWT_SECRET` fallback) of at least 32 bytes for production. Changing it invalidates previously emailed links. Email sender configuration uses the existing account mail transport.
4. Replace the starter waiver terms with the business's reviewed wording before public launch.

Personal tokens are HMAC-bound to the request and participant, carried in the URL fragment, and sent to the API in `x-ride-token`. They are not exposed in booking lists. An authenticated owner can only sign/pay for rider zero; buddies use their own email links. Signatures and webhook payments use a request row lock to serialize group completion. Stripe amounts, currency, mode, attempt, participant and request metadata are validated. Duplicate events are harmless. Checkout retries reuse Stripe idempotency keys, and a maintenance worker reconciles payments when redirects or webhooks are missed.

Test with Stripe test keys: accept a two-rider request, sign and pay as owner, verify the group remains pending, resend the buddy's link, complete their waiver and payment, and verify the group moves to Upcoming rides. Replay the webhook and verify no duplicate charge or reservation. Test an expired checkout session and cancelled ride as well.
