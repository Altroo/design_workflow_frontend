# Design Workflow Redesign

## Scope

Redesign covers existing screens only: login, overview, board, my work, projects, project detail, task detail, team workload, time report, notifications, users, and settings.

No new user flows were introduced.

## Design System

Palette:
- White: `#ffffff` for primary surfaces.
- Neutral: `#111827`, `#4b5563`, `#6b7280`, `#e5e7eb`, `#f3f4f6`, `#f7f8fa`.
- Accent: black `#111827`, strong `#030712`, soft neutral `#f3f4f6`.

Typography:
- Stack: Inter, SF Pro, system UI, local Poppins fallback.
- Page title: 40-48px, 600 weight.
- Section title: 20px, 600 weight.
- Body: 14-16px, 1.5-1.75 line height.
- Labels: 12-14px, 500-600 weight, neutral muted.

Spacing and grid:
- Base rhythm: 4px token multiples.
- Cards: 16-24px padding, 8px radius, 1px neutral border.
- Main shell: 272px desktop rail plus fluid content.
- Forms: one column on mobile, two on tablet, explicit five-field row on desktop.

## Wireframes

Login:
- Desktop: left visual brand panel, right centered login card.
- Mobile: login card only, full-width with stable field spacing.
- Rationale: reduces visual load, keeps credentials task first.

Dashboard overview:
- Header card with page title and four compact highlights.
- Metrics grid below: mobile 1 col, tablet 2 col, desktop 4 col.
- Task/capacity cards below in responsive card wall.
- Rationale: scanning starts with totals, then action pressure.

Board:
- Filter row: mobile 1 col, tablet 2 col, desktop 5-field row.
- Board lanes scroll horizontally; cards stay readable at fixed lane width.
- Rationale: avoids compressed multi-line rows while preserving Trello-like lane use.

Projects and task detail:
- Forms use adaptive grids; long descriptions span full width.
- Metadata uses compact neutral cards and accent chips.
- Rationale: edits stay dense but not cramped.

## High-Fidelity Concept

Visual direction:
- White surfaces on soft gray app background.
- No black headers, green-only buttons, blue gradients, or mixed status colors.
- Teal accent reserved for primary actions, focus rings, active nav, and state emphasis.
- Neutral cards carry structure; elevation is subtle and consistent.

Interaction:
- Hover: card lift 2px and stronger shadow.
- Drag: dragged card opacity drops, overlay gets elevation.
- Focus: 3px teal ring for keyboard users.
- Dropdown/date popovers: white panels, neutral border, large shadow.

## Components

Buttons:
- Primary: teal fill, white text, 8px radius.
- Secondary: white fill, neutral border, dark text.
- Ghost: transparent, neutral text.

Cards:
- `app-card`: white surface, neutral border, light shadow.
- `app-card-muted`: gray surface for nested or supporting panels.

Navigation:
- Desktop rail remains sticky.
- Mobile uses compact topbar and drawer-style inline menu.
- Active item uses soft teal background, not black header color.

Radix UI:
- Select and Popover use shared white surface styles.
- Keyboard navigation kept through Radix primitives.

Modals:
- Centered white card, neutral backdrop, accent primary action.
- Same 8px radius and border system.

## Accessibility

- Text and controls use WCAG-friendly dark neutral on white/gray.
- Accent text uses strong teal for contrast.
- Focus states visible on links/buttons/interactive workflow controls.
- Reduced-motion media query disables transitions for users who request it.
- Forms keep labels visible and fields large enough for touch.

## Library Notes

Already used:
- Radix UI for select/popover behavior.
- Tailwind CSS v4 for system utilities.
- dnd-kit for board drag and drop.
- lucide-react for consistent icons.

Optional next library:
- Framer Motion for declarative page/card transitions if animation grows beyond simple CSS hover/drag states.
