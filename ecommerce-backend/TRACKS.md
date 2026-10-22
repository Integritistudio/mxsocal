# Tracks

Tracks have their own Sequelize `Tracks` table, model, controller and public router, independent of rental products.

- `GET /tracks`: all tracks, ordered by display order and name.
- `GET /tracks/:slug`: one track; unknown or invalid slugs return 404.
- `PUT /tracks/:slug/availability`: staff with `availability:manage` (or admin) can publish this month's or next month's days. Body: `{ "month": "YYYY-MM", "days": { "YYYY-MM-DD": { "status": "available", "note": "9 am–2 pm" } } }`. Status is `available` or `unavailable`; omitted days are unavailable. Each save replaces that month's day map.
- Database failures return 503 without exposing connection details.

Run `npm run seed:tracks` from `ecommerce-backend` to create the table and insert the five venues. Rerunning preserves existing records and edits. The frontend reads this API on the server using the existing `API_URL` / `NEXT_PUBLIC_API_URL` configuration.

Pages: `/tracks` and `/tracks/:slug`. Listing filters run locally over the directory. Track website and Google Maps links are separate from bike booking.

The detail response includes `availability` from the separate `TrackAvailabilities` table. It returns the current calendar month and next month in `availabilityMonths`, plus the Pacific date in `today` in `America/Los_Angeles`; dates do not affect rental product or coach calendars. Past dates are disabled in both calendars. No venue practice hours are imported as availability. Manage these dates at `/dashboard/track-availability`, also linked in the admin sidebar. Run `npm run seed:tracks` after deploying to create the new table and append the additional local gallery images to existing track records.

Venue information was checked on October 22, 2026 against the official sites linked in `data/tracks.js`. Current fees and schedules are left to each venue's live website.

Photos are stored locally as optimized WebP files under `ecommerce-frontend/public/images/tracks`. Exact original URLs are recorded in `sources.json`; public photo captions are hidden. To refresh the photos, run `node scripts/download-track-photos.js`. Photo ownership remains with the original sources; reuse licenses have not been verified.
