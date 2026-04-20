# Full Architecture Audit: Editor ↔ Public Flow

**Date:** 2026-04-13
**Objective:** Identify why editor and public are misaligned, find root causes, map correct flow

---

## Current Routing Map

### Route: `/` (Public)
```
1. app/page.tsx
   → imports HomePagePublic
   → renders <HomePagePublic />

2. HomePagePublic (app/home-page-public.tsx)
   → Async server component
   → Calls: loadHeroData() [NO perspective param = defaults to "published"]
   → Calls: loadNavigationData()
   → Calls: loadIntroBannerData()
   → Calls: loadBandMembersData()
   → Calls: loadLiveConcerts()
   → Renders: <main> with Navigation, HeroSectionWrapper, all sections, Footer
   → NO HomeEditorOverridesProvider wrapper
   → NO VisualEditorProvider context
   → Result: Pure published data, no editor context

3. Client-side:
   → VisualEditorProvider from app.tsx global wrapper STILL ACTIVE
   → useVisualEditor() hooks available but isEditing=false
   → Overlays not active
   → Dirty tracking not running
   → No deploy capability
   → Data comes ONLY from Sanity published perspective
```

### Route: `/editor` (Editor)
```
1. app/editor/page.tsx
   → Calls enableDraftMode() [enables Sanity draft fetch]
   → Calls HomePage({ perspective: "previewDrafts", isEditorRoute: true })

2. HomePage (app/home-page.tsx)
   → Async server component
   → Calls: loadHeroData("previewDrafts")
   → Calls: loadNavigationData("previewDrafts")
   → Calls: loadIntroBannerData("previewDrafts")
   → Calls: loadBandMembersData("previewDrafts")
   → Calls: loadLiveConcerts()
   → Calls: loadHomeEditorState("previewDrafts") [ONLY if isEditorRoute=true]
   → Wraps main content with EditorAwareHomePageWrapper
   → Wraps with HomeEditorOverridesProvider(nodes=homeEditorNodes)
   → Renders: same sections but with previewDrafts data
   → Result: Draft data ready to edit

3. EditorAwareHomePageWrapper (client):
   → Checks: isEditing && editorBootComplete
   → If FALSE: shows "Loading editor..." black screen
   → If TRUE: renders children
   
4. HomeEditorOverridesProvider (client):
   → Creates context for image source overrides
   → Provides resolveImageSrc hook
   
5. Client-side VisualEditorProvider:
   → Mounted globally from app.tsx
   → Boot sequence: setIsHydrated → setIsEditing → scanRegistry() → setNodes()
   → If all OK: sets editorBootComplete=true
   → EditorAwareHomePageWrapper re-checks condition
   → Content now visible
   → Editor overlays mount
   → User can edit
```

---

## Data Flow Comparison

### Public Route Data Path
```
Sanity (published) 
    ↓
loadHeroData() 
    ↓
HeroSectionWrapper.props.data (published)
    ↓
Components render with published data
    ↓
Client-side NO override hooks → uses data as-is
    ↓
homeEditorNodes is [] (not loaded)
    ↓
HomeEditorOverridesProvider still wraps but with empty nodes
    ↓
resolveImageSrc hooks return FALLBACK (published src)
    ↓
Result: Clean published render
```

### Editor Route Data Path
```
Sanity (previewDrafts)
    ↓
loadHeroData("previewDrafts")
    ↓
HeroSectionWrapper.props.data (draft)
    ↓
Components render with draft data
    ↓
Client-side useHomeEditorImageSrc hooks available
    ↓
homeEditorNodes loaded (from Sanity __HOME_EDITOR_STATE__ doc)
    ↓
HomeEditorOverridesProvider wraps with homeEditorNodes
    ↓
resolveImageSrc looks up nodeId in homeEditorNodes
    ↓
If found: returns edited src; if not: returns fallback src
    ↓
Components show overridden src (edited images)
    ↓
VisualEditorProvider's visual-editor.tsx overlays mount
    ↓
User can edit
    ↓
Results in dirty nodes → changedNodeIds
    ↓
Deploy sends to /api/editor-deploy
    ↓
API merges with Sanity → saves elementStyles
```

