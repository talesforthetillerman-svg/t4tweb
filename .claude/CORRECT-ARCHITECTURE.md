# Correct Architecture for Editor ↔ Public Flow

**Problem:** Currently there are TWO competing data sources:
1. `homeEditorNodes` (persisted edited state from Sanity)
2. `visual-editor nodes` (live state from DOM + current edits)

This causes mismatches, conflicting renders, and broken edits.

---

## The Broken Current State

### Editor Route (`/editor`)
```
SSR:
  → loads previewDrafts data from Sanity
  → loads homeEditorNodes (persisted edits) from Sanity  ← FIRST SOURCE
  → renders components with previewDrafts data
  → wraps with HomeEditorOverridesProvider(nodes=homeEditorNodes)
  → HeroSection uses useHomeEditorImageSrc hook to get edited image src
  
Client Boot:
  → VisualEditorProvider mounts
  → scanRegistry() builds visual-editor nodes from DOM ← SECOND SOURCE
  → setNodes(scannedNodes)
  → But components already rendered with src from homeEditorNodes!
  → Mismatch if they differ
  
User Edit:
  → Edits in panel, dispatch(UPDATE_IMAGE)
  → visual-editor nodes updated
  → But useHomeEditorImageSrc hook still reads from homeEditorNodes
  → Visual mismatch: visual-editor thinks src is X, but rendered is Y
  
Deploy:
  → Changes from visual-editor nodes sent
  → Sanity updated
  → But homeEditorOverridesProvider was reading OLD state
```

### Public Route (`/`)
```
SSR:
  → loads published data from Sanity
  → homeEditorNodes = [] (not loaded)
  → renders with HomeEditorOverridesProvider(nodes=[])
  → HeroSection uses useHomeEditorImageSrc("hero-bg-image", content.bgUrl)
  → Hook returns fallback (content.bgUrl) because nodes=[]
  → Renders published src

Client:
  → VisualEditorProvider mounts but isEditing=false
  → No overlays, no editing
  → Components render published data
```

**Problem:** Pública reads from published Sanity, not from persisted edits. It should show whatever the editor persisted.

---

## The Correct Architecture

### Rule: Single Source of Truth

**ALL persistence goes through Sanity Sanity.**

When user edits in `/editor`:
1. Change happens in visual-editor
2. Deploy writes to Sanity (elementStyles field)
3. Next time public loads: reads the updated Sanity
4. Pública automatically shows the edited version

**NO persistent state outside of Sanity.**
**NO homeEditorNodes in component render paths.**
**NO dual sources competing.**

### Correct Flow:

#### Editor Route (`/editor`)
```
SSR:
  → loads previewDrafts from Sanity (contains all draft data)
  → DO NOT load homeEditorNodes (not needed in render path)
  → renders components with previewDrafts data
  → Sanity already has the elementStyles embedded in objects
  
Client Boot:
  → VisualEditorProvider mounts
  → scanRegistry() scans DOM
  → setNodes(scannedNodes)
  → editorBootComplete=true
  
Render:
  → Components render from previewDrafts data
  → Visual-editor overlays mount on top
  → User can edit geometry/style by dragging/panel
  → edits affect visual-editor nodes
  
User Edit Example (hero-logo image):
  → User clicks panel "Change Image"
  → Selects new image
  → dispatch(UPDATE_IMAGE nodeId="hero-logo")
  → visual-editor nodes updated
  → Dirty tracking: nodeId added to dirtyNodeIdsRef
  
Deploy:
  → changedNodeIds = Array.from(dirtyNodeIdsRef)
  → Contains "hero-logo" ✓
  → /api/editor-deploy receives heroData with updated hero-logo geometry/style
  → API updates Sanity elementStyles
  → visual-editor nodes marked clean
```

#### Public Route (`/`)
```
SSR:
  → loads published from Sanity
  → Sanity published includes elementStyles field (from previous deploys)
  → Components render published data
  
Client:
  → VisualEditorProvider mounts but isEditing=false
  → No overlays
  → Components render published data
  → User sees the deployed version
```

---

## Key Changes Required

### 1. Remove homeEditorOverridesProvider from Render Path

**Currently:**
```typescript
<HomeEditorOverridesProvider nodes={homeEditorNodes}>
  <HeroSection data={heroData} />
  ...
</HomeEditorOverridesProvider>
```

**Should be:**
```typescript
<HeroSection data={heroData} />
```

**Reason:** Components should render directly from Sanity data. No hook-based overrides.

### 2. Remove useHomeEditorImageSrc Hook from Components

**Currently in HeroSection:**
```typescript
const resolvedHeroBgSrc = useHomeEditorImageSrc("hero-bg-image", content.bgUrl)
```

**Should be:**
```typescript
const resolvedHeroBgSrc = content.bgUrl
```

**Reason:** The src is already in the Sanity data (previewDrafts for editor, published for public).

### 3. Move Image Editing to visual-editor Panel

**Not:** Store image src in homeEditorNodes, use hook to read it

**Instead:** 
- User selects image in panel
- Upload endpoint returns new blob/url
- dispatch(UPDATE_IMAGE src: newUrl)
- visual-editor nodes updated
- Dirty tracking captures it
- Deploy writes to Sanity
- Done

### 4. Sanity Data Should Include All Edits

**How:** 
- After deploy, /api/editor-deploy updates Sanity
- Sanity doc now has all elementStyles persisted
- Next load of `/editor` gets previewDrafts with latest elementStyles
- Next load of `/` gets published with latest elementStyles

---

## Proof that This Works

### Scenario: User edits hero-logo geometry

**Editor:**
```
1. User enters /editor
   → SSR loads previewDrafts (includes hero-logo with current geometry)
   → Client boots, scanRegistry finds hero-logo with current geometry
   → visual-editor nodes = scanned nodes

2. User drags hero-logo
   → dispatch(MOVE_NODE)
   → visual-editor updates geometry
   → Dirty tracking: hero-logo added to dirtyNodeIdsRef

3. User clicks Deploy
   → changedNodeIds includes hero-logo
   → /api/editor-deploy receives heroData with hero-logo geometry updated
   → API updates Sanity elementStyles["hero-logo"]

4. Sanity now persists: elementStyles.hero-logo = {x: 100, y: 200, ...}

Public:
1. User enters /
   → SSR loads published
   → Sanity published includes elementStyles.hero-logo = {x: 100, y: 200, ...}
   → HeroSection renders with geometry applied
   → Visual result: hero-logo appears at new position (100, 200)

Result: Editor and Public SAME ✓
```

---

## What Gets Deleted

1. `components/home-editor-state-applier.tsx` ← Already deleted
2. `useHomeEditorImageSrc` hook calls in components
3. `HomeEditorOverridesProvider` wrapper (or make it a no-op)
4. `homeEditorNodes` loading in home-page.tsx (for editor route)
5. Any `resolveImageSrc` hooks

---

## What Gets Kept

1. `VisualEditorProvider` - manages live editing state
2. `visual-editor.tsx` nodes, dirty tracking, dispatch
3. `/api/editor-deploy` - persists to Sanity
4. Sanity elementStyles field - stores geometry/style
5. Data loading from Sanity (both published and previewDrafts)

---

## Summary

| Before | After |
|--------|-------|
| Two data sources competing | One: Sanity |
| homeEditorNodes used in render | homeEditorNodes not used |
| Hooks for overrides in components | Components render Sanity data directly |
| Mismatch possible | No mismatch possible |
| Editor and public different | Editor and public same (editor before deploy, public after) |

