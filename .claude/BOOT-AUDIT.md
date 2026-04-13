# Boot Audit: `/editor` Route Full Trace

**Date:** 2026-04-13
**Goal:** Identify and eliminate all junk legacy, fallbacks, intermediate states, and contamination in the editor boot sequence

---

## Boot Flow: `/editor` Route Entry

```
1. User navigates to /editor
   ↓
2. Next.js routes to app/editor/page.tsx
   ↓
3. EditorPage.tsx:
   - Enables draftMode()
   - Calls HomePage({ perspective: "previewDrafts", isEditorRoute: true })
   ↓
4. app/home-page.tsx (SSR Server Component):
   - Loads all Sanity data with perspective="previewDrafts"
   - Loads homeEditorNodes = loadHomeEditorState("previewDrafts")
   - Wraps content with EditorAwareHomePageWrapper
   - Wraps content with HomeEditorOverridesProvider(nodes=homeEditorNodes)
   ↓
5. EditorAwareHomePageWrapper (Client Component):
   - Checks: isEditing && editorBootComplete
   - If NOT ready: shows "Loading editor..." div (black bg, centered text)
   - If ready: renders children
   ↓
6. HomeEditorOverridesProvider (Client Component):
   - Creates context for image source overrides
   - Renders children
   ↓
7. Main Content Renders:
   - HeroSectionWrapper
   - Navigation
   - All Sections (About, Press, Band, Live, Contact, Footer)
   - Each component uses data from previewDrafts
   ↓
8. Client-side VisualEditorProvider (Wrapper around all):
   - Already active from app.tsx (global)
   - On mount: first useEffect (no deps) → sets isHydrated=true, setIsEditing=true
   - Next: second useEffect (deps: [isEditing, isHydrated]) → scanRegistry() → setNodes() → setEditorBootComplete(true)
   - This triggers EditorAwareHomePageWrapper to re-check condition and render content
```

---

## Files Involved in Boot

| File | Role | Critical? | Legacy? |
|------|------|-----------|---------|
| `app/editor/page.tsx` | Entry point, enables draftMode | YES | NO |
| `app/home-page.tsx` | SSR data load + EditorAwareHomePageWrapper gate | YES | NO |
| `app/home-page-public.tsx` | Public route (separate) | NO | NO |
| `components/editor-aware-home-page-wrapper.tsx` | Boot readiness gate | YES | PARTIAL (uses nodes.size was fragile, now editorBootComplete) |
| `components/home-editor-overrides-provider.tsx` | Image source resolver | NO | PARTIAL (override system) |
| `components/home-editor-state-applier.tsx` | DISABLED - causing fallback issues | NO | YES (JUNK - stub, dead code) |
| `components/visual-editor.tsx` | Global editor context + boot logic | YES | NO |
| `app.tsx` (root layout) | VisualEditorProvider wrapper | YES | NO |

---

## Legacy/Junk Items Found

### Item 1: HomeEditorStateApplier - DEAD CODE
**File:** `components/home-editor-state-applier.tsx`
**Status:** DISABLED stub (returns null)
**Comment in code:** "DISABLED: This component was causing fallback/rollback issues in /editor with retries"
**Evidence:** Not imported anywhere in app/home-page.tsx anymore
**Impact:** Takes up space, confuses understanding, is NOT used
**Fix:** DELETE entirely

### Item 2: HomeEditorStateApplier still referenced in git?
**Check:** Is it still imported/used anywhere?
```bash
grep -r "HomeEditorStateApplier" /Users/macbookair/t4tweb-1 --include="*.tsx" --include="*.ts"
```
Expected: Should find ZERO results if truly unused

---

## Boot Sequence: Step-by-Step Actual Execution

### Phase 1: Initial SSR (Server)
- `app/editor/page.tsx` → `enableDraftMode()` → calls `HomePage(perspective="previewDrafts", isEditorRoute=true)`
- `home-page.tsx` loads data from Sanity (previewDrafts)
- Creates JSX tree with:
  - `EditorAwareHomePageWrapper` (client component - suspends server render here)
  - `HomeEditorOverridesProvider`
  - All sections rendering from previewDrafts data
- Returns to browser

### Phase 2: Client Hydration
1. React hydrates the tree sent from server
2. `app.tsx` mounts `VisualEditorProvider` around entire app
3. First `useEffect` in VisualEditorProvider (no deps):
   - Runs once after first render
   - Sets `isHydrated = true`
   - Detects if `/editor` route: YES
   - Detects desktop width: YES (assuming user on desktop)
   - Sets `isEditing = true`
4. This triggers EditorAwareHomePageWrapper condition:
   - `isEditorRoute=true`, `isEditing=true`, but `editorBootComplete=false` (initial state)
   - **STILL SHOWS LOADER** because editorBootComplete not yet true
   - Content is ready from SSR but gated by EditorAwareHomePageWrapper

