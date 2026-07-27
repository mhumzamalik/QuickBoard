# QuickBoard Mobile App (Expo / React Native)

Mobile client for QuickBoard built with Expo, React Native, and TypeScript.

## Setup Instructions

1. Configure environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Start the Expo development server:
   ```bash
   pnpm dev:mobile
   ```
   Or inside `apps/mobile`:
   ```bash
   npx expo start
   ```

3. Run on device / emulator:
   - Scan the QR code with the **Expo Go** app (iOS/Android).
   - Press `a` for Android emulator, `i` for iOS simulator, or `w` for web preview.

## Features
- Realtime Supabase task synchronization across all connected clients.
- Clean board listing and task status toggling (`To Do` -> `In Progress` -> `Done`).
