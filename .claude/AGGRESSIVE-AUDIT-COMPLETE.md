# AGGRESSIVE SYSTEM AUDIT: All Data Sources, Legacy Layers, Fallbacks Identified

**Depth:** TOTAL - Every file, every data path, every possible source of stale/old state  
**Scope:** Why old content appears, where it's stored, how it's reinjected  

---

## DATA SOURCES IN THE SYSTEM

### Source 1: Sanity (CORRECT SOURCE)
**Where:** Cloud Sanity CMS
**Two perspectives:**
- `published` - stable public version
- `previewDrafts` - current draft version with unsaved changes

**In SSR for /editor:**
- `loadHeroData("previewDrafts")` → returns current draft
- Includes: title, subtitle, images, elementStyles (geometry/style from previous deploys)

**In SSR for /:**
- `loadHeroData()` [no param] → defaults to "published"
- Returns: published version

### Source 2: sessionStorage (LEGACY / PROBLEMATIC)
**Key:** `__VISUAL_EDITOR_SESSION_STATE__`
**Stored:** When user edits in /editor, nodes Map is serialized to sessionStorage
**Retrieved:** On /editor boot, attempts to restore from sessionStorage
**Problem:** 
- Persists across browser sessions
- Never automatically cleared on logout
- Contains OLD node data from previous session
- Can be days/weeks old

**Where it's written:** `components/visual-editor.tsx` line ~758-765
```typescript
window.sessionStorage.setItem("__VISUAL_EDITOR_SESSION_STATE__", JSON.stringify(serialized))
```

**Where it's read:** `components/visual-editor.tsx` line ~710-723
```typescript
const saved = window.sessionStorage.getItem("__VISUAL_EDITOR_SESSION_STATE__")
if (saved) {
  // Restore OLD nodes from previous session
  restoredFromSession = true
  parsed.forEach(([id, node]) => nextNodes.set(id, node))
}
```

### Source 3: DOM (SCANNING)
**How:** `scanRegistry()` queries all elements with `[data-editor-node-id]`
**Timing:** Only runs if sessionStorage restore fails
**Problem:**
- If sessionStorage has data → skips DOM scan
- Never gets fresh data
- Uses stale node positions

### Source 4: Context State (visual-editor.tsx)
**What:** nodes Map in React context
**Problem:** Can lag behind DOM if:
- sessionStorage had old data
- Boot incomplete
- Dirty tracking hasn't run yet

### Source 5: Hydrated Node Overrides
**Where:** `window.__HOME_EDITOR_NODE_OVERRIDES__`
**Stored:** By `readHydratedNodeOverride()` from `localStorage.__EDITOR_NODE_OVERRIDE_*`
**Problem:**
- Per-node overrides stored separately
- Can be out of sync with nodes Map
- Old overrides not cleaned up

---

## COMPETING RENDER PATHS (THE ROOT PROBLEM)

### Path 1: Old Restore Path (SHOULD BE DELETED)
```
/editor boot:
  → sessionStorage has data from old session
  → restore runs immediately
  → old nodes loaded into context
  → EditorAwareHomePageWrapper passes condition
  → renders with OLD node positions
  → visual-editor overlays show old geometry
  → user edits OLD state, not fresh state
  
Result: User appears to edit old version of site
```

### Path 2: Correct Path (SHOULD BE ONLY PATH)
```
/editor boot:
  → SSR renders with previewDrafts (fresh)
  → Client hydrates
  → sessionStorage is EMPTY (not restored)
  → scanRegistry() runs
  → Finds fresh node positions from actual DOM
  → visual-editor state = DOM state
  → user edits correct version

Result: User edits current version
```

### Path 3: Fallback Path (SHOULD NOT EXIST)
```
If boot incomplete:
  → EditorAwareHomePageWrapper shows loader
  → But some old content still visible behind loader
  → Or fallback content renders
  → Or old overlays from previous session visible

Result: Visual confusion
```

---

## FILES WITH LEGACY/PROBLEMATIC CODE

### 1. components/visual-editor.tsx (MAJOR)

**Line 706-730: sessionStorage restore logic**
```typescript
let restoredFromSession = false
if (typeof window !== "undefined" && typeof window.sessionStorage !== "undefined") {
  try {
    const saved = window.sessionStorage.getItem("__VISUAL_EDITOR_SESSION_STATE__")
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        restoredFromSession = true
        parsed.forEach(([id, node]) => {
          nextNodes.set(id, node)  // ← LOADS OLD NODES
        })
      }
    }
  } catch (e) { }
}

// If session restore failed, build from DOM
if (!restoredFromSession) {  // ← ONLY scans DOM if restore failed
  scanRegistry().forEach((entry, id) => {
    nextNodes.set(id, buildNodeFromEntry(entry))
  })
}
```

**PROBLEM:** 
- If sessionStorage has data, NEVER scans fresh DOM
- User always gets old state if had previous session

