# Move the current database

The private `data/` folder contains a PostgreSQL database dump, a row-count manifest, uploaded backend photos, and frontend images. Passwords remain hashed as stored. Environment files and database credentials are not packaged.

## Make or refresh the snapshot

Stop booking/admin changes while exporting so filesystem images and database records stay aligned, then run from `ecommerce-backend`:

```sh
npm run data:dump
npm run data:verify
```

## Restore on a new machine

1. Push and pull the repository, including the tracked backend `data/` folder. It contains the database snapshot and media needed for restoration. Keep repository access private: the snapshot contains customer data and password hashes.
2. Install backend dependencies with `npm install`, plus PostgreSQL client tools matching the source major version (18 for this snapshot) or newer. The target PostgreSQL server should also be version 18 or newer. Set `PG_BIN` if tools are not on PATH.
3. Configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DATABASE_NAME` in the backend `.env` for the **new** database. Keep both apps and database workers stopped during restoration.
4. Run:

```sh
cd ecommerce-backend
npm run data
```

The script creates the target database if it does not exist and the database user has permission. Otherwise, create an empty database first. It refuses to overwrite an existing database, validates all snapshot checksums, restores schema and data in one transaction, restores images without replacing different existing files, and compares every table's row count.

For a checksum-only check (no database changes): `npm run data:verify`.

After restoring, configure frontend/backend public URLs, SMTP, Stripe and JWT settings on the new host before starting PM2. Existing completed booking-email jobs remain sent; unfinished email jobs and checkout records are restored too, so configure the correct Stripe account and mail transport before starting workers. External Cloudinary/S3 media still require their original service/account; the database preserves those references but cannot copy external files.
