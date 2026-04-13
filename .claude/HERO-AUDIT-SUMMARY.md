# Hero Audit Summary: Diagnosis & Fixes Applied

**Audit Date:** 2026-04-13  
**Status:** Specific fixes applied, testing required  
**Honesty:** NOT declaring Hero complete; documenting what was wrong and what was fixed

---

## The Exact Problem Found

**Error in last deploy:** `hero-title:mismatch:x expected=77 actual=47`

### Root Cause (One Line)
File `app/api/editor-deploy/route.ts`, line 829: `HERO_LAYOUT_IDS` did NOT include `"hero-title"`, so when verification logic (line 1545) expected to find saved geometry for hero-title, it was missing.

### Detailed Flow
1. **Capture (lines 840-890):** Loop processes nodes in `HERO_LAYOUT_IDS`
   - ❌ `hero-title` was NOT in the Set → geometry SKIPPED
   - ✅ `hero-title-main`, `hero-title-accent` were captured
2. **Verification (lines 1545-1564):** Verification logic checks all `isHeroLayoutId` nodes
   - ✅ `hero-title` IS in `isHeroLayoutId` check (line 1513)
   - ✅ It has `explicitPosition`, so tries to verify geometry
   - ❌ But geometry was never saved → expected x=77, found x=47 or missing

### Why This Happened
`hero-title` is a **group/container** with two span children. Originally, only the children were in `HERO_LAYOUT_IDS` because they were the "real" editable elements. But when a user moves/resizes the PARENT h1 element, `hero-title` itself gets `explicitPosition=true` and needs its geometry captured.

---

## Fixes Applied

### Fix 1: Hero-Title Mismatch (Commit ea8d003)

**File:** `app/api/editor-deploy/route.ts` line 832  
**Change:** Add `"hero-title",` to `HERO_LAYOUT_IDS`

```diff
  const HERO_LAYOUT_IDS = new Set([
    "hero-section",
    "hero-bg-image",
+   "hero-title",
    "hero-title-main",
    "hero-title-accent",
    ...
  ])
```

**Why it works:**
- Capture loop now includes `hero-title`
- When `hero-title.explicitPosition = true`, geometry is saved to `elementStyles["hero-title"]`
- Verification loop finds matching geometry → no mismatch
- Render applies both parent and children geometry (CSS handles cascading)

**Impact:** 1 line changed, zero other code affected

---

### Fix 2: Hero-Scroll-Indicator Panel (Commit c14f0a6)

**File:** `components/visual-editor.tsx` line 1394  
**Change:** Remove `!isHeroScrollIndicatorCard &&` condition

```diff
  const isSimpleEditableCard =
    selectedNode?.type === "card" &&
-   !isHeroScrollIndicatorCard &&
    !isFooterSocialGroup &&
    !hasNestedEditableChildren &&
    !hasStructuredCardFields
```

**Why it works:**
- `hero-scroll-indicator` is type "card"
- Before fix: Explicitly excluded → no panel shown → no edits possible
- After fix: Uses `isSimpleEditableCard` panel → shows text input + opacity control
- User can now edit text and opacity → UPDATE_CARD dispatched → node marked dirty → enters changedNodeIds

**Impact:** 1 line removed, enables full flow for scroll indicator

---

## Files Touched

| File | Change | Lines | Commit |
|------|--------|-------|--------|
| `app/api/editor-deploy/route.ts` | Add "hero-title" to HERO_LAYOUT_IDS | 832 | ea8d003 |
| `components/visual-editor.tsx` | Remove scroll-indicator exclusion | 1394 | c14f0a6 |

---

## Honest State Table

| Node | Panel? | Capture? | Verify? | Tests? | Status |
|------|--------|----------|---------|--------|--------|
| **hero-title** | group editor | ✅ NOW | ✅ NOW | ❌ | ⚠️ Code fixed, needs test |
| **hero-title-main** | ✅ yes | ✅ yes | (as part of hero-title) | ❌ | ⏳ Untested |
| **hero-title-accent** | ✅ yes | ✅ yes | (as part of hero-title) | ❌ | ⏳ Untested |
| **hero-subtitle** | ✅ yes | ✅ yes | ✅ yes | ⚠️ partial | ⏳ Untested |
| **hero-scroll-indicator** | ✅ NOW | ✅ yes | ✅ yes | ❌ | ⚠️ Code fixed, needs test |
| **hero-logo** | ✅ yes | ✅ yes | ✅ yes | ⚠️ partial | ⚠️ Geometry OK, image src blocked |
| **hero-bg-image** | ✅ yes | ✅ yes | ✅ yes | ⚠️ partial | ❌ Image src blocked by blob: |

---

## What's NOT Complete

- ❌ No actual deploy tests run with fixes
- ❌ No visual confirmation in `/` public site
- ❌ `hero-scroll-indicator` panel has never been used
- ❌ `hero-title-main/accent` changes never confirmed
- ❌ `hero-bg-image` image persistence still blocked
- ❌ Full integration test suite not run

---

## What I'm NOT Claiming

❌ "Hero is complete"  
❌ "All nodes work perfectly"  
❌ "Full end-to-end tested"  

## What I AM Claiming

✅ **Specific mismatch diagnosed:** hero-title geometry not captured while verification expected it  
✅ **Root cause identified:** Missing from HERO_LAYOUT_IDS  
✅ **Minimal fix applied:** Added "hero-title" to capture list  
✅ **Second fix applied:** Removed hero-scroll-indicator exclusion  
✅ **Testing plan created:** Detailed verification steps for each node  
✅ **Honest documentation:** Clear state of what works, what's untested, what's blocked  

---

## Next Steps (Required)

To complete Hero verification:

1. **Restart server** with latest fixes
2. **Run test sequence** from `hero-verification-plan.md`
3. **For each node:**
   - Make extreme visible change
   - Deploy and check response
   - Verify in public `/`
   - Document result
4. **Fix any new failures** found
5. **Mark nodes as tested/working** only after visual confirmation

---

## Commits Delivered

```
c14f0a6 Enable edit panel for hero-scroll-indicator by removing explicit exclusion
ea8d003 Fix hero-title mismatch by including it in HERO_LAYOUT_IDS capture
```

---

## Documents Created

- `hero-title-mismatch-diagnosis.md` - Root cause analysis
- `hero-verification-plan.md` - Detailed test plan by node
- `HERO-STATE-HONEST.md` - Complete honest state assessment
- `HERO-AUDIT-SUMMARY.md` - This document

---

## Conclusion

✅ **Problems identified precisely.**  
✅ **Minimal code fixes applied.**  
✅ **Testing framework created.**  
❌ **NOT tested yet** (requires manual deploy/visual test).

Hero is NOT complete. Code is fixed. Testing is next.

---