**Line 758-765: sessionStorage write**
```typescript
const serialized = Array.from(nodes.entries())
window.sessionStorage.setItem("__VISUAL_EDITOR_SESSION_STATE__", JSON.stringify(serialized))
```

**PROBLEM:**
- Writes every time nodes change
- Never cleared on logout
- Accumulates old edits

**Line 750-765: Cleanup on editor close (recent fix)**
```typescript
useEffect(() => {
  if (!isEditing) {
    setEditorBootComplete(false)
    try {
      window.sessionStorage.removeItem("__VISUAL_EDITOR_SESSION_STATE__")
    } catch (e) { }
  }
}, [isEditing])
```

**PROBLEM:** Only clears if `isEditing` becomes false, but:
- What if user just reloads page while editing?
- sessionStorage still there
- Next boot loads old state

### 2. components/editor-aware-home-page-wrapper.tsx (MEDIUM)

**Current state (after previous fix):**
```typescript
const [isClient, setIsClient] = useState(false)

useEffect(() => {
  setIsClient(true)
}, [])

const shouldShowLoader = isClient && isEditorRoute && (!isEditing || !editorBootComplete)

if (shouldShowLoader) {
  return <div>Loading editor...</div>
}

return <>{children}</>
```

**PROBLEM:**
- If `editorBootComplete` never becomes true → loader forever
- If loader shows but content behind it → user doesn't know what's happening
- No timeout, no error state

### 3. components/hero-section.tsx (MEDIUM)

**Lines 172-173 (after previous fix):**
```typescript
const resolvedHeroBgSrc = content.bgUrl
const resolvedHeroLogoSrc = content.logoUrl
```

**But wait:** `content = data` which is the prop from parent

**Problem:** What if data is stale? What if it's from old session?

**Let me check:** Does `data` come from SSR or from context?

Answer: `data` comes as prop from HeroSectionWrapper

### 4. components/hero-section-wrapper.tsx (CRITICAL)

**Line 9-14:**
```typescript
const { isEditing, nodes } = useVisualEditor()

const effectiveData: HeroData = useMemo(() => {
  const shouldMerge = (isEditing || isEditorRoute) && nodes.size
  if (!shouldMerge) return data

  const heroTitle = nodes.get("hero-title")
  const heroSubtitle = nodes.get("hero-subtitle")
  
  const merged: HeroData = { ...data }
  
  if (heroTitle?.content?.text) {
    merged.title = heroTitle.content.text as string
  }
  if (heroTitle?.content?.accentText) {
    merged.titleHighlight = heroTitle.content.accentText as string
  }
  if (heroSubtitle?.content?.text) {
    merged.subtitle = heroSubtitle.content.text as string
  }
  
  return merged
}, [isEditing, isEditorRoute, nodes, data])

return <HeroSection data={effectiveData} />
```

**PROBLEM:**
- `nodes` comes from visual-editor context
- If sessionStorage restored old nodes → `nodes` contains old state
- `effectiveData` merges old nodes data into fresh Sanity data
- HeroSection renders with OLD title/subtitle text

**This is the smoking gun:** Users see old content because HeroSectionWrapper merges old node text!

### 5. components/visual-editor.tsx (Boot logging - recent)

**Lines 703-705, 727-731, 747-754 (logging)**
```typescript
console.log(`[BOOT] Node scan starting...`)
console.log(`[BOOT] scanRegistry() found...`)
console.log(`[BOOT] Boot complete...`)
```

**Good:** Helps debug, but doesn't fix the root problem

### 6. app/home-page.tsx (After previous fix)

**Content wrapped with EditorAwareHomePageWrapper**
**Issue:** EditorAwareHomePageWrapper might not gate correctly if boot incomplete

### 7. Untouched Legacy Files

**components/home-editor-overrides-provider.tsx**
- Still exists but not imported
- Dead code

**components/footer.tsx, band-members-section.tsx, live-section.tsx**
- Still use `useHomeEditorImageSrc` hooks
- Not critical but legacy

---

## WHERE OLD CONTENT COMES FROM (ROOT CAUSE)

**Scenario: User edits, closes browser, returns next day**

```
Day 1:
  /editor → boot → sessionStorage empty → DOM scan → fresh nodes
  User edits hero-title to "NEW TITLE" → dirty tracking
  Deploy → Sanity updated
  sessionStorage.setItem → saves {"hero-title": {content.text: "NEW TITLE"}} ← PROBLEM
  Browser closed

Day 2:
  /editor → boot
  sessionStorage has {"hero-title": {content.text: "NEW TITLE"}} from Day 1 ← STALE but looks fresh
  restore runs → nextNodes.set("hero-title", {content.text: "NEW TITLE"})
  restoredFromSession = true
  DOM scan SKIPPED
  BUT: Sanity might have DIFFERENT data (someone edited via API, or it's production vs draft)
  OR: Visual-editor overlays position at OLD geometry stored in sessionStorage
  
Result: User sees old state visually
```

