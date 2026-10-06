# Issue tracker: Local Markdown

Specs and tickets for this repository live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`.
- The published spec is `.scratch/<feature-slug>/spec.md`.
- Implementation tickets are one file each at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in dependency order.
- Each ticket records `Status:` near the top. Use the role names in `triage-labels.md`.
- Each ticket records its blocking tickets by number and title. A ticket can start when all its blockers are complete.
- Append discussion to an issue file under `## Comments` when needed.

## Skill operations

- **Publish to the issue tracker:** create a Markdown file under the feature directory.
- **Fetch a ticket:** read the referenced issue file.
- **List the frontier:** inspect tickets with `Status: ready-for-agent`, exclude those with unfinished blockers, then take the first unclaimed ticket in number order.

## Wayfinding operations

- The map is `.scratch/<effort>/map.md`; child decision tickets are individual files in `.scratch/<effort>/issues/`.
- A child ticket records its type (`research`, `prototype`, `grilling`, or `task`), status, and blocking numbers.
- Claim a ticket by setting `Status: claimed` before work. Resolve it by appending an `## Answer`, setting `Status: resolved`, and adding a short answer pointer to the map.
