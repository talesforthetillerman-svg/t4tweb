# Architecture Reconstruction: Complete Intervention Report

**Date:** 2026-04-13
**Scope:** Full editor ↔ public flow rebuild
**Status:** Implementation Phase 1 COMPLETE

---

## Problem Statement

The system was **fundamentally broken** with two competing architectures:

### The Inversion
```
WRONG: Components read from homeEditorNodes (persisted) via hooks
       ↓
       Sometimes nodes didn't sync
       ↓
       Editor and public showed different things
       ↓
       Image sources conflicted
       ↓
       User couldn't edit effectively

WRONG: EditorAwareHomePageWrapper accessed context during SSR
       ↓
       Context doesn't exist in SSR
       ↓
       Returns default (isEditing=false)
       ↓
       Renders loader even on server
       ↓
       HTML sent to client with loader div
       ↓
       Hydration mismatch
       ↓
       Content hidden or broken
```

---

## Root Causes Found & Fixed

### Root Cause 1: Double Data Source System
**Problem:** 
- `homeEditorNodes` loaded from Sanity __HOME_EDITOR_STATE__ doc
- `visual-editor nodes` scanned from DOM
- Both used in render path
- Could diverge

**Fix:**
- Removed homeEditorOverridesProvider wrapper
- Components render Sanity data directly
- No hook-based overrides
- Single source: Sanity (which contains elementStyles from previous deploys)

**Affected Files:**
- `app/home-page.tsx`: Removed HomeEditorOverridesProvider wrapper and loadHomeEditorState call
- `components/hero-section.tsx`: Removed useHomeEditorImageSrc hook, use data.bgUrl directly
- `components/navigation.tsx`: Removed useHomeEditorImageSrc hook, use data.brandLogoUrl directly
- `components/intro-banner-section.tsx`: Removed useHomeEditorImageSrc hook, use data.gifUrl directly

### Root Cause 2: SSR Context Access in Client Components
**Problem:**
- EditorAwareHomePageWrapper tried to `useVisualEditor()` during SSR
- Context doesn't exist in SSR
- Always returned default (isEditing=false)
- HTML contained loader div
- Browser couldn't hydrate correctly

**Fix:**
- Added `isClient` state to EditorAwareHomePageWrapper
- Only checks context after hydration (when isClient=true)
- Always renders children in SSR (no conditional render)
- Loader only shows on client, after context is ready

**Affected Files:**
- `components/editor-aware-home-page-wrapper.tsx`: Added isClient state, deferred context check

### Root Cause 3: Legacy Session Storage
**Problem:**
- sessionStorage not cleared on editor exit
- User returns to /editor, restores old nodes
- Mismatch with fresh SSR content

**Fix:**
- Clear sessionStorage when isEditing becomes false
- Next /editor entry starts with fresh scan

**Affected Files:**
- `components/visual-editor.tsx`: Added sessionStorage.removeItem on editor close

---

## Architecture After Fix

### Data Flow: Correct (Single Path)

```
Editor Route (/editor):
  SSR:
    → loadHeroData("previewDrafts") from Sanity
    → Sanity contains: title, subtitle, bgUrl, logoUrl + elementStyles
    → SSR renders HeroSection with previewDrafts data
    → EditorAwareHomePageWrapper always renders content in HTML
    
  Client:
    → Hydrates HTML (includes content)
    → VisualEditorProvider mounts
    → First useEffect: setIsHydrated=true, setIsEditing=true
    → Second useEffect: scanRegistry() finds all data-editor-node-id elements
    → setNodes(scannedNodes)
    → editorBootComplete=true
    → EditorAwareHomePageWrapper re-renders (now isClient=true)
    → Condition passes: isEditing && editorBootComplete
    → Removes loader, keeps content visible
    → VisualEditor overlays mount on top
    
  User Edit:
    → Clicks node, selects element, drags, or edits in panel
    → dispatch(UPDATE_*) called
    → visual-editor nodes updated
    → Dirty tracking: node added to dirtyNodeIdsRef
    
  Deploy:
    → changedNodeIds = Array.from(dirtyNodeIdsRef)
    → /api/editor-deploy updates Sanity elementStyles
    → Sanity now has persisted changes
    
Public Route (/):
  SSR:
    → loadHeroData() [published perspective] from Sanity
    → Sanity contains: title, subtitle, bgUrl, logoUrl + elementStyles (from previous deploys)
    → SSR renders HeroSection with published data + elementStyles already in data
    
  Client:
    → VisualEditorProvider mounts but isEditing=false
    → No overlays
    → Content already visible, rendered with published data

Result: Editor and Public SAME ✓
```

---

## Files Changed

### Deleted
- None (HomeEditorStateApplier was already deleted in previous commit)

