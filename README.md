# QuickBoard Monorepo

QuickBoard is a modern, real-time task & notes board system featuring 4 cross-platform applications sharing a unified Supabase backend.

## Monorepo Structure

```
quickboard/
├── apps/
│   ├── web/          # Next.js 15 (App Router), Tailwind CSS, Zod, Realtime & Canvas attachment
│   ├── extension/    # Chrome Extension Manifest V3 (Context menu + recent tasks popup)
│   ├── mobile/       # Expo React Native mobile client (Boards, tasks & realtime)
│   └── desktop/      # Tauri + Rust desktop app (Boards, tasks & realtime)
├── packages/
│   ├── supabase-client/  # Shared Supabase client factory (createSupabaseClient)
│   └── types/             # Shared TypeScript types (Board, Task, Profile, TaskStatus)
└── supabase/
    └── migrations/0001_init.sql   # Postgres schema, RLS policies & Realtime configuration
```

## Quick Start & Setup

1. **Database Setup**:
   Apply `supabase/migrations/0001_init.sql` to your Supabase project.

2. **Environment Variables**:
   Configure `.env` or `.env.local` files in each app:
   - `apps/web/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `apps/extension/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - `apps/mobile/.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `apps/desktop/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

3. **Install Dependencies**:
   ```bash
   pnpm install
   ```

4. **Running Applications**:
   - Web App: `pnpm dev:web`
   - Extension: `pnpm dev:extension`
   - Mobile: `pnpm dev:mobile`
   - Desktop: `pnpm dev:desktop`
