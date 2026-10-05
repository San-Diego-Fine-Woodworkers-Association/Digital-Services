# Issue tracker: Linear

Issues and specs for this repo live in Linear, team **SDFWA Web Infra** (key `SDF`).
Use the `linear-server` MCP tools for all operations — no CLI is needed.

## Conventions

- **Create an issue**: `save_issue` with `team: "SDF"` and a `title` (omit `id`).
- **Update an issue**: `save_issue` with `id` set to the issue ID/identifier (e.g. `SDF-123`).
- **Read an issue**: `get_issue` with the identifier (e.g. `SDF-123`).
- **List issues**: `list_issues` with `team: "SDF"`, filtered by `state`, `label`, `assignee`, etc.
- **Comment on an issue**: `save_comment` with `issueId` set to the identifier.
- **Read comments**: `list_comments` with `issueId` set to the identifier.
- **Labels**: `list_issue_labels` to see existing labels; `save_issue` with `addLabels`/`removeLabels`
  to change them; `create_issue_label` / `save_issue_label` to define new ones.
- **Close**: `save_issue` with `id` and `state` set to the team's "done"/"canceled" state name.

Resolve the team by name or key (`"SDF"` or `"SDFWA Web Infra"`); `get_team` / `list_teams` can
confirm details if ambiguous.

## When a skill says "publish to the issue tracker"

Create a Linear issue via `save_issue` (`team: "SDF"`).

## When a skill says "fetch the relevant ticket"

Call `get_issue` with the Linear identifier (e.g. `SDF-123`).

## Projects as epics

Linear **Projects** are treated as epics: a body of related issues with a shared goal, lead, and
timeline. Attach an issue to its epic with the `project` field on `save_issue`, not `parentId`
(`parentId` is for issue-to-issue sub-issue hierarchy, not project membership).

- **Create/update a project**: `save_project` with `name` and `addTeams: ["SDF"]` on create.
- **Read a project**: `get_project` (add `includeMilestones`/`includeMembers` as needed).
- **List projects**: `list_projects` with `team: "SDF"`.
- **Attach an issue to its epic**: `save_issue` with `id` and `project: "<project name or id>"`.
- **Sub-phases within an epic**: `save_milestone` / `list_milestones`, scoped to a `project`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a Linear Project; **children** are issues attached to it.

- **Map**: a Project created with `save_project` (`name`, `addTeams: ["SDF"]`). Keep the
  Notes / Decisions-so-far / Fog write-up in the project `description`, and use
  `save_status_update` for point-in-time progress snapshots.
- **Child ticket**: an issue created with `save_issue` (`team: "SDF"`, `project: "<map project>"`).
  Use issue `labels` for `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`) if that
  vocabulary is adopted. Once claimed, `assignee` is set to the driving dev.
- **Blocking**: native Linear issue relations — `save_issue` with `blockedBy`/`blocks` (issue
  IDs/identifiers). A ticket is unblocked when every entry in `blockedBy` is resolved.
- **Frontier query**: `list_issues` with `project: "<map project>"` and an open `state`; drop any
  issue with an unresolved `blockedBy` relation or an existing `assignee`; first in project order
  wins.
- **Claim**: `save_issue` with `id` and `assignee: "me"`, the session's first write.
- **Resolve**: `save_comment` with the answer, then `save_issue` with `state` set to done, then
  append a decision pointer to the map project's `description` (Decisions-so-far) via `save_project`
  with `patch`.
- **Milestones**: for a map big enough to warrant phases, use `save_milestone` (scoped to the map
  project) to group tickets into rough stages (e.g. "Migration" → "Ingestion" → "GHL push"). Prefer
  this over a flat ticket list when the map has more than ~8-10 tickets or clear sequential phases —
  it gives the human a phase-level view in Linear's UI without changing how the frontier query or
  native blocking edges work.
