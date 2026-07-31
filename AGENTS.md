# MIP Pricing OS — Agent Operating Guide

MIP Pricing OS is a workflow-first freight pricing and operations platform. Changes should reduce manual work, shorten response time, prevent errors, and preserve a premium user experience.

## Repository health check
Before implementing a feature or bug fix:
1. Run `git status --short`.
2. Install dependencies using the repository standard.
3. Run the baseline validation commands.
4. Determine whether failures are pre-existing or introduced by the task.
5. Do not continue feature development on a broken baseline unless explicitly instructed.
6. Never disable TypeScript, CI, tests, linting, RLS, or other safeguards merely to make checks pass.
7. Leave the repository in the same or better health than it was found.

## How agents should work
1. Read this file first, then only the task-relevant routed documentation.
2. Inspect affected files and surrounding architecture before editing.
3. Preserve existing behavior unless the task changes it, and prefer small, targeted changes.
4. Ask for clarification only when existing code and documentation cannot resolve a consequential decision safely.

Before editing, run `git status --short`. Treat pre-existing changes as user-owned: do not modify, delete, stage, or commit them unless explicitly requested. Do not commit dependency directories, build output, screenshots, logs, local environment files, or generated artifacts unless the task requires them. Review the complete final diff for unrelated modifications.

## Documentation routing
- Product direction or feature scope: `docs/PRODUCT.md`
- UI, styling, layouts, interactions: `docs/UI_SYSTEM.md`
- Architecture, modules, file organization: `docs/ARCHITECTURE.md`
- Database, Supabase, migrations, RLS: `docs/DATABASE.md`
- Freight calculations and domain logic: `docs/FREIGHT_RULES.md`
- Workflow states, automation, approvals: `docs/WORKFLOWS.md`
- Coding, testing, Git, and verification: `docs/CODING.md`
- Current priorities and known debt: `docs/ROADMAP.md`

The routed `docs/` documents are the active sources of truth. If a conflicting legacy or root-level document exists, follow the routed document and report the discrepancy; do not silently combine conflicting instructions.

Update relevant documentation when a change alters product behavior, architecture, workflow states, freight rules, database structure, security behavior, or setup requirements. Do not update documentation for implementation-only changes that leave documented behavior unchanged.

## Package management
- Use npm for this repository.
- Preserve and commit `package-lock.json`.
- Use `npm ci` for clean installs when `package-lock.json` exists.
- Do not switch package managers or regenerate the lockfile without a task-specific reason.

## Product and engineering rules
- Optimize for workflow speed, calm and obvious screens, progressive disclosure, and desktop power users without sacrificing tablet or mobile behavior.
- Use the permanent white, black, and blue visual identity; reserve green, amber, and red for semantic states.
- Avoid duplicate data, logic, and components. Preserve auditability and do not invent freight terminology or business rules.
- Keep TypeScript strict. Do not introduce `any` unless unavoidable and documented.
- Do not remove existing features, force-push, ignore CI failures, or commit secrets, credentials, or private data.

## Database safeguards
Read `docs/DATABASE.md` before database changes. Create new forward-only migrations and do not modify migrations that may already have been applied. Review RLS policies, grants, indexes, data compatibility, and rollback implications. Never expose a Supabase service-role key in browser or client code. Keep generated database types synchronized when the repository adopts or uses them. Never weaken RLS merely to make a feature work.

## UI completion criteria
For meaningful UI changes, verify desktop, tablet, and mobile layouts; keyboard navigation and visible focus; applicable loading, empty, error, and disabled states; and no unintended horizontal overflow. Capture a screenshot or comparable visual evidence when the change is perceptible in the runnable application and the environment supports it. Documentation-only, backend-only, and invisible changes do not require screenshots. See `docs/UI_SYSTEM.md` for details.

## Verification
Before committing, run `npm run typecheck` and `npm run build`. Run `npm run lint` and `npm test` when those scripts exist. If a relevant script does not exist, report it as unavailable; do not invent an ad hoc replacement unless the task requires one, and never describe a missing script as passed.

## Completion report
Every task report must include:
- Summary of changes and files changed.
- Exact validation commands and a passed, failed, skipped, or unavailable status for each.
- Commit SHA and PR link when both exist.
- Known risks, or an explicit statement that no known risks remain.
- Remaining work, or an explicit statement that none remains.
