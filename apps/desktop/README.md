# QuickBoard Desktop App (Tauri + React)

Cross-platform desktop application for QuickBoard built with Tauri (Rust) and React + TypeScript + Vite.

## Setup Instructions

1. Configure environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Prerequisites:
   - Ensure Rust and `cargo` are installed (`rustc --version`).
   - Platform-specific build tools (C++ build tools on Windows / `build-essential` on Linux / Xcode command line tools on macOS).

3. Run in development mode:
   ```bash
   pnpm dev:desktop
   ```
   Or inside `apps/desktop`:
   ```bash
   pnpm tauri dev
   ```

## Features
- Shared Supabase authentication and package integrations (`@quickboard/supabase-client` and `@quickboard/types`).
- Realtime boards and task sync.
