# Navbar checkpoint — 2026-04-22

Navbar is considered closed at this checkpoint.

## Confirmed working
- Persistence working
- Routing/runtime parity working between `/` and `/editor`
- Editor behavior working
- Hydration mismatch resolved
- Public/runtime behavior aligned
- `Book` aligned with the same architecture/pattern as the other Navbar buttons/links
- `nav-logo` geometry/style persistence working
- `nav-logo` image content persistence considered closed in the current working state

## Covered nodes
- `navigation`
- `navigation-inner`
- `nav-logo`
- `nav-brand-name`
- `nav-link-*`
- `nav-book-button`
- related editor/runtime behavior

## Historical recovery baseline used
- `2a24a08aaa0985212f12a876d3ea9e64ec9aae66`

## Purpose
This file is a durable recovery trace so Navbar can be restored quickly if it regresses later.

## Next focus
Hero / "giro section" audit and recovery.
