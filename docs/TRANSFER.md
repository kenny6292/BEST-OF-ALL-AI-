# Transfer / Technical Due Diligence

A buyer should receive:

- Git repository and commit history
- deployment configuration
- Supabase project/database ownership
- storage bucket configuration
- database migrations and schema documentation
- provider API accounts or a documented replacement process
- environment variable names and configuration instructions
- backup/export procedure
- known limitations

Never transfer API secrets through Git. Rotate secrets when ownership changes.

Before a transaction, verify that the production Supabase project referenced by the deployment is the project being transferred. The repository alone does not prove which external infrastructure is live.
