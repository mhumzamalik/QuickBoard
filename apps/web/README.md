# QuickBoard Web App (Next.js 15)

The main web client for QuickBoard. Built with Next.js 15 App Router, TypeScript, Tailwind CSS, and Zod.

## Prerequisites

1. Set up environment variables:
   Copy `.env.example` to `.env.local` and set your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Apply database migrations:
   Run `supabase/migrations/0001_init.sql` on your Supabase Postgres instance.

## Running Locally

From the root directory:
```bash
pnpm dev:web
```
Or inside `apps/web`:
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
