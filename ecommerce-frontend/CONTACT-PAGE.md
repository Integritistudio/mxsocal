# Contact page

Public URL: `/contact-us`. `/contact` redirects to it. No login is required.

## Editing

- Copy and topics: `src/data/public-site.ts`.
- Shared navigation and footer defaults: `publicSite` in the same file.
- Page overrides: pass `menu`, `footerMenu`, or `footerText` to `PublicShell`.
- Page sections and SEO metadata: `src/app/(public)/contact-us/page.tsx`.
- Styles and responsive rules: `src/components/public-site/public-site.module.css`.

CSS includes the requested 1920, 1440, 1280, 1024, 990, 768, 425, 375, and 325px thresholds. Styles are scoped to avoid changing the admin dashboard.

## Submissions

Start the backend normally after deploying the new model: its existing Sequelize sync creates the `ContactMessages` table. For deployments using migrations, create that table through your normal migration process before accepting submissions. The public `POST /contact` route validates input and stores messages; it does not send email or expose messages publicly. The frontend `/api/contact` proxy uses server-only `API_URL`, falling back to `NEXT_PUBLIC_API_URL` and then `http://localhost:5000`.

No email recipient has been supplied yet. Email notifications are not configured. Before exposing the endpoint to production traffic, configure rate limiting at the reverse proxy or hosting layer; the hidden spam field is only a basic spam deterrent.

## Design status

The public Figma URL exposes file metadata and an 800px preview of the entire canvas, but the Contact Us frame is not readable in that preview. No interactive browser or Figma connector is connected in this session. The current visual treatment and copy are provisional, with a text wordmark and no exported Figma assets. Replace these with the actual frame typography, colors, assets, and measurements once Figma access is connected or a frame export is supplied. Pixel-perfect parity and browser checks at all requested widths are pending.

## Verification

TypeScript and scoped ESLint checks passed. Public HTML at `/contact-us` returned 200 with the heading, form, and SEO metadata; `/contact` returned a 308 redirect. Backend route checks covered valid public submissions, trimming, invalid email/message/topic/phone, spam-field handling, and database failures with mocked persistence. The configured database's `ContactMessages` table was confirmed ready. No email delivery or visual browser verification has been performed.
