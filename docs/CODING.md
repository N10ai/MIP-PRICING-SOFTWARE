# Coding, Testing, and Git Standards

## Scope discipline
- Make the smallest complete change that satisfies the task.
- Do not bundle unrelated cleanup into a functional change.
- Preserve established conventions unless the task explicitly introduces a better shared pattern.
- Review the final diff for accidental formatting, truncation, or generated-file changes.

## TypeScript
- Keep strict typing enabled.
- Prefer explicit domain types.
- Use `unknown` and narrow safely instead of using `any`.
- Do not suppress errors with `@ts-ignore` unless the reason is documented and no safe alternative exists.
- Avoid unsafe non-null assertions unless the invariant is guaranteed.
- Type recursive functions and callbacks explicitly when inference may become circular.

## React
- Keep components focused.
- Extract reusable behavior into hooks or utilities when it improves clarity.
- Avoid unnecessary effects and duplicated derived state.
- Clean up subscriptions, timers, and event listeners.
- Use memoization only where it solves a real rendering or identity problem.
- Preserve accessible labels, focus behavior, and keyboard interaction.

## Data and validation
- Validate untrusted input at system boundaries.
- Normalize units, optional values, and external payloads in one place.
- Do not trust client-side authorization.
- Handle partial, malformed, and missing integration data explicitly.

## Error handling
- Never silently swallow errors.
- Give users an actionable message without exposing secrets.
- Preserve technical detail in appropriate logs.
- Keep retry behavior safe and idempotent.

## Comments and documentation
- Prefer self-explanatory names and structure.
- Add comments for business rationale, unusual invariants, compatibility constraints, or non-obvious algorithms.
- Do not add comments that merely restate the code.
- Update task-relevant documentation when behavior or architecture changes.

## Tests
Add or update tests when infrastructure exists and the task affects:
- Calculations
- Unit conversion
- Status transitions
- Validation
- Permissions
- Data transformation
- Regression-prone workflows

At minimum, verify:
- Happy path
- Important boundary cases
- Invalid or missing input
- Existing behavior that could regress

For UI work, verify desktop, tablet, mobile, keyboard, loading, empty, and error behavior when relevant.

## Required commands
Use the repository's package manager and existing scripts. Before committing, run at minimum:

```bash
npm run typecheck
npm run build
```

Also run lint and test scripts when available or relevant.

Do not report a command as passing unless it was actually executed successfully.

## Git workflow
- Work on the assigned/current branch.
- Do not force-push.
- Do not rewrite unrelated history.
- Use small logical commits.
- Use imperative commit messages, for example:
  - `Fix quote workspace type errors`
  - `Add vendor response status filter`
  - `Create storage billing migration`
- Never commit secrets, `.env` values, credentials, or private customer data.

## Pull requests
A PR description should include:
- Purpose
- Main changes
- Screens or workflows affected
- Database migrations
- Commands and results
- Risks and rollback considerations
- Screenshots for meaningful UI changes when available

## Completion checklist
- [ ] Task requirements are satisfied.
- [ ] Existing behavior was preserved unless intentionally changed.
- [ ] No unrelated files were modified.
- [ ] Typecheck passes.
- [ ] Build passes.
- [ ] Relevant tests pass.
- [ ] Database and RLS implications were reviewed.
- [ ] Responsive and accessibility behavior were considered.
- [ ] Final diff was reviewed.
- [ ] Commit or PR details are reported accurately.
