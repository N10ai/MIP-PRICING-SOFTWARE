# Architecture Guide

## Objective
Keep MIP Pricing OS modular, understandable, and safe to extend as pricing, operations, warehouse, portals, and automation grow.

## Architectural principles
- Prefer feature-oriented organization over dumping unrelated code into generic folders.
- Keep domain logic separate from presentation where practical.
- Reuse shared types, hooks, services, and UI primitives.
- Make data flow explicit.
- Avoid hidden side effects.
- Preserve backward compatibility unless a migration plan is part of the task.
- Favor incremental refactors over full rewrites.

## Before editing
Agents must:
1. Inspect the target file.
2. Inspect imports, sibling components, hooks, services, and types.
3. Search for similar existing patterns before creating new ones.
4. Identify whether the change affects database, permissions, routing, or shared components.
5. Define the smallest safe implementation.

## Feature boundaries
A substantial feature should generally own:
- UI components
- Hooks or state orchestration
- Domain types
- Data-access functions
- Validation
- Tests when supported

Do not duplicate the same business rule in multiple components. Move shared logic into a clearly named domain helper or service.

## Component standards
- Components should have one clear responsibility.
- Extract repeated or independently testable behavior.
- Avoid new monolithic workspace components.
- As a guideline, investigate files beyond roughly 400 lines; do not split solely to satisfy a number if separation would reduce clarity.
- Keep data fetching and mutations out of low-level presentational components.
- Use composition instead of deeply configurable components with excessive props.

## State management
Use the narrowest state scope that works:
1. Local component state for local UI behavior.
2. Shared hooks/context for feature-level shared state.
3. Server/database state through established query and Supabase patterns.
4. Global state only for truly application-wide concerns.

Do not mirror server data into multiple independent local stores without a clear synchronization strategy.

## Types
- Use explicit domain types for records, inputs, statuses, and calculations.
- Prefer `unknown` plus narrowing over `any`.
- Avoid broad index signatures when a concrete interface is known.
- Keep database row types and UI view models distinct when their needs differ.
- Normalize optional values at boundaries rather than scattering defensive coercion everywhere.

## Data access
- Centralize repeated queries and mutations.
- Select only required columns for high-volume queries.
- Handle loading, empty, error, and retry states.
- Do not expose privileged service-role behavior to clients.
- Respect Supabase RLS and tenant boundaries.

## Routing and navigation
- Preserve deep links for major records and workspaces.
- Keep route state recoverable after refresh where practical.
- Avoid navigation that discards unsaved work without warning.
- Reuse route parameters and record identifiers consistently.

## Error handling
- Validate at boundaries.
- Show actionable user messages.
- Log enough technical context for diagnosis without exposing secrets or sensitive data.
- Do not silently swallow errors.
- Treat network failures and partial success explicitly.

## Refactoring rules
- Preserve behavior first.
- Separate structural cleanup from functional changes when practical.
- Avoid repository-wide formatting or renaming during a focused task.
- Confirm all imports and routes after moving files.
- Run typecheck and build after each meaningful refactor stage.

## New dependencies
Before adding a package:
- Confirm existing code cannot meet the need cleanly.
- Check maintenance, bundle impact, security, and license.
- Prefer small focused dependencies.
- Document why the dependency is needed.

## Architecture decision test
Before introducing a new pattern, answer:
- Does an established repository pattern already exist?
- Will this reduce or increase duplicated logic?
- Is the abstraction justified by current use cases?
- Can the next engineer understand it quickly?
- Does it preserve type safety and testability?
- Does it create migration or compatibility risk?
