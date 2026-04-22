# Codex handoff — navbar and hero state (2026-04-22)

## Goal
Stabilize `t4tweb-1` section by section, prioritizing **real runtime behavior in `/` and `/editor`** over theoretical fixes that only pass build/typecheck.

## Current reality
### What is definitely working
- `pnpm typecheck`, `pnpm lint` and `pnpm build` have been passing repeatedly.
- Deploy pipeline now reports success, including:
  - local revalidate success
  - public revalidate success
- `navigation.elementStyles` is being written to Sanity and read back correctly.
- `hero-title` and `hero-subtitle` persist correctly.
- `nav-logo` is no longer skipped in deploy verification and now verifies as persisted.

### What is still broken for the user
#### Navbar
- Public `/` has repeatedly shown hydration mismatch around `components/navigation.tsx`.
- The mismatch has pointed at different leaf nodes over time, especially:
  - `nav-brand-name`
  - `nav-link-4`
  - `nav-link-5`
  - `nav-book-button`
- Even when deploy verification says values matched and persisted, the user still sees older/fallback navbar state in public.
- User reports that some navbar changes appear briefly and then seem to revert.
- `Book` has repeatedly drifted away from the other nav links after mismatch-related edits.

#### Hero
- `hero-bg-image` and `hero-logo` verify as persisted in deploy logs.
- But the user reports that after editor reload or public refresh, the hero background image and hero logo still revert visually.
- `hero-title` and `hero-subtitle` do persist, but image/logo behavior still feels like fallback/override/stale-source behavior.

## Historical baseline
Use this as the best known stable section reference:
- commit `2a24a08aaa0985212f12a876d3ea9e64ec9aae66`

This commit was treated as the preferred historical baseline for both navbar and hero work.

## Important constraints
- Do **not** start another broad audit.
- Do **not** open new fronts.
- Work **section by section**.
- Prefer transplanting known-good historical section architecture instead of inventing new helpers.
- Visible runtime correctness matters more than build/typecheck.

## What was attempted already
### Navbar attempts
- direct `data.brandLogoUrl || "/images/logo-qr.png"`
- removal of `useHomeEditorImageSrc` from navbar
- multiple helper rewrites for deterministic styles
- reverting back to historical `getNavbarBoxPatternStyle`
- trying to make `Book` follow same architecture as the other links
- ensuring public revalidation is configured and succeeds

### Hero attempts
- transplanting historical `hero-section.tsx`
- using historical washed-image protection logic
- resetting suspicious legacy filters to neutral values
- trying simpler image/logo style patterns similar to historical behavior

## Most important evidence from logs
Deploy logs repeatedly show successful persistence, for example:
- `nav-logo` matched in `navigation.elementStyles`
- `nav-brand-name` matched
- multiple `nav-link-*` matched
- `nav-book-button` matched
- `hero-bg-image` matched
- `hero-logo` matched
- public revalidate hook triggered successfully

Despite that, the user still sees old/fallback visual state.

## Most likely next step for Codex
Do **not** keep iterating on style serialization theory.

Instead, trace the real runtime source-of-truth chain for these two problem areas:

### Navbar
1. public loader output
2. `navigation.tsx` render path
3. any remaining override/fallback layer affecting public render
4. whether public route is rendering stale doc fields or stale cached asset fields for navbar leaf nodes

### Hero
1. loader output for published data
2. actual fields used to resolve hero background image and hero logo in render
3. whether public render is reading older asset fields while text uses fresh `elementStyles`
4. whether there is a stale fallback path for image/logo specifically

## User priority
The user is out of time and budget.
They do not want more speculative diagnosis.
They want concrete restoration of the last known good runtime behavior, starting with:
1. navbar
2. hero

## Practical rule for next steps
If a fix cannot be tied to a concrete runtime path, do not do it.
Prefer transplanting a known-good historical section pattern over adding another abstraction.
