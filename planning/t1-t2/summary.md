# Summary: T1 and T2 planning

Planned Nov 18, 2026 with the `/pdd` workflow, after a `/grill-me` session that settled 24 decisions.

## Artifacts
- `rough-idea.md`: the tasks and the 14 decisions from grilling that apply to T1 and T2
- `idea-honing.md`: 5 further questions and answers (Backup location, what counts as unchanged, retiring the single file, all-or-nothing import, CI gating deploys)
- `research/existing-code.md`: section map of the single file, the six clock reads and global-state reads, local-time dependency
- `research/storage-format.md`: stored shapes and the export format refinement (`activeId`, `toggles`)
- `research/tooling.md`: Vite base path, Playwright clock/time zone/storage seeding, baseline flow
- `design/detailed-design.md`: standalone design for both tasks
- `implementation/plan.md`: 12 steps with checklist

## Design in brief
- **T1:** a Backup section in the character sheet. Export as versioned JSON (copy with a fallback), import validated all-or-nothing with a confirm showing counts. Ask Claude hidden outside claude.ai. Built into the single file so it also runs in the claude.ai artifact for data carry-over.
- **T2:** TypeScript project (Vite, Vitest, Playwright). Data tables in `src/data`, a pure engine in `src/engine` that takes `now` and data as arguments, UI in `src/ui` with browser storage only. A baseline of engine outputs and tab text for 3 characters × 3 fixed times locks behavior through the split. CI gates the Pages deploy.

## Implementation approach
Steps 1–3 ship T1 on one PR. Steps 4–12 build T2 on one branch: tooling and baseline first, then the legacy script runs inside a Vite build, and pieces move out of it one area at a time with the baseline staying green. The single file is deleted last.

## Next steps
1. Review the design and plan.
2. Generate code tasks with `/code-task-generator` from `implementation/plan.md`, or start step 1 directly with `/code-assist` or `/tdd`.
3. After T1 merges, export your data from the claude.ai version and import it on Pages before step 12 retires it.

## Areas to watch
- The baseline only covers its fixtures; Skyborne and EU paths rely on unit tests.
- Tests pin America/New_York; real users keep their device's local time until T7.
- Clipboard behavior inside claude.ai needs a manual check in step 2.
