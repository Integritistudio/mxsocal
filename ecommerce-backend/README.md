#Ecommerce backend

## Customer accounts

Run `npm run migrate:accounts` once before starting the updated app. This adds profile fields, email-verification challenges, saved products, and review ownership without deleting existing records. Existing customer accounts without a verified email must use Forgot Password to receive an email verification/password link. Admin and manager credentials are preserved.

Configure SMTP settings in `.env` using `account-mail.env.example`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, and the trusted `FRONTEND_URL`. Use a cryptographically random `JWT_SECRET` of at least 32 bytes; production rejects weaker signing secrets. Secrets, OTPs, passwords, and reset links are never returned in API responses or application logs. Signup fails visibly when email delivery is unavailable; forgot-password responses remain generic to protect account existence.

Staff sign in separately at `/admin/login` using `POST /auth/admin/login`. Customer credentials are rejected by staff login, and staff credentials are rejected by customer login. The public root redirects to `/bikes`; `/dashboard` remains a staff route.

Customer pages are `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, and `/account`. Signup sends a six-digit OTP valid for 10 minutes, with five verification attempts and a 60-second resend cooldown. No customer account is created until verification succeeds. Verified customers are automatically signed in using an HttpOnly five-day JWT cookie. Reset JWTs are separate from session JWTs, expire after 15 minutes, are single-use, and invalidate existing sessions. Customer invitations expire after 24 hours and let the recipient verify email and choose their own password.

Only admins can use `/dashboard/customers` to list customer profiles and send invitations. The admin API rejects password changes for customers, and public signup ignores roles and permissions. Customer tokens cannot access staff APIs, admin dashboard routes, or staff socket channels. Admin/manager provisioning is separate from customer signup.

Saved products persist per customer in the database. Reviews require a signed-in, verified account, use the account's name/email, and always start as pending. The author can see pending and rejected reviews and their photos on the product page and in My Account. Public reviews and aggregate ratings include approved reviews only. Existing manual reviews remain available to review administrators.

Run `npm run verify:accounts` for integration checks against the development database. It intercepts email in memory, uses temporary test users, and checks OTPs, five-day cookies, role isolation, profile/avatar editing, saved products, review privacy, invitations, reset-link replay, and session revocation. It sends no real email and removes its test records afterward.

## Seed an admin

Run `npm run seed:admin` from this directory to create an admin in the database configured in `.env`. On Windows PowerShell, use `npm.cmd run seed:admin` if script execution is disabled.

Optional environment variables: `ADMIN_EMAIL` (default `admin@mxsocal.com`), `ADMIN_NAME` (default `Platform Admin`), and `ADMIN_PASSWORD` (12 characters minimum, 72 bytes maximum). When no password is supplied, the command generates a random password and displays it once after verifying the saved credentials. Store it securely.

Running again preserves existing admin credentials. An existing non-admin account with the same email is rejected without changing its role. The command requires the existing database schema and does not create or alter tables.

## Product detail pages and review moderation

Run `npm run seed:bikes` followed by `npm run seed:product-details`. The detail seed adds editable content to existing products that do not have it, assigns readable unique product URLs, and creates two approved demo reviews plus one pending demo review per product. It preserves existing content and reviews on subsequent runs. These are sample reviews, not verified customer submissions.

Bike pages use `/bikes/<product-name>`, for example `/bikes/ktm-300-exc`. Other equipment uses `/products/<product-name>`. Existing product and UUID bike links permanently redirect to the named bike URL. The frontend's Products screen now lists actual products. Use Edit to change the name, URL, prices, photos, gallery, overview, specification sections, documents, video, and Google Maps embed. The same layout supports bikes, helmets, gloves, suits, and accessories.

Manage reviews at `/dashboard/reviews`, also available from Products and the sidebar. Admins and users with `product:update` permission can add, edit, approve, or reject reviews. Only approved reviews and their rating averages are included in `GET /products/:slugOrId/detail`; private email addresses are excluded. Public review submissions always start as pending.

Run `node scripts/verify-product-details.js` against the configured development database to verify all five categories, editing, moderation, private-field exclusion, and slug lookup. The check creates temporary test products and removes them afterward.

Public review uploads accept at most five JPG/PNG images with a combined original size strictly below 5 MiB. The server checks both extension and decoded format, rejects animated or over-20-megapixel images, strips metadata, and limits decoded output dimensions. Upload bytes are bounded while streaming. Sanitized images are stored in the database with cascading review deletion; pending/rejected images require admin access and responses are never cached. Reviews and images remain pending until approved. Anonymous review submissions are limited to 20 attempts per hour per backend-observed IP in each server process; deployments behind a proxy should configure trusted proxy handling and a shared edge rate limit to distinguish clients across multiple workers.

Run `node scripts/verify-review-uploads.js` to check valid uploads, forged images, count/size limits, moderation privacy, deletion cleanup, and rate limiting using temporary test data.


### Stories / blog

- Run `npm run seed:stories` to create the Stories table and add seven starter articles. Existing articles are preserved. The application also registers the Story model for normal Sequelize table creation.
- Admins manage articles at `/dashboard/stories`; public pages are `/stories` and `/stories/[slug]`.
- Drafts are private. Publishing requires content, excerpt, cover image, and descriptive alt text. SEO title/description are optional and fall back to the title/excerpt.
- The editor stores validated rich-text JSON. Fonts, heading sizes, and paragraph/list styles are controlled by the frontend theme. Raw HTML, scripts, and unsafe link protocols are rejected.
- Cover uploads accept one decoded/re-encoded JPG/PNG under 5 MB. Files live in `uploads/story-images`; use persistent storage for this directory when deploying the backend.
- Configure `NEXT_PUBLIC_SITE_URL` in the frontend environment to the public production origin for canonical URLs, social cards, and `/stories-sitemap.xml`. `/robots.txt` advertises this sitemap.
- Run `npm run verify:stories` for CRUD, publication, access, rich-text validation, image-upload, filter, and sitemap checks. The script removes its temporary data.
