# Deployment

## Local

1. Install Node.js 22.
2. Copy `.env.example` to `.env`.
3. Configure Supabase and at least one AI provider.
4. Run `npm install`.
5. Run `npm run dev`.

## Production

Build:

`npm run build`

Start:

`npm start`

The Express server serves the frontend from `dist/client` and APIs from `/api/*`.

## Required production configuration

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- At least one AI provider key

For web research, configure BRAVE_SEARCH_API_KEY.

Do not commit any secret values.

## Health check

GET `/api/health` reports application readiness without returning provider credentials.