---

## Critical Question: What is "homeEditorNodes"?

**What:** `homeEditorNodes` loaded by `loadHomeEditorState("previewDrafts")`
**Source:** Sanity document `__HOME_EDITOR_STATE__` (persisted by deploy)
**Contains:** Array of edited nodes with geometry/style/content overrides
**Used by:** HomeEditorOverridesProvider to resolve image sources
**Problem:** This is a PERSISTED state from previous edits, not real-time state

---

## The Inversion Problem

### Correct Architecture (What it should be):

```
EDITOR STATE (visual-editor.tsx nodes Map):
  ├─ Loaded fresh from DOM on boot
  ├─ Modified by user edits
  ├─ Pushed to changedNodeIds
  └─ Deployed to Sanity

PUBLIC STATE:
  ├─ Loads Sanity published data
  ├─ If elementStyles exist for a node → apply them
  └─ Show final rendered result
```

### Current Broken Architecture (What it actually is):

```
EDITOR:
  ├─ Loads homeEditorNodes from Sanity (PERSISTED state)
  ├─ But ALSO tries to boot visual-editor.tsx from DOM
  ├─ Conflict: Which is the source of truth?
  ├─ EditorAwareHomePageWrapper gates based on editorBootComplete
  ├─ If it blocks wrong: content never visible
  └─ Result: Broken boot, can't edit

PUBLIC:
  ├─ Loads Sanity published data
  ├─ HomeEditorOverridesProvider wraps it
  ├─ But homeEditorNodes NOT loaded (isEditorRoute=false)
  ├─ resolveImageSrc returns fallback (the Sanity src)
  └─ Result: Shows published, not edited
```

---

## Specific Problems Identified

### Problem 1: EditorAwareHomePageWrapper Gating
**File:** `components/editor-aware-home-page-wrapper.tsx`
**Issue:** Condition `!isEditing || !editorBootComplete` might block content
**Scenario:**
- SSR renders content (already in HTML)
- Client hydrates but editorBootComplete=false initially
- EditorAwareHomePageWrapper returns loader div
- Client-side content is rendered but HIDDEN behind loader
- useEffect sets editorBootComplete=true
- Loader is removed, content now visible
- BUT: If something prevents editorBootComplete from becoming true → content stays hidden forever

**How it breaks:**
- If scanRegistry() fails to find nodes → no setNodes() call → editorBootComplete never set
- If HeroSection not in DOM yet → scanRegistry returns empty → nodes.size stays 0
- If sessionStorage restore runs but DOM is different → mismatch

### Problem 2: sessionStorage Stale Restore
**File:** `components/visual-editor.tsx` lines 706-730
**Issue:** Even with our recent fix to clear sessionStorage on exit, there's still a risk:
- If user refreshes `/editor` WHILE STILL IN SESSION → sessionStorage has old state
- Current state in visual-editor.tsx can be temporarily ahead of DOM
- Restore from sessionStorage can bring back old positions
- Visible as content jumping or overlays misaligned

### Problem 3: Dual Data Sources Competing
**In HomeEditorOverridesProvider:**
- homeEditorNodes comes from persisted Sanity state
- But visual-editor.tsx nodes come from live DOM scan
- These can be OUT OF SYNC
- Components read from homeEditorOverridesProvider hook (old persisted state)
- While visual-editor context has different state
- Result: Editor shows one state, overlay system thinks it's another

### Problem 4: HeroSectionWrapper Not Waiting for Editor Ready
**File:** `components/hero-section-wrapper.tsx` (need to check)
**Issue:** HeroSectionWrapper renders synchronously
- Doesn't know if editor is ready
- Renders with data from props
- But if visual-editor is still booting, overlays aren't mounted yet
- User clicks hero-logo but nothing happens (overlay not ready)

---

## What Happens on `/editor` Boot (Step by Step)

