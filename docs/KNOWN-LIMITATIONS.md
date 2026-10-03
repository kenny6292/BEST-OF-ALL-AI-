# Known Limitations

- AI provider functionality depends on valid server-side API credentials.
- Web research depends on Brave Search configuration.
- Document semantic search depends on the configured Supabase/RAG schema and embedding provider.
- Project persistence requires the project migration in `supabase/migrations` to be applied to the same Supabase project used by production.
- The process-local rate limiter is not shared between multiple Node instances.
- Billing/subscriptions are not represented as real revenue or customer data and must not be claimed as implemented until an actual payment system is configured.
