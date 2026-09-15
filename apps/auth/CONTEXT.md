# ProClass / GoHighLevel Member Sync

Domain vocabulary for `apps/auth`'s ProClass integration and the sync of member
activity data out to GoHighLevel (GHL), SDFWA's CRM.

## Language

**Program** (ProClass Program):
ProClass's own term for anything schedulable — a class, a shop-equipment slot,
a SIG meetup, a safety orientation, etc. Categorized by `ProgramType.Description`
(e.g. `Class`, `Shop Slot`, `Shop Slot - Lathe`, `Safety`, `SIG`). This is
ProClass's actual API vocabulary (`/api/ProgramList`, `/api/Programs`), not a
term we invented.
_Avoid_: "class" as a catch-all for every Program — a Shop Slot is a Program too, not a class.

**Class**:
A Program whose `ProgramType.Description` is exactly `Class` — an instructional
offering a member registers for (e.g. "Introduction to Woodworking A"). Synced
to GHL as-written (full program title), unfiltered/unnormalized.
_Avoid_: "course" (not used in ProClass or this codebase)

**Shop Slot**:
A Program whose `ProgramType.Description` starts with `Shop Slot` (`Shop Slot`,
`Shop Slot - Laser`, `Shop Slot - Lathe`, `Shop Slot - 3D Printer`,
`Shop Slot - CNC`, `Shop Slot - Shaper`) — a member's registration for time on
a specific piece of shop equipment, or the general shop floor (bare `Shop Slot`
= main shop). This is ProClass's own established term at SDFWA, unrelated to
`apps/diw`'s `slotsTable` (Design in Wood fair volunteer-role registration
slots) despite the name overlap — different app, different concept.
_Avoid_: nothing decided yet re: alternate phrasing; kept as ProClass's own
vocabulary since renaming would diverge from what staff already see in the
ProClass admin UI.

**Safety Certification** (HOST only, for now):
A completed registration on the ProClass `HOST` Program (`ProgramType.Description: Safety`).
Distinct from general shop orientation Programs (e.g. "New Member orientation,"
"Safety training") and from equipment-specific certification (e.g. whatever
gates booking a CNC slot) — the latter is explicitly out of scope: no one has
asked for it, and it isn't cleanly modeled as data in ProClass (no prerequisite
metadata exists on Shop Slot Programs).
_Avoid_: "safety certified" as a general flag — only HOST is tracked.

**Member Since**:
The oldest (earliest) `CreateDate` across a member's ProClass memberships.
Already implemented as `proclass_users.member_since`.

**Junk data** (FAKE / TEST records):
Test/placeholder records left in production ProClass data — e.g. `FAKE`-titled
Programs (all found with `StatusDescription: Canceled`) and FAKE/TEST-named
contacts. Must be filtered before anything reaches our DB or GHL; treated as
a tracked concern in the sync pipeline, never assumed absent.

## GHL Tag Format

Tags pushed to GoHighLevel follow a strict, established format:

- All lowercase (GHL tags are case-insensitive; lowercase avoids near-duplicate tags).
- Spaces, never underscores, inside multi-word keys or values.
- `key: value` — a colon followed by a single space.

Confirmed tags: `shop slot used: <slot name>`, `class registered: <full class name>`,
`safety certification: host`.
