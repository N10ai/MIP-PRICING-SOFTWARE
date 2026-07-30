# MIP Pricing OS — Agent Operating Guide

This repository contains MIP Pricing OS, a workflow-first freight pricing and operations platform.

## Mission
Build software that makes freight forwarding faster, clearer, and easier to operate. Every feature should reduce manual work, shorten response time, prevent errors, and preserve a premium user experience.

## How agents should work
1. Read this file first.
2. Read only the task-relevant documentation in `docs/`.
3. Inspect the affected files and surrounding architecture before editing.
4. Preserve existing behavior unless the task explicitly changes it.
5. Prefer small, targeted changes over broad rewrites.
6. Run required checks before committing.
7. Summarize changed files, tests, risks, and follow-up work.

## Documentation routing
- Product direction or feature scope: `docs/PRODUCT.md`
- UI, styling, layouts, interactions: `docs/UI_SYSTEM.md`
- Architecture, modules, file organization: `docs/ARCHITECTURE.md`
- Database, Supabase, migrations, RLS: `docs/DATABASE.md`
- Freight calculations and domain logic: `docs/FREIGHT_RULES.md`
- Workflow states, automation, approvals: `docs/WORKFLOWS.md`
- Coding, testing, and Git discipline: `docs/CODING.md`
- Current priorities and known debt: `docs/ROADMAP.md`

Do not load every document by default. Load only what the task requires.

## Core product rules
- Workflow speed is a primary product metric.
- Keep screens calm, obvious, and efficient.
- Design for desktop power users while maintaining excellent tablet and mobile behavior.
- Use progressive disclosure instead of showing every field at once.
- Avoid duplicate data, duplicate logic, and duplicate components.
- Preserve auditability for important operational actions.
- Do not invent freight terminology or business rules.
- Ask for clarification only when a decision cannot be safely inferred from existing code or documentation.

## Visual identity
The permanent design language is white, black, and blue.

- White is the dominant surface and background color.
- Black and near-black provide structure, hierarchy, and typography.
- Blue is the primary accent for actions, selected states, links, focus, and intelligent guidance.
- Do not introduce random accent colors.
- Green, amber, and red are reserved for semantic success, warning, and error states.

## Technical baseline
- React
- TypeScript
- Vite
- Supabase
- GitHub Actions

Follow the repository's actual package manager, scripts, and established patterns.

## Non-negotiable engineering rules
- Keep TypeScript strict.
- Do not introduce `any` unless unavoidable and documented.
- Do not silently change schemas; use migrations.
- Do not weaken RLS or authorization to make a feature work.
- Do not remove existing features during refactors.
- Do not force-push.
- Do not ignore CI failures.
- Do not commit generated secrets, credentials, or private data.

## Required checks
Before committing, run the repository equivalents of:

```bash
npm run typecheck
npm run build
```

Run tests or lint commands when they exist or when the task affects tested areas.

## Commit behavior
- Use small, logical commits.
- Use clear imperative commit messages.
- Work on the current task branch unless explicitly instructed otherwise.
- Review the final diff for accidental truncation, broad formatting changes, or unrelated edits.

## Completion report
Report:
- What changed
- Files changed
- Commands run and results
- Commit SHA or PR link
- Known risks or remaining work
