# QuickBoard Chrome Extension (Manifest V3)

Manifest V3 Chrome Extension providing quick task additions via right-click context menu and a popup listing 5 most recent tasks.

## Setup Instructions

1. Configure `.env`:
   Copy `.env.example` to `.env`:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Build the extension:
   ```bash
   pnpm --filter @quickboard/extension build
   ```

3. Load unpacked in Chrome:
   - Open Chrome and navigate to `chrome://extensions`.
   - Enable **Developer mode** in the top-right corner.
   - Click **Load unpacked**.
   - Select the `apps/extension/dist` directory.

## Features
- **Context Menu**: Highlight text or a link, right-click, and select **Add to QuickBoard** to save a task directly.
- **Popup**: View 5 most recent tasks, toggle task status, and quickly add new tasks across boards.
