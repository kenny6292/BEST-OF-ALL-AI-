# Security Notes

- Secret provider keys are read only on the server.
- Supabase service-role credentials must never be exposed to Vite.
- Authenticated APIs require a Supabase access token.
- Conversation and document operations check user ownership.
- Document uploads are size-limited and only the implemented PDF/DOCX/TXT formats are advertised by the client.
- AI requests have input and timeout limits.
- API requests have an in-memory rate limiter.
- User-submitted code is analyzed as text and is not executed by the server.
- Do not log passwords, bearer tokens, API keys, or private document contents.

For multi-instance production deployments, replace the process-local rate limiter with a shared store before relying on it as a global abuse-control mechanism.
