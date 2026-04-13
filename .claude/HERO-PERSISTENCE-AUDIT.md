# Hero Persistence Audit: Why Some Nodes Work, Others Don't

**Date:** 2026-04-13  
**Focus:** Trace hero-bg-image (WORKS) vs hero-logo/hero-title/hero-subtitle/hero-scroll-indicator (DON'T WORK)

---

## Known Facts from Latest Deploy

- ✅ **hero-bg-image**: Entered changedNodeIds, persisted to Sanity
- ❌ **hero-logo**: Did NOT enter changedNodeIds
- ❌ **hero-title**: Mismatch error (expected x=77, actual=47) - PARTIALLY FIXED in ea8d003
- ❌ **hero-subtitle**: Status unclear, possibly not persisting
- ❌ **hero-scroll-indicator**: Panel exclusion FIXED in c14f0a6, but never tested

---

## Flow Audit: Where Persistence Can Break

### Stage 1: Node Registration in scanRegistry()

**Condition:** Element has `data-editor-node-id` attribute in DOM

| Node | data-editor-node-id | data-editor-node-type | Hero-section.tsx Line | Status |
|------|---|---|---|---|
| hero-bg-image | ✅ hero-bg-image | background | 222 | ✅ FOUND |
| hero-logo | ✅ hero-logo | image | 279 | ✅ FOUND |
| hero-title | ✅ hero-title | group | 256 | ✅ FOUND |
| hero-subtitle | ✅ hero-subtitle | text | 302 | ✅ FOUND |
| hero-scroll-indicator | ✅ hero-scroll-indicator | card | 341 | ✅ FOUND |

**Conclusion:** All nodes SHOULD be found by scanRegistry() if HeroSection renders.

**Potential Issue:** HeroSection might NOT render until AFTER scanRegistry() runs if there's a timing issue. This was partially fixed by EditorAwareHomePageWrapper (fda0bfc) which now waits for nodes.size > 0.

---

### Stage 2: Panel Display & User Edit

**When Panel Shows:** User selects node → selectedNode populated → panel renders if condition matches

#### hero-bg-image
- Type: background
- Panel condition (line 2525): `selectedNode.type === "background" && selectedNode.content.mediaKind === "video"`
- **Status:** Panel shows only if mediaKind==="video"
- **Edit action:** If user changes image → UPDATE_BACKGROUND dispatched

#### hero-logo
- Type: image
- Panel condition (line 2404): `selectedNode.type === "image"`
- **Status:** Panel SHOULD show
- **Edit action:** If user changes → UPDATE_IMAGE dispatched

#### hero-title
- Type: group
- Panel condition (line 2134): `selectedNode.type === "group" && selectedNode.id === "hero-title"`
- **Status:** Panel SHOULD show (has special group editor)
- **Edit action:** If user edits → UPDATE_GROUP dispatched

#### hero-subtitle
- Type: text
- Panel condition (line 2235): `selectedNode.type === "text"` AND `!(heroSubtitleSegments.length > 0)`
- **Note:** heroSubtitleSegments always = [] for hero-subtitle (line 1369)
- **Status:** Panel SHOULD show
- **Edit action:** If user edits → UPDATE_TEXT dispatched

#### hero-scroll-indicator
- Type: card (currently "box" registered as "card")
- Panel condition (line 2585): `isSimpleEditableCard` AND NOT `isHeroScrollIndicatorCard`
- **Status:** FIX APPLIED (c14f0a6) → Panel now SHOULD show
- **Edit action:** If user edits → UPDATE_CARD dispatched

---

### Stage 3: Dirty Tracking

**When Node Becomes Dirty:** Update_* command runs → reducer processes → setNodes() → useEffect dirty tracking runs → signature compared → if changed, added to dirtyNodeIdsRef

| Node | Signature Changes When | In nodes Map? | Dirty Detected? |
|------|---|---|---|
| hero-bg-image | ✅ content.src, style | ? | ✅ YES (confirmed) |
| hero-logo | ✅ style, geometry | ? | ? |
| hero-title | ✅ content.text/.accentText, geometry | ? | ? |
| hero-subtitle | ✅ content.text, style | ? | ? |
| hero-scroll-indicator | ✅ content.text, style, geometry | ? | ? |

**Critical Question:** Are these nodes in `nodes` Map when UPDATE_* commands dispatch?

If a node is not in `nodes` Map:
- setNodes() will add it (or it was already there)
- Dirty tracking iterates `nodes.forEach()` → includes it
- Should be marked dirty

If a node IS in `nodes` Map:
- UPDATE_* command triggers setNodes()
- Dirty tracking compares signature
- If changed → added to dirtyNodeIdsRef

---

### Stage 4: Deploy Payload

**Condition:** changedNodeIds includes the node

```typescript
const changedNodeIds = Array.from(dirtyNodeIdsRef.current)  // line 1463 in visual-editor.tsx

// Then sent to /api/editor-deploy
const payload = {
  nodes: serializedNodes,  // ALL nodes in nodes Map
  changedNodeIds,           // ONLY nodes in dirtyNodeIdsRef
}
```

**For hero-bg-image:**
- If hero-bg-image changed → in changedNodeIds ✅
- Deploy processes it → captured in elementStylesInPayload ✅
- Saved to Sanity ✅

**For hero-logo, hero-title, etc.:**
- IF they changed → should be in changedNodeIds
- Deploy processes them
- hero-title: captured (added to HERO_LAYOUT_IDS in ea8d003) ✅
- hero-logo: captured (in HERO_LAYOUT_IDS) ✅
- hero-subtitle: captured (in HERO_LAYOUT_IDS) ✅
- hero-scroll-indicator: captured (in HERO_LAYOUT_IDS) ✅

**Potential Issue:** If nodes are NOT dirty (signature didn't change), they won't be in changedNodeIds, so deploy won't process them.

---

## Why might hero-logo/title/subtitle/scroll NOT be dirty?

### Hypothesis A: Panel doesn't show
- User clicks node but no panel appears
- User can't edit anything
- Signature never changes
- Node not marked dirty

**Evidence for:** User reported they don't persist
**Evidence against:** We checked panels exist for all these types

### Hypothesis B: Panel shows but dispatch doesn't work
- User edits in panel
- UPDATE_* should dispatch
- But dispatch fails silently
- Node not updated
- Signature doesn't change

**Would require debugging** dispatch() call

### Hypothesis C: Node not in nodes Map when dispatch runs
- scanRegistry() didn't find the element
- nodes Map is empty or missing nodes
- UPDATE_* affects non-existent node
- setNodes() creates it fresh with baseline signature
- So signature doesn't "change" from previous (no previous!)

**FIX:** EditorAwareHomePageWrapper should resolve this by waiting for nodes.size > 0

### Hypothesis D: Signature comparison broken for these types
- getNodeSignature() (line 1319) creates JSON of geometry/style/content
- For hero-logo, signature should include style changes (opacity, scale, etc.)
- For hero-title, should include text/accentText changes
- For hero-subtitle, should include text/style changes

**Would require inspection** of actual signature values

---

## What the Fix (fda0bfc) Likely Resolved

**EditorAwareHomePageWrapper:**
- Waits until `isEditing=true && nodes.size > 0`
- Prevents rendering content while editor still initializing
- Ensures HeroSection renders when nodes have been registered

**Impact on Persistence:**
1. ✅ Prevents fallback visual (Problem 2)
2. ✅ Ensures hero nodes are in DOM when scanRegistry() runs
3. ✅ nodes Map should now include all hero nodes
4. ? Unknown: Does this fully solve persistence, or are there other breaks?

---

## What Still Needs Testing

To confirm persistence works now:

1. **Test hero-logo:**
   - Edit opacity/scale/position
   - Deploy
   - Check changedNodeIds includes hero-logo
   - Check verificationByNodeId shows match
   - Visual check: changes visible in public /

2. **Test hero-title:**
   - Edit text or position
   - Deploy
   - Check mismatch error gone (fix ea8d003 should help)
   - Check changedNodeIds includes hero-title
   - Visual: changes visible in public /

3. **Test hero-subtitle:**
   - Edit text/color/size
   - Deploy
   - Check changedNodeIds includes hero-subtitle
   - Visual: changes visible in public /

4. **Test hero-scroll-indicator:**
   - Edit text/position (fix c14f0a6 should enable panel)
   - Deploy
   - Check changedNodeIds includes hero-scroll-indicator
   - Visual: changes visible in public /

---

## Remaining Unknown Variables

| Question | Answer | Impact |
|----------|--------|--------|
| Do hero nodes register in scanRegistry()? | Unknown - depends on SSR timing | Critical for persistence |
| Does EditorAwareHomePageWrapper fix timing? | Unknown - not tested | Likely fixes most of it |
| Are panels actually visible for each node? | Unknown - need manual test | Required for edits |
| Does UPDATE_* dispatch work for each type? | Unknown - need debug | Required for dirty tracking |
| Are signatures changing when edited? | Unknown - need logs | Required for dirty marking |

---

## Summary

**Before fda0bfc:**
- Fallback visual allowed rendered without editor state ready
- hero nodes might not register in scanRegistry()
- Even if registered, couldn't edit properly

**After fda0bfc:**
- /editor waits until editor is ready
- hero nodes should register correctly
- Panels should work
- Persistence should work

**Confidence Level:** Medium
- Logic looks correct
- Build passes
- But NOT TESTED in actual deploy

---

## Next: Manual Testing Required

1. Restart dev server with fda0bfc
2. Go to /editor
3. Verify NO flicker/fallback visual
4. Edit hero-logo (change opacity)
5. Deploy
6. Check hero-logo in changedNodeIds
7. Verify change visible in public /

Repeat for hero-title, hero-subtitle, hero-scroll-indicator.

---
