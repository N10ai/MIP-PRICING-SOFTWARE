# Database and Supabase Guide

## Principles
- The database is the source of truth for operational records.
- Model reusable entities once and reference them by stable IDs.
- Preserve tenant isolation, authorization, and auditability.
- Apply every schema change through a migration.
- Avoid storing calculated values unless persistence, performance, or historical accuracy requires it.

## Naming
- Use clear `snake_case` names in PostgreSQL.
- Use plural table names consistently with the existing schema.
- Primary keys should follow established repository conventions.
- Foreign keys should make the referenced entity clear, such as `customer_id` or `quote_id`.
- Timestamp fields should use explicit names such as `created_at`, `updated_at`, `sent_at`, and `accepted_at`.

## Relationships
- Do not duplicate customer, vendor, facility, route, or user names as the only relationship.
- Store foreign keys and join the canonical record.
- Add foreign-key constraints where the domain permits.
- Decide delete behavior deliberately; do not rely on accidental cascades.

## Migrations
Every schema change must:
1. Be implemented in a new, forward-only migration.
2. Be safe for existing data.
3. Include defaults or backfills when introducing required columns.
4. Add indexes for new high-use filters, joins, or ordering.
5. Update generated or maintained application types as required.
6. Document irreversible operations.

Treat every migration that may have been applied as immutable. Never edit it to alter an already-deployed schema; add a new migration instead. Design forward remediation for rollback-sensitive changes and document operational rollback or mitigation, especially for destructive or irreversible operations.

Before applying or merging a migration, review existing-data compatibility, locking and deployment impact, constraints, defaults, backfills, foreign keys, indexes, grants, RLS policies, and dependent application code. Stage risky backfills or constraint changes when a single transaction would be unsafe.

## Row-level security
- RLS should be enabled for tenant or user data.
- Policies must enforce organization and role boundaries.
- Client-side filtering is not authorization.
- Never use broad public policies to bypass a development issue.
- Privileged operations belong in secure server-side functions or Edge Functions.
- Review policies and grants for every affected table, view, function, and storage object. Test relevant tenant, role, owner, and unauthenticated boundaries.
- Never expose a Supabase service-role key in browser bundles, client code, public environment variables, logs, or screenshots. Service-role operations must remain in trusted server-side environments.

## Generated types
- When generated database types are adopted or present, regenerate and commit them after schema changes.
- Verify that the types reflect the target schema and that application typecheck succeeds.
- Do not hand-edit generated types to conceal schema drift; fix the schema or generation workflow.

## Auditing
Important actions should preserve:
- Actor
- Timestamp
- Record identity
- Previous and new state when material
- Source of change, such as user, automation, import, or integration

Prioritize auditability for quotes, rates, approvals, invoices, shipments, warehouse records, and permissions.

## Status fields
- Use constrained values through PostgreSQL enums, check constraints, or a documented typed strategy.
- Define allowed transitions in workflow documentation and application logic.
- Do not overload one status field to represent several unrelated concepts.

## Soft deletion
Use soft deletion when records must remain available for history, financial traceability, or audit. Make active-record filters consistent and index them where needed.

Do not soft-delete temporary or replaceable data without a business reason.

## Query performance
- Select only the columns required.
- Paginate large collections.
- Add indexes based on actual filters, joins, and ordering.
- Avoid N+1 query patterns.
- Use database aggregation for large datasets when it is safe and clear.
- Review realtime subscriptions for scope and cleanup.

## Financial and measurement data
- Use numeric or integer representations appropriate to required precision.
- Avoid floating-point types for money.
- Store currency explicitly when multiple currencies are possible.
- Preserve source units where needed and normalize calculations consistently.
- Record exchange-rate source and effective time when conversion affects a quote or invoice.

## Data changes checklist
Before completion verify:
- A migration exists.
- Existing rows remain valid.
- Required indexes exist.
- RLS and authorization remain correct.
- Application types are updated.
- Rollback or mitigation is understood.
- Grants and service-role boundaries remain safe.
- Relevant typecheck, build, and tests pass.
