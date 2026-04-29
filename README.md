<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/7b2978a6-bf3f-4d8b-a7b3-9e6241a5453a

## Run Locally

**Prerequisites:**  Node.js 20+, Supabase CLI (`npm install -g supabase`)

1. Install dependencies:
   `npm install`
   
2. Copy `.env.example` to `.env.local` and configure:
   ```bash
   cp .env.example .env.local
   ```
   Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase
   - `SUPABASE_PROJECT_ID` from your Supabase project settings
   
3. Generate TypeScript types from database schema:
   ```bash
   npm run db:types
   ```
   
4. Run the development server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:3000`

### Additional Setup
- See [CLAUDE.md](CLAUDE.md) for detailed architecture and conventions
- See [docs/ARCHITECTURE_REVIEW.md](docs/ARCHITECTURE_REVIEW.md) for tech stack details
- See [docs/database-snapshot.md](docs/database-snapshot.md) for database schema reference