1. SSR: home-page.tsx runs, loads data(previewDrafts), loads homeEditorNodes
2. SSR: Returns HTML with all sections rendered from previewDrafts
3. SSR: Wraps with EditorAwareHomePageWrapper(isEditorRoute=true)
4. Server sends HTML to browser
5. Client receives HTML, starts hydration
6. React hydrates: VisualEditorProvider mounts
7. First useEffect (no deps) runs: setIsHydrated(true), setIsEditing(true)
8. EditorAwareHomePageWrapper sees: isEditing=true, editorBootComplete=false
   → Renders loader div (HIDES the content from SSR)
9. Second useEffect (deps: [isEditing, isHydrated]) runs:
   → Tries sessionStorage restore
   → If empty (good case): falls through to scanRegistry()
   → scanRegistry() scans DOM for data-editor-node-id elements
   → **PROBLEM:** But DOM might not be fully mounted yet!
   → Sets nodes = whatever scanRegistry() found (might be partial!)
   → Calls setEditorBootComplete(true)
10. EditorAwareHomePageWrapper re-renders
    → isEditing=true, editorBootComplete=true → condition passes
    → Removes loader, reveals content
11. But if scanRegistry() was incomplete → nodes Map has gaps
    → User tries to select hero-logo → it's not in nodes Map
    → Can't edit it

---

## Why Boot Can Still Fail

### Timing Issue: Components Not in DOM When Scan Happens
- SSR renders HeroSection synchronously
- But if HeroSection's data-editor-node-id attributes aren't in the HTML yet
- OR if Hero rendering is lazy/deferred
- OR if sections haven't been mounted yet
- scanRegistry() won't find them
- Nodes Map incomplete → editorBootComplete=true but silently incomplete

### sessionStorage Legacy Restore
- Even though we clear on exit, if user is IN session and refreshes
- Old sessionStorage has their edits in progress
- Restore loads those old edits
- But DOM has fresh SSR data
- Mismatch: overlay thinks hero-logo is at X but content is at Y

---

## The Real Problem Statement

### Public Route Works Fine
- Loads published data
- Components render cleanly
- User sees published result
- No editor involved

### Editor Route is Broken Because:
1. **EditorAwareHomePageWrapper gating is TOO AGGRESSIVE or TOO FRAGILE**
   - Either blocks forever if boot doesn't complete
   - Or completes but incompletely (nodes missing)

2. **sessionStorage restore interferes with fresh DOM**
   - Old nodes restored, fresh content rendered
   - Visible as flicker/mismatch/overlays broken

3. **Multiple data sources competing**
   - homeEditorNodes (persisted from Sanity)
   - visual-editor.tsx nodes (scanned from DOM)
   - Components use both hooks (useHomeEditorImageSrc + useVisualEditor)
   - Conflict when they disagree

4. **scanRegistry() runs on a DOM that might not be ready**
   - HeroSectionWrapper might not have mounted data-editor-node-id yet
   - Result: nodes Map incomplete, editorBootComplete=true but lying

---

## Solution Direction

### Root Truth Should Be
- What the user creates in the editor (nodes Map in visual-editor.tsx)
- Not persisted homeEditorNodes
- Not Sanity draft data
- The **visual state after mount + user edits**

### Boot Should Be
1. SSR provides fallback content (previewDrafts data)
2. Client mounts content
3. scanRegistry() scans actual mounted DOM
4. visual-editor.tsx populates nodes Map with what's actually there
5. Set editorBootComplete only when all hero nodes specifically are found
6. Then and ONLY then remove loader and show UI
7. User can edit immediately

### deploy Should Write
- Changed nodes from nodes Map (dirty tracking)
- Update Sanity with elementStyles
- Public automatically picks it up next time it loads

### Public Should Show
- Sanity published data
- + any elementStyles overrides
- Done

---

## Next Steps

1. Verify: What does HeroSectionWrapper actually export? Is it in visual-editor registry?
2. Fix: Make scanRegistry() robust to incomplete DOM mount
3. Fix: Remove dual data source conflict (choose one source of truth)
4. Fix: Make editorBootComplete more intelligent (wait for hero nodes specifically)
5. Test: Can user edit hero-logo/title/subtitle/scroll/logo now?
6. Document: New single flow

