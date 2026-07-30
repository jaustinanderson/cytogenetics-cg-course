# Claude Project Instructions

Read these files before changing the project:

1. `README.md`
2. `docs/ROADMAP.md`
3. `docs/ARCHITECTURE.md`
4. `docs/CONTENT_GOVERNANCE.md`
5. `docs/VALIDATION.md`
6. `docs/QUALITY_LOG.md`
7. `docs/CLAUDE_HANDOFF.md`

At the start of every work session:

1. Inspect the current branch, repository status, recent commits, and relevant
   open issues or pull requests.
2. Run `npm test` before editing.
3. Work on the earliest unfinished roadmap dependency unless Austin explicitly
   reprioritizes.
4. Preserve unrelated changes.

Non-negotiable constraints:

- Keep the application static and client-only.
- Preserve the single-file runtime architecture unless Austin approves a
  separately justified proposal.
- Do not add Tailwind, React, a backend, authentication, telemetry, or cloud
  state merely for modernization.
- Do not use PHI, accession numbers, employer-confidential content, proprietary
  SOPs, recalled exam questions, or redistribution-uncertain images.
- Do not represent AI-generated scientific content as reviewed.
- Do not imply affiliation with or endorsement by ASCP.
- Do not silently change progress, analytics, or public API semantics.
- A task is not complete until implementation, documentation, tests, and the
  applicable scientific/rights review agree.

Every completion report must state:

1. Files changed
2. User-visible behavior changed
3. Validation commands and exact results
4. Scientific or licensing review performed
5. Remaining risks or blockers
6. Recommended next issue
