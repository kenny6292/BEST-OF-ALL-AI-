# Architecture

Best of All AI is a Vite + React frontend served by a Node.js/Express backend.

## Runtime

- React 19 + Vite
- Node.js 22
- Express API
- Supabase Auth, Postgres and Storage
- Server-side AI provider routing
- Brave Search for web research
- PDF/DOCX/TXT document extraction
- Optional semantic document retrieval

The production server serves the Vite output from `dist/client` and exposes API routes under `/api`.

## Security boundaries

Provider API keys and the Supabase service-role key are server-only. The browser uses only the Supabase publishable key.

Authenticated API routes validate the Supabase bearer token before accessing user-owned data.

## AI routing

`src/aiRouter.ts` centralizes provider configuration, timeouts, input limits and fallback behavior for OpenAI, Anthropic, Gemini, xAI and Mistral.

## Document flow

Upload -> validate -> extract -> chunk -> store metadata/object -> optionally index chunks -> retrieve relevant private chunks for AI requests.

User ownership is enforced at the API layer and should also be enforced by Supabase RLS.
