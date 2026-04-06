# Visual Editor QA Audit (PR #32 follow-up)

Date: 2026-04-06

## Scope

This audit maps the residual QA failures to concrete root causes observed in the current editor runtime.

## Root causes by reported issue

### 1) Inspector/panel contrast is broken (white text on white background)

**Root cause:** The panel container uses a white background (`bg-white`) but does not force a dark foreground color for its content area. The inputs/labels inside the panel rely on inherited color, so section-level text color utilities (often light/white in this site) can bleed into editor controls and make them unreadable on white. The relevant panel markup currently has no explicit text color contract for the body.

- Evidence: panel wrapper and body classes in `VisualEditorOverlay` (`bg-white` with no `text-*` override in the content container).  
- Why this is intermittent: inheritance depends on where editor overlay styles are resolved relative to page utility classes.

### 2) Buttons still execute public actions while in editor mode

**Root cause:** Interaction interception is implemented on `pointerdown` only. The code prevents default and selects the target there, but there is no equivalent capture for `click`, keyboard activation (`Enter`/`Space`), form submission, or auxiliary/open-in-new-tab patterns. As a result, anchors/buttons can still navigate after selection in several input paths.

- Evidence: editor adds listeners for `pointerdown`, `pointermove`, `pointerup`, `keydown`; only `pointerdown` applies `preventDefault()` on target hit. No global `click`/`submit` blocking path exists.

### 3) GIF / Latest Release shows duplicated media or “double video”

**Root cause A (structural):** The Latest Release background keeps multiple media layers mounted at once (mobile fallback image + desktop iframe video + overlay scrims) inside the same editable background node. This is valid for responsive rendering, but in edit mode it creates overlapping visual layers that can look like duplicated media when transforms or z-order are altered.

- Evidence: `latest-release-bg` contains both a full-fill `Image` and a YouTube `iframe` concurrently.

**Root cause B (editor model mismatch):** The editor currently treats a composite background container as one editable target. When transformed/resized as a unit, child layers with independent sizing/position rules can visually desync, producing “double”/ghost-like results.

### 4) About/Press/Live/Contact: selectable overlay but real element does not move cleanly

**Root cause:** The editor applies `transform`, explicit `width`, and explicit `height` directly to live DOM nodes for *all* edited node types. Many targets belong to responsive/flex/grid/animated layouts that expect intrinsic sizing and layout-driven positioning. Forcing fixed geometry in-place can fight parent layout constraints, so overlays track one box while the perceived rendered content appears to “snap back” or diverge.

- Evidence: `applyNodeToDom` unconditionally writes `transform`, `width`, and `height` to each selected node.

### 5) “Glitch forever” reposition loops (e.g., Copy Bio, Book the Band)

**Root cause A (competing writers):** Editor transform writes compete with animation/layout systems already mutating style/geometry (e.g., motion/view transitions and responsive reflow). Nodes can be repeatedly remeasured and repainted by both systems.

**Root cause B (continuous remeasure):** A `ResizeObserver` + scroll/resize refresh continuously rescans the registry while edits are in progress. This updates entry rects during drag, amplifying feedback loops and causing oscillation symptoms when combined with geometry forcing.

- Evidence: active observer rescans registry whenever observed elements resize; scroll/resize listeners also trigger `scanRegistry()`.

### 6) Live section partially editable / public behavior leaks through

**Root cause:** Live section includes many anchor-driven cards/tiles. Because public action blocking is incomplete (see #2), those nodes still behave as public links under certain events. Also, some list items are grouped/card-like targets without dedicated per-item editing semantics, so only partial subtrees behave like true movable/resizable nodes.

### 7) Undo/Redo feels global and polluted

**Root cause A (history granularity):** `snapshot(next)` is called for almost every dispatch path, including high-frequency drag move commands. This floods the global stack with micro-steps.

**Root cause B (shared global history):** History is a single map-level timeline for the entire scene, not scoped by selected node or command grouping. Selection/deselection and movement bursts are not coalesced into meaningful transactions.

- Evidence: one global `history`/`historyIndex`; `snapshot` called from dispatch after most command cases.

## Systemic design gaps behind multiple bugs

1. **In-place editing of production DOM:** The editor mutates live UI nodes directly, so runtime layout/animation/public interaction and editor interaction share the same surface.
2. **No strict “editor event firewall”:** User interactions are not fully sandboxed from public actions.
3. **No transactional command model:** Move/resize are recorded as stream events instead of begin/update/commit transactions.
4. **Composite targets modeled as single nodes:** Complex sections (media stacks, grouped cards, dynamic lists) are not decomposed into independently controllable editor primitives.

## Recommended stabilization order (before new features)

1. **Interaction firewall first:** hard-disable public navigation/submit/open behaviors in edit mode at capture phase.
2. **Inspector readability contract:** enforce panel-specific color tokens (`text-slate-*` on light surface, input text explicit).
3. **Transaction-based history:** group drag/resize into single undo units; exclude passive remeasure/select noise from history.
4. **Geometry strategy split:** stop forcing width/height on intrinsically laid-out nodes unless explicit resize is requested.
5. **Composite media normalization:** split Latest Release background layers into explicit editor subtargets or a single canonical render path in edit mode.
6. **Animation/layout freeze in edit mode:** disable motion transforms for editable targets while editing to avoid dual writers.

## Definition of done for stabilization

- No anchor/button triggers public navigation in editor mode.
- No persistent reposition oscillation during drag/resize.
- Overlay bounds and rendered target remain visually synchronized.
- Inspector panel is fully legible in all sections.
- Latest Release/GIF has one canonical visible media result per breakpoint in edit mode.
- Undo/redo steps reflect intentional user commands, not measurement churn.