### Phase 3: Node Scan & Boot Complete
1. Second `useEffect` in VisualEditorProvider (deps: [isEditing, isHydrated]):
   - Condition: `isEditing=true && isHydrated=true` → runs
   - Calls `scanRegistry()` → scans DOM for all `data-editor-node-id` elements
   - Tries to restore from sessionStorage first (if available)
   - If no session: builds nodes from DOM using `buildNodeFromEntry()`
   - Adds persist-only nodes (band member fields)
   - Calls `setNodes(nextNodes)` → this updates nodes Map
   - Calls `snapshot(nextNodes)` → adds to history
   - Calls `setEditorBootComplete(true)` ← THIS IS THE KEY
2. `setEditorBootComplete(true)` triggers:
   - Context value updated
   - EditorAwareHomePageWrapper re-checks condition: `isEditing=true && editorBootComplete=true` → NOW PASSES
   - EditorAwareHomePageWrapper stops showing loader, renders children
   - Content (already rendered from SSR) now visible

### Phase 4: Editor Interactive
- Overlays, selection boxes, panel mounted on top of the visible content
- User can now select and edit nodes

---

## Potential Problems in Current Flow

### Problem 1: What content is visible during Phase 2 (loader shows)?
**Answer:** EditorAwareHomePageWrapper returns a black box with "Loading editor..." text
- This is correct if it's brief
- If it takes too long, user perceives delay

### Problem 2: What if nodes already in sessionStorage from previous session?
**Answer:** 
- sessionStorage is restored immediately
- `setNodes()` called with old nodes
- `setEditorBootComplete(true)` called
- EditorAwareHomePageWrapper renders content
- But nodes might be stale (from previous session, not fresh DOM)
- Risk: User edits based on old node positions

### Problem 3: What is shown BEFORE EditorAwareHomePageWrapper gate?
**Trace:**
- SSR renders: EditorAwareHomePageWrapper + content inside
- EditorAwareHomePageWrapper is a client component but rendered in SSR
- Client hydrates: condition checks `isEditorRoute && (!isEditing || !editorBootComplete)`
- DURING HYDRATION (before first useEffect), isEditing=false, editorBootComplete=false
- So condition is TRUE → loader shown during hydration
- This is correct

### Problem 4: Could there be a flash of old/public content?
**Analysis:**
- home-page.tsx loads with perspective="previewDrafts" (draft data)
- All sections use this draft data
- There should NOT be public content mixed in
- UNLESS: HomeEditorOverridesProvider or some component is falling back to public data

---

## Hypothesis: What's causing the intermediate/fallback appearance?

### Hypothesis A: sessionStorage restore from OLD session
- User edits, navigates away, comes back
- old sessionStorage still has stale node data
- Session restore runs immediately
- `editorBootComplete(true)` is set
- EditorAwareHomePageWrapper renders with OLD nodes
- User sees content in WRONG positions (matches old session)
- Then fresh DOM scan happens? No, it doesn't - nodesBuiltRef.current prevents re-scan

**Check:** Is nodesBuiltRef.current preventing fresh scans?
- Line 694-700: `nodesBuiltRef.current` used to prevent double-building
- Once set to true, scanRegistry() won't run again even if isEditing toggles
- This could cause stale nodes to persist if sessionStorage had data

### Hypothesis B: Components falling back to public data somewhere
- HomeEditorOverridesProvider has fallback logic for images
- Some component might have a fallback to public data if not in provider
- UNLIKELY but worth checking

### Hypothesis C: Hydration mismatch between SSR (previewDrafts) and client expectations
- SSR renders with previewDrafts data
- Client expects draft data but gets something else?
- UNLIKELY because home-page.tsx passes correct perspective

### Hypothesis D: leftover code from old "rescue" attempts
- Comments mention "hydration rescue", "fallback visual", "rollback issues"
- Some legacy branch might still be active

---

## Code Junk Identified So Far

### 1. HomeEditorStateApplier (DEAD CODE - DELETE)
- File: `components/home-editor-state-applier.tsx`
- Status: Disabled stub
- Comment: "causing fallback/rollback issues"
- Action: DELETE

### 2. Check for nodesBuiltRef.current preventing fresh scans
- File: `components/visual-editor.tsx` line 694-700
- Issue: Once nodesBuiltRef is set to true, scanRegistry never runs again
- Risk: If sessionStorage had stale data, fresh DOM never scanned
- Action: INVESTIGATE - might need to allow re-scan in certain conditions

---

## Next Steps

1. **DELETE HomeEditorStateApplier** - dead code
2. **Trace sessionStorage issue** - does old session state stick?
3. **Test fresh boot** - does `/editor` show intermediate state?
4. **Check nodesBuiltRef logic** - should fresh DOM always be scanned on /editor entry?
5. **Verify no leftover rescue/fallback branches** - search for old code
6. **Confirm boot is sequential and complete** - ensure all phases run

