# Evidence rule for design/implementation passes

Adopted 2026-09-15 after an external comparison report arbitrated repository
state without cross-checking the checkout the work was committed to. Every
future pass — human or agent — follows this rule.

## Rule

1. **Print provenance first.** Before changing code, record `git rev-parse --abbrev-ref HEAD`,
   `git log --oneline -1`, `git status --short`, and confirm the referenced
   documents exist *in that checkout*.
2. **Every validation claim carries commit + command.** Never quote counts
   (tests, checks, exports) without the commit they were produced at and the
   command that produced them.
3. **Separate evidence classes.** Static validation (typecheck, lint, tests,
   `git diff --check`, static export) is reported separately from visual
   screenshots, real-device accessibility, live authentication and publication.
   A class that was not performed is stated as not performed.
4. **Cross-checkout claims are not evidence.** A report produced against another
   branch, machine or agent session describes that snapshot only. Its
   conclusions must be re-verified here before they change anything.
5. **Nothing is "complete" without in-checkout acceptance evidence.**
6. **Protected surfaces stay out of design passes.** Clinician and super-admin
   authorization behaviour is not modified while doing visual work.

## Why (concrete, 2026-09-15)

An external comparison report asserted that checkpoint `7c91e975` exists in this
repository and that the redesign brief was already present. Verified in this
checkout at `b3263e9`:

- `git rev-parse --verify 7c91e975` → `fatal: Needed a single revision`
- `git log --all --oneline | grep -c 7c91e975` → `0`
- `git worktree list` → a single worktree; branch `main`
- `docs/UI_REVIEW_FINDINGS_2026-09-15.md`, `docs/APPOINTMENT_UI_REDESIGN_RECHECK_PROMPT.md` → absent

The comparison was therefore about a different snapshot. Two cheap commands
would have prevented the disagreement — which is exactly what rule 1 encodes.
