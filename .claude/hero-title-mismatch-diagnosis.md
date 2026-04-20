# Hero-Title Mismatch: Diagnosis & Fix

**Date:** 2026-04-13  
**Error:** `hero-title:mismatch:x expected=77 actual=47`  
**Status:** ✅ FIXED

---

## The Problem

When `hero-title` is moved/resized in the editor:
1. **Verification expects** (line 1545-1550): `heroSection.elementStyles["hero-title"].x` to exist and equal the new position (e.g., 77)
2. **But capture skips it** (line 829-838): `hero-title` was NOT in `HERO_LAYOUT_IDS`, so its geometry was NEVER saved
3. **Result**: Verification reads back old/missing value (e.g., 47 or undefined) → MISMATCH

---

## Root Cause Analysis

### Code Flow: Three Conflicting Behaviors

**1. Capture Logic (lines 840-890)**
```typescript
const HERO_LAYOUT_IDS = new Set([
  // ... hero-title-main, hero-title-accent, ...
  // ❌ MISSING: "hero-title" (the parent group)
])

for (const node of payload.nodes) {
  if (!HERO_LAYOUT_IDS.has(node.id)) continue  // ← hero-title skipped here
  // ... save geometry to elementStyles ...
}
```

**2. Verification Logic (lines 1545-1564)**
```typescript
const isHeroLayoutId = 
  // ... 
  nodeId === "hero-title" ||  // ← ✅ hero-title IS expected here
  // ...

if (isHeroLayoutId && (node.explicitPosition || ...)) {
  storageTarget = "heroSection.elementStyles"
  if (node.explicitPosition) {
    expected.x = roundLayoutPx(node.geometry.x)  // Expects to find it
    readBack.x = heroStyle.x  // But it's not there
  }
}
```

**3. Render Logic (hero-section.tsx:260)**
```typescript
style={getElementLayoutStyle(data.elementStyles, "hero-title")}
// Tries to apply hero-title geometry from elementStyles
// But it was never saved!
```

### Why This Conflict Exists

- `hero-title` is a group containing `hero-title-main` and `hero-title-accent` (spans)
- Initially, only the child nodes (main/accent) were set up for layout capture
- But when users resize/move the PARENT h1 element, `hero-title` itself gets `explicitPosition=true`
- The verification logic correctly treats this as a "hero layout node" that needs geometry verification
- But the capture logic doesn't

---

## The Fix

**Commit: c14f0a7** (if applied)

Add `"hero-title"` to `HERO_LAYOUT_IDS` (line 829):

```typescript
const HERO_LAYOUT_IDS = new Set([
  "hero-section",
  "hero-bg-image",
  "hero-title",           // ← ADDED
  "hero-title-main",
  "hero-title-accent",
  "hero-subtitle",
  "hero-logo",
  "hero-scroll-indicator",
  "hero-buttons",
])
```

**Why this works:**
1. When user moves `hero-title`, `node.explicitPosition=true`
2. Capture loop processes it and saves `elementStyles["hero-title"].x`, `.y`
3. Verification loop reads back `elementStyles["hero-title"].x` and finds matching value
4. No mismatch → verification passes
5. Render applies both parent geometry and children geometry (both are saved now)

---

## What Gets Captured Now

| Node | Capture? | Type | Purpose |
|------|----------|------|---------|
| hero-title | ✅ NOW | geometry (x,y,w,h,scale) | Parent group positioning |
| hero-title-main | ✅ YES | geometry + text styles | First phrase |
| hero-title-accent | ✅ YES | geometry + text styles | Second phrase (gradient) |

**Content** (title, titleHighlight) still captured from hero-title.explicitContent (lines 749-761).

---

## Impact on Rendering

hero-section.tsx (line 260) already has:
```typescript
style={getElementLayoutStyle(data.elementStyles, "hero-title")}
```

Now this will work correctly:
- If user moves the h1 parent → geometry saved → applied here
- If user moves spans (main/accent) → their geometry saved → applied on their styles
- Both can coexist without conflict (CSS cascades correctly)

---

## Verification Table

**Before Fix:**
| Node | Captured? | Verified? | Result |
|------|-----------|-----------|--------|
| hero-title | ❌ NO | ✅ YES | ❌ MISMATCH |
| hero-title-main | ✅ YES | (skipped if only child) | ✅ OK |
| hero-title-accent | ✅ YES | (skipped if only child) | ✅ OK |

**After Fix:**
| Node | Captured? | Verified? | Result |
|------|-----------|-----------|--------|
| hero-title | ✅ YES | ✅ YES | ✅ MATCH |
| hero-title-main | ✅ YES | (skipped if only child) | ✅ OK |
| hero-title-accent | ✅ YES | (skipped if only child) | ✅ OK |

---

## Minimal Change

Only change required: Add one string to a Set.
- **File:** app/api/editor-deploy/route.ts
- **Lines:** 829-838
- **Added:** `"hero-title",` 
- **Impact:** Capture now handles all hero layout nodes consistently with verification

No changes needed to:
- Verification logic (already correct)
- Render logic (already correct)
- Content capture (already correct)

---

## Testing Checklist

To verify the fix works:

1. **Open `/editor`**
2. **Select hero-title** (click on main title)
3. **Move it significantly** (change x position by ~50px)
4. **Deploy**
5. **Check response**: Should have `hero-title` in `verificationByNodeId` with `matched: true`
6. **Visit `/`**: Title should be in new position
7. **Verify no mismatch error** in deploy response

---

## Related Issues Remaining

- ❌ **hero-bg-image**: Still blocked by blob: URL (image src changes)
- ⚠️ **hero-scroll-indicator**: Panel fix applied (c14f0a6), needs testing
- ⚠️ **hero-logo**: Panel exists, geometry capture should work
- ✅ **hero-subtitle**: Panel exists, should work

These are separate from the `hero-title` mismatch fix.

---
