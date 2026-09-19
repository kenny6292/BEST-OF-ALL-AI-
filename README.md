# BEST OF ALL AI

One AI. Every Intelligence. Unlimited Possibilities.

## Process 8 — Persistent AI Memory + Conversation History

The Node API now connects authenticated users to persistent Supabase conversations and messages.

Features: authenticated conversation ownership; create/list/update/delete conversations; persistent user/assistant/system messages; conversation retrieval; server-side token validation; per-user ownership checks; Supabase RLS; cascade deletion through the existing foreign key.

Server environment: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Never expose the service-role key to the browser or use a VITE_ variable.

Authenticated routes use Authorization: Bearer <Supabase access token>.

Routes: GET /api/conversations; POST /api/conversations; GET/POST /api/conversations/:id/messages; PATCH/DELETE /api/conversations/:id.

Process 6: live Brave web research. Process 7: PDF/DOCX/TXT extraction, chunking and AI document analysis.

Run: npm install && npm run dev. Production: npm run build && npm start.

## Process 9 — Multi-model AI orchestration

The API now provides a unified authenticated `POST /api/ai/generate` endpoint with server-side routing across OpenAI, Anthropic, Gemini, xAI and Mistral. Provider keys remain server-only. `GET /api/ai/providers` reports configured providers and models without exposing credentials. Automatic fallback is enabled by default and can be controlled with `AI_FALLBACK_ENABLED` and `AI_FALLBACK_PROVIDERS`. When a conversation ID is supplied, the generated user/assistant messages and selected model are persisted in Supabase.

Configure only the provider keys you want to use. OpenAI remains the default provider; additional providers become active when their server-side keys are added.
