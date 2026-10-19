Booking checkout backend
========================

The customer booking flow, embedded Stripe test checkout, account booking history, inventory management, monthly calendars, operations dashboard and booking email queue are implemented.

All endpoints are under `/rental-checkout`:

- `GET /catalog`: available database products, prices and sizes.
- `GET /availability/:productId?date=YYYY-MM-DD`: saved slots and booking conflicts, in America/Los_Angeles.
- `POST /quote`: authenticated quote using `{productId, quantity, bookingDate, slots: [{start, end}], accessories: [{productId, size, quantity}], coachId?}`. Prices always come from the database.
- `POST /checkout`: same payload plus optional notes; saves the reservation and accessory rows, then returns a Stripe test Checkout URL.
- `GET /sessions/:sessionId`: authenticated owner-only payment verification and booking confirmation.
- `GET /sessions/:sessionId/embedded`: owner-only embedded client secret and server hold deadline.
- `POST /sessions/:sessionId/release`: expire the Stripe session before releasing inventory. A payment already completed is confirmed instead.
- `GET /mine?period=upcoming|past`: authenticated booking history.
- `POST /webhook`: raw Stripe body, signature verified with `STRIPE_WEBHOOK_SECRET`.

Configuration: backend `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` must be test keys. Set `FRONTEND_URL` to the customer website origin. Set `STRIPE_WEBHOOK_SECRET` from Stripe CLI or your test webhook endpoint. Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Never expose the secret key to the browser. The embedded client secret is returned only to the booking owner, with no-store responses.

Pending reservations hold their exact quantities for five minutes. Embedded checkout shows a countdown and returns to confirmation on expiry or Back. The backend maintenance job runs every ten seconds and expires abandoned sessions even if the browser closes. Availability and quote requests also reconcile expired holds. Inventory is never released while Stripe can still accept payment; during a Stripe outage it stays reserved and is retried. Stripe session expiry requires explicit API expiration because its automatic session lifetime cannot be configured to five minutes.

Product rows are locked in a stable order; coach rows are locked before re-reading their reservations. Capacity uses the peak overlap, not the sum of separate sessions. Products have a stockQuantity (default one); customers choose bike and gear quantities. Coaches represent individual people and have capacity one. USD is supported. Hourly prices apply to selected duration; daily prices apply once per date per unit. No security-deposit charge is added.

Run `node scripts/migrate-rental-operations.js` when deploying. It adds stockQuantity, monthly availability, and the booking email outbox. It removes demo-generated schedules; custom legacy schedules remain effective. Unscheduled products and coaches default to 24/7. The old time seed no longer creates restrictions.

Monthly availability is stored by resource, calendar month and day of month. A one-month override takes precedence over a recurring pattern; the most recent recurring pattern starting on or before the target month wins. Unspecified days are open 24 hours. Short months skip missing dates. Existing paid reservations remain valid when hours or stock are edited; new bookings use the new limits. Product editing or coach editing permission applies to the respective calendars; availability:manage grants both.

`/operations` provides permission-checked overview, searchable bookings, status completion, email resend, and monthly availability endpoints. Product photo upload decodes and re-encodes JPG/PNG files, strips metadata and exposes UUID-based image previews. Uploads are stored under uploads/product-photos: persist this directory when deploying.

Paid confirmation creates one BookingEmail outbox record per booking. The maintenance job sends through the existing configured SMTP/SES transport, leases jobs to avoid concurrent delivery, and backs off on failure. An SMTP acknowledgement followed by a process crash before the sent flag is saved can still cause a retry; this is normal at-least-once email delivery. Admins can explicitly queue a resend.

Validation: `node --test tests/rental-pricing.test.cjs` and `node scripts/verify-booking-checkout.js`. Integration verification uses disposable database fixtures and a simulated Stripe transport, cleans its own records, and verifies quantities, concurrent reservations across bikes/coaches, expiry/release, calendars, permissions, account history, payment validation and email retry. A real embedded Stripe test session was also created and immediately expired without any charge. Browser payment completion and email delivery to a real recipient were not performed during automated verification.