### Modified
```
app/home-page.tsx
  - Removed: import HomeEditorOverridesProvider
  - Removed: import loadHomeEditorState
  - Removed: homeEditorNodes = isEditorRoute ? await loadHomeEditorState(...) : []
  - Removed: <HomeEditorOverridesProvider nodes={homeEditorNodes}> wrapper
  
components/hero-section.tsx
  - Removed: import useHomeEditorImageSrc
  - Changed: const resolvedHeroBgSrc = useHomeEditorImageSrc(...) → = data.bgUrl
  - Changed: const resolvedHeroLogoSrc = useHomeEditorImageSrc(...) → = data.logoUrl
  
components/navigation.tsx
  - Removed: import useHomeEditorImageSrc
  - Changed: const resolvedNavLogoSrc = useHomeEditorImageSrc(...) → = data.brandLogoUrl || fallback
  
components/intro-banner-section.tsx
  - Removed: import useHomeEditorImageSrc
  - Changed: const resolvedIntroGifSrc = useHomeEditorImageSrc(...) → = data.gifUrl
  
components/editor-aware-home-page-wrapper.tsx
  - Added: useState(false) for isClient
  - Added: useEffect(() => setIsClient(true), []) after hydration
  - Changed: shouldShowLoader condition to include isClient check
  - Changed: Always render children (no SSR conditional render)
  - Added: logging for debugging
  
components/visual-editor.tsx
  - Added: Boot logging for diagnostics
  - Modified: useEffect cleanup to clear sessionStorage on editor close
  - Added: logging when nodes found, when boot complete
```

### Untouched (Preserving for Later)
```
components/home-editor-overrides-provider.tsx (still exists, not imported)
components/footer.tsx (still uses hook)
components/band-members-section.tsx (still uses hook)
components/live-section.tsx (still uses hook)
```

---

## Expected Behavior After Fix

### /editor Route
```
1. Navigate to /editor
2. SSR renders page with draft data + loader HTML
3. Client hydrates immediately
4. VisualEditorProvider boot sequence:
   a. setIsHydrated=true
   b. setIsEditing=true
   c. scanRegistry() finds nodes
   d. setEditorBootComplete=true
5. EditorAwareHomePageWrapper check after hydration:
   a. isClient=true (useEffect ran)
   b. isEditing=true ✓
   c. editorBootComplete=true ✓
   d. Loader removed ✓
   e. Content visible ✓
6. Visual-editor overlays ready
7. User can edit immediately ✓
```

### / Route
```
1. Navigate to /
2. SSR renders page with published data
3. Client hydrates
4. VisualEditorProvider mounts but isEditing=false
5. No overlays
6. User sees published page
```

### Edit Flow
```
1. User in /editor selects hero-logo
2. Panel appears (visual-editor has it)
3. User changes opacity
4. dispatch(UPDATE_IMAGE)
5. hero-logo added to dirtyNodeIdsRef
6. User clicks Deploy
7. /api/editor-deploy sends changedNodeIds including hero-logo
8. Sanity updated with elementStyles.hero-logo
9. Next load of /: public shows the edited version
```

---

## Phase 2 Work (Next Steps)

The following are NOT fixed yet but are marked for later:

1. **Other Component Overrides**
   - footer.tsx still uses useHomeEditorImageSrc
   - band-members-section.tsx still uses hook
   - live-section.tsx still uses hook
   - These should be cleaned up same way as hero/nav/intro

2. **HomeEditorOverridesProvider**
   - Still exists but not imported anywhere
   - Should be deleted if truly unused

3. **Asset Blob Persistence**
   - Image uploads to blob:// URLs not yet tested
   - Might have separate blocker

4. **Full Component Edit Testing**
   - Need to verify: hero-title, hero-subtitle, hero-scroll-indicator
   - Need to verify: nav-logo, nav-brand-name
   - Need to verify deploy → /api/editor-deploy → Sanity → public

---

## Testing Checklist (Phase 1)

### Boot Test
- [ ] Navigate to /editor
- [ ] No infinite loader
- [ ] Content appears after ~1-2 seconds
- [ ] No visual flicker
- [ ] No "Loading editor..." visible for more than 1 second

### Public Test
- [ ] Navigate to /
- [ ] Renders with published data
- [ ] No loader
- [ ] Content visible immediately

### Edit Test
- [ ] Click hero-logo in /editor
- [ ] Can select it (border appears)
- [ ] Can drag it (moves)
- [ ] Can open panel
- [ ] Can edit properties
- [ ] Changes visible immediately in /editor

### Deploy Test
- [ ] Click Deploy in /editor
- [ ] Check browser console: changedNodeIds includes edited node
- [ ] Check /api/editor-deploy logs: node in payload
- [ ] Navigate to /: edited change should be visible

---

## Logging Added for Debugging

```typescript
// visual-editor.tsx
[BOOT] Node scan starting...
[BOOT] scanRegistry() found N nodes: [...]
[BOOT] Boot complete. Nodes: N, heroNodes: [...]

// editor-aware-home-page-wrapper.tsx
[WRAPPER] Showing loader { isEditing, editorBootComplete }
[WRAPPER] Showing content { isEditing, editorBootComplete }
```

---

## Build Status
✓ Compiled successfully
✓ TypeScript passed
✓ All routes valid
✓ Ready for testing

---

## Confidence Level: HIGH

**Why:**
- Single data source eliminates conflicts
- SSR/hydration issue fixed
- Boot sequence now clean
- No competing layers
- Architecture now matches expectation

**Caveats:**
- Needs real browser testing (logging shows client-side flow)
- Asset blob persistence separate issue
- Other component overrides not yet cleaned
- Panel UI not tested yet

