# Multi-Annotator Image Labeling Platform

A production-ready Next.js 14 app for audited multi-annotator image labeling with admin-managed users, Supabase Postgres/Storage, Prisma, Auth.js credentials login, CSV export, tie review, and legacy data import.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.local.example` to `.env.local` and fill in local or Supabase values.

3. Generate Prisma Client:

```bash
npx prisma generate
```

4. Run the dev server:

```bash
npm run dev
```

## Supabase Storage Bucket

Create a bucket named `dataset-images` in Supabase Storage. The app uploads through an ADMIN-only server route using `SUPABASE_SERVICE_ROLE_KEY`. For simple thumbnail rendering, set the bucket to public read. If you prefer a private bucket, replace `getPublicImageUrl` usage in `lib/storage.ts` with signed URL calls.

## Database And Audit Flow

- Every successful credentials login writes a `LoginEvent` with timestamp, IP address, and user agent.
- Every vote upserts one active `Annotation` per `(imageId, userId)` and appends an `AnnotationHistory` row.
- Changing a vote updates the active `Annotation`, stores `previousClassId`, and preserves the old state in history.
- After each vote, `LabelResult` is recomputed. Exact ties remain unresolved with `finalClassId = null`; admin overrides are explicit and audited.

## Seeding The First Admin

Set these env vars before running the seed:

```bash
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD='replace-with-a-strong-password'
```

Then run:

```bash
npm run seed
```

## Legacy Import

Put `classes.json`, `annotators.json`, `votes.csv`, `labels.csv`, and the `Image/` folder under `./legacy-data`, then run:

```bash
npm run migrateLegacy -- ./legacy-data
```

The script is idempotent and prints generated placeholder logins for imported annotators.

## Deploying To Vercel + Supabase

1. Create a Supabase project.
2. In Supabase, copy connection strings:
   - `DATABASE_URL`: use the pooled Postgres connection string for app runtime.
   - `DIRECT_URL`: use the direct Postgres connection string for migrations.
3. Copy storage/auth keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Create the `dataset-images` bucket and set it to public read, or switch the app to signed URLs if keeping it private.
5. In Vercel project settings, add every variable from `.env.local.example`. Do not commit `.env.local` or real secrets.
6. Deploy migrations against production:

```bash
npx prisma migrate deploy
```

7. Seed the first admin once against production:

```bash
npm run seed
```

8. Connect the GitHub repo to Vercel for automatic deployments on push.

`postinstall` runs `prisma generate`, so Vercel builds have a generated Prisma Client before `next build`.
