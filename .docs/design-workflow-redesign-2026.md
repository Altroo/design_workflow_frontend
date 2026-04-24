# Design Workflow 2026 Redesign

## Audit

Current app likely failed on: crowded top navigation, weak hierarchy between board/project/task screens, monochrome visual language, low board scan speed, hidden admin/settings tasks, generic cards, weak focus states, and limited motion feedback during drag/drop.

## Information Architecture

Primary shell: persistent left rail for daily workflow routes.

Top command zone: search, language switch, admin escape hatch, profile menu.

Screen hierarchy:

1. Overview: executive signal, overdue pressure, capacity.
2. Board / My Work: execution surface with filters and drag lanes.
3. Projects: intake and portfolio wall.
4. Project Detail: scope cockpit, task intake, comments, activity.
5. Task Detail: task room for ownership, status, comments, time.
6. Team / Reports / Notifications: operational control surfaces.
7. Settings / Users: secondary utility surface inside rail/profile.

## Design System

Palette: white canvas, black/gray neutrals, black primary accent. Status colors remain limited to board workflow states.

Typography: Poppins, dense dashboard scale, no viewport-scaled type.

Components: 8px radius cards, glass only as material depth, semantic chips, strong focus ring, compact controls, hover lift for actionable cards.

Spacing: 16px shell grid, 12px board lane gaps, 4/8/12/16 step rhythm.

## Wireframes

Desktop:

```
[Left Rail: logo, workspace nav, settings/users, signed-in]
[Top Command: search........................ admin lang profile]
[Hero Cockpit: title, description........... signal tiles]
[Content: metrics, board lanes, task/project panels]
```

Mobile:

```
[Topbar: menu logo/search profile]
[Drawer: workspace links, utility links]
[Hero]
[Single-column content]
```

Board:

```
[Filter Surface: search project status priority assignee toggles]
[Lane][Lane][Lane][Lane][Lane][Lane]
  [Task: title, project, priority, status, assignee, effort, due]
```

## High-Fidelity Concepts

Overview: cockpit hero plus metrics exposes pressure before detail. Capacity card shows team load without forcing reports view.

Board: Trello-like lanes remain, but denser cards improve scan speed. Semantic chip color separates priority, flow, overdue risk.

Projects: project intake remains above portfolio because managers create and route work often.

Settings/Profile: secondary actions move out of primary nav, reducing route competition.

## Advanced UX

Micro-interactions: card hover lift, accent focus rings, drop-lane state, drag overlay shadow, reduced-motion fallback.

Accessibility: skip link retained, visible focus states added, nav landmarks added, inputs labelled, contrast improved.

Personalization path: role-based rail, unread badges, language toggle, future command palette hook via `Ctrl/Cmd+K` search affordance.

## Benchmark

Trello: board familiarity retained, but shell adds stronger internal-ops hierarchy.

Linear: command/search density and semantic signals borrowed, but board remains visual for designers.

Asana: project/task/report coverage matched with less navigation sprawl.

Monday: status visibility retained without heavy color overload or oversized panels.