**But there's more:** Even if Sanity data is fresh, HeroSectionWrapper merges old nodes:

```
SSR loads: title = "CURRENT TITLE" (from Sanity)
Client boot: nodes restored from sessionStorage = {hero-title: {text: "NEW TITLE"}} (from yesterday)
HeroSectionWrapper merges: if (heroTitle?.content?.text) merged.title = "NEW TITLE"
Result: Shows old title even though Sanity has current!
```

---

## FULL LIST OF LEGACY/JUNK FOUND

### JUNK CLEAR → DELETE IMMEDIATELY

1. **sessionStorage restore logic** (visual-editor.tsx line 706-730)
   - Purpose: Session persistence across refresh
   - Problem: Persists across SESSIONS, not just refreshes
   - Impact: HIGH - causes old data to appear
   - Delete: YES

2. **HeroSectionWrapper merge logic** (hero-section-wrapper.tsx line 13-33)
   - Purpose: Merge visual-editor node edits into rendered data
   - Problem: Merges old sessionStorage nodes into fresh Sanity data
   - Impact: CRITICAL - old text appears
   - Delete: YES (or simplify)

3. **Hydrated node overrides** (visual-editor.tsx line 735-741)
   - Purpose: Persist band member fields that have no DOM target
   - Problem: Uses separate localStorage mechanism
   - Impact: MEDIUM - separate state management
   - Delete: Maybe (needs analysis)

4. **readHydratedNodeOverride()** (need to find)
   - Reads from localStorage
   - Separate persistence mechanism
   - Delete: Check if actually used

5. **Uncleared sessionStorage on exit** (visual-editor.tsx line 750-765)
   - Clears on isEditing=false
   - But doesn't clear if page closed
   - Fix: Clear on component unmount

### SOSPECHOSO FUERTE → SIMPLIFY

1. **nodesBuiltRef** (visual-editor.tsx line 694-701)
   - Prevents double-building of nodes
   - But prevents fresh DOM scans
   - Issue: If boot fails, nodesBuiltRef is still true → next useEffect never builds
   - Fix: Clear on editorBootComplete timeout or failure

2. **EditorAwareHomePageWrapper loader** (editor-aware-home-page-wrapper.tsx)
   - Shows loader if boot incomplete
   - Problem: No timeout, no error state
   - Fix: Add timeout (15 seconds?), show error

3. **sessionStorage write frequency** (visual-editor.tsx line 758-765)
   - Writes on EVERY node change
   - Problem: Accumulates large data
   - Fix: Debounce or clear more aggressively

### CRÍTICO ACTUAL → KEEP BUT DOCUMENT

1. **scanRegistry()** (visual-editor.tsx line 411-440)
   - Essential for getting node positions
   - But only runs if sessionStorage empty
   - Keep but fix: Always run, use fresh DOM regardless of sessionStorage

2. **Dirty tracking** (visual-editor.tsx line 1368-1375)
   - Essential for knowing what changed
   - Keep: YES

3. **Deploy mechanism** (app/api/editor-deploy/route.ts)
   - Writes to Sanity
   - Essential
   - Keep: YES

4. **Visual-editor context** (visual-editor.tsx)
   - Essential for UI state
   - Keep but fix: Don't read from sessionStorage on boot

---

## HIDDEN PROBLEM: TWO BOOT PATHS

**Path A (OLD SESSION EXISTS):**
```
sessionStorage restore → success
→ restoredFromSession = true
→ DOM scan skipped
→ nodes = old data
→ HeroSectionWrapper merges old text
→ User sees old version
```

**Path B (NO SESSION):**
```
sessionStorage restore → empty
→ restoredFromSession = false
→ DOM scan runs
→ nodes = fresh data
→ User sees correct version
```

**This creates quantum state:** Whether user sees old or new depends on if they had a previous session!

---

## SUMMARY: ROOT CAUSES OF OLD CONTENT APPEARING

1. **sessionStorage persists across sessions** (should only persist within one session)
2. **DOM scan only runs if sessionStorage empty** (should always run)
3. **HeroSectionWrapper merges old node text into fresh data** (shouldn't merge)
4. **No timeout on editor boot** (loader can hang)
5. **No clearing on page close** (sessionStorage survives)
6. **Hydrated node overrides separate** (two persistence mechanisms)
7. **nodesBuiltRef prevents rebuilding** (can't fix if boot fails)

---

## WHAT NEEDS TO BE ELIMINATED

| Item | Why | Action |
|------|-----|--------|
| sessionStorage restore logic | Causes old data to appear | DELETE |
| HeroSectionWrapper merge | Merges old text into fresh data | SIMPLIFY/DELETE |
| Hydrated node overrides | Separate persistence | CONSOLIDATE |
| nodesBuiltRef preventing rebuild | Can't recover from boot failure | FIX |
| No boot timeout | Loader can hang | ADD |
| No sessionStorage cleanup on close | Persists across sessions | FIX |
| Separate restoration paths | Quantum state | UNIFY |

