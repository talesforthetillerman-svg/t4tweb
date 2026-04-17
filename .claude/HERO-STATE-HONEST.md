# Hero Section: Honest State Assessment

**Date:** 2026-04-13  
**Assessment:** NOT COMPLETE - Specific issues identified, fixes applied, testing required

---

## What We Know from Evidence

### ✅ Working (Confirmed in Deploy Log)
- **nav-brand-name**: Persisted, verified, visible
- **hero-logo**: Persisted ✅ (though image src still blocked by blob)

### ⚠️ Partially Working (Had Issues, Fixes Applied)
- **hero-title**: ❌ FAILED (mismatch) → ✅ FIX APPLIED (added to HERO_LAYOUT_IDS)
- **hero-subtitle**: ✅ SHOULD WORK (persisted) but needs visual confirmation

### ❌ Not Yet Tested / Verified
- **hero-title-main**: No confirmation in deploy log
- **hero-title-accent**: No confirmation in deploy log
- **hero-scroll-indicator**: NOT IN DEPLOY LOG (panel fix applied, but untested)

### ❌ Known Blockers
- **hero-bg-image**: Blocked by blob: URL (cannot persist image src changes)

---

## Detailed State by Node

### Node: hero-title (Parent Group)

**Status:** ⚠️ MISMATCH FIXED (needs verification)

**What was wrong:**
```
Deploy attempted to verify geometry:
  expected.x = 77 (new position)
  readBack.x = 47 (old position)
  Result: MISMATCH (failed)
```

**Root cause:** Node was not in HERO_LAYOUT_IDS capture list, so geometry was never saved to elementStyles.

**Fix applied:** Added "hero-title" to HERO_LAYOUT_IDS (commit ea8d003)

**Expected after fix:**
- When user moves hero-title → geometry saved to elementStyles["hero-title"]
- Verification reads it back and matches
- Render applies transform: translate(new_x, new_y)

**Status:** ✅ Code fix applied, ⏳ NEEDS TESTING

**Test command:**
```
1. /editor → Move title down by 80px → Deploy
2. Check response: hero-title in verificationByNodeId with matched: true
3. /public → Verify title is lower
```

---

### Node: hero-title-main (Main Phrase Span)

**Status:** ⚠️ Assumed working, NOT CONFIRMED

**What we know:**
- Element exists in DOM: `<span data-editor-node-id="hero-title-main">`
- Registered in visual editor as part of hero-title group
- Panel exists: Hero Title Group Editor allows editing "Phrase 1"
- Capture would work IF node has explicitStyle
- Render applies: `style={getElementLayoutStyle(data.elementStyles, "hero-title-main")}`

**What we don't know:**
- Did it actually enter verificationByNodeId in last deploy?
- Was color change persisted and visible?
- Is the panel editable OR read-only?

**Status:** ✅ Logic looks correct, ⏳ NEEDS VISUAL TEST

**Test command:**
```
1. /editor → Click title → Panel: Phrase 1 color to #00FFFF → Deploy
2. Check response: hero-title-main or hero-title in verificationByNodeId
3. /public → Verify text is cyan (not white/gradient)
```

---

### Node: hero-title-accent (Accent Phrase Span)

**Status:** ⚠️ Assumed working, NOT CONFIRMED

**What we know:**
- Element exists: `<span data-editor-node-id="hero-title-accent">`
- Registered and editable via panel: "Phrase 2" in group editor
- Default gradient color: orange to red
- Render applies: `style={getElementLayoutStyle(data.elementStyles, "hero-title-accent")}`

**What we don't know:**
- If user changes accent color/text, does it persist?
- Was it included in last deploy's verificationByNodeId?

**Status:** ✅ Logic looks correct, ⏳ NEEDS TEST

**Test command:**
```
1. /editor → Click title → Panel: Phrase 2 text to "ULTIMATE MUSIC", color to #FF00FF → Deploy
2. Check response: hero-title-accent in verificationByNodeId
3. /public → Verify accent says "ULTIMATE MUSIC" in magenta (not orange)
```

---

### Node: hero-subtitle

**Status:** ✅ SHOULD WORK (has persisted in deploy, needs visual)

**Evidence:**
- Appears in deploy log as persisted ✅
- Panel exists: Text, color, font controls
- Content captured: text and styles
- Render applies: `style={getElementLayoutStyle(data.elementStyles, "hero-subtitle")}`

**What was confirmed:**
- Content changes (text) ARE being saved
- Panel shows and is editable

**What needs verification:**
- Are style changes (color, font size) persisted?
- Are changes visible in public?

**Status:** ✅ Capture confirmed, ✅ Panel exists, ⏳ VISUAL TEST

**Test command:**
```
1. /editor → Click subtitle → Change text to "*** TEST ***" + color to #00FF00 + font 20px → Deploy
2. Check response: hero-subtitle in verificationByNodeId with matched: true
3. /public → Verify all changes visible
```

---

### Node: hero-scroll-indicator

**Status:** ❌ NOT IN DEPLOY LOG (panel fix applied, needs testing)

**What was wrong:**
- Explicitly excluded from edit panel: `!isHeroScrollIndicatorCard &&` (line 1394)
- Panel never showed → User couldn't edit → Never entered changedNodeIds

**Fix applied:** Removed exclusion (commit c14f0a6)

**Expected after fix:**
- Panel now shows: Simple card text editor + opacity control
- User can edit text and opacity
- Changes dispatched as UPDATE_CARD
- Node enters changedNodeIds
- Verification passes

**What wasn't tested:**
- Deploy hasn't been run AFTER the fix
- No confirmation that panel now appears
- No confirmation that changes are captured

**Status:** ✅ Code fix applied, ❌ NEVER TESTED

**Test command:**
```
1. /editor → Click "SCROLL" at bottom → Panel should show text + opacity controls
2. Change text to "👆 SWIPE UP 👆" + opacity to 0.3 → Deploy
3. Check response: hero-scroll-indicator in changedNodeIds and verificationByNodeId
4. /public → Verify text changed and indicator is faint
```

---

### Node: hero-logo

**Status:** ✅ PERSISTED (geometry works, image src blocked)

**Evidence:**
- Appears in deploy log as persisted ✅
- Panel exists: Asset, opacity, filters
- Geometry captured: x, y, width, height, scale
- Render applies: `style={getElementLayoutStyle(data.elementStyles, "hero-logo")}`

**What works:**
- Position changes (x, y)
- Size changes (width, height)
- Scale
- Opacity
- Contrast, saturation, brightness

**What doesn't work:**
- Image src changes → Creates blob: URL → Not persistent
- Only Sanity asset URLs work

**Status:** ✅ Geometry & filters work, ❌ Image src blocked

**Test command (geometry only):**
```
1. /editor → Click logo → Change opacity to 0.5 + scale to 1.3 + move right +40px → Deploy
2. Check response: hero-logo in verificationByNodeId with matched: true
3. /public → Verify logo is faint, larger, offset right
```

---

### Node: hero-bg-image

**Status:** ❌ BLOCKED BY blob: URL

**What works:**
- Geometry (x, y, width, height, scale)
- Filters (contrast, saturation, brightness, negative)

**What doesn't work:**
- Image src changes (upload creates blob:// URL, not persistent)
- This is a KNOWN LIMITATION of the current upload flow

**Known workaround:**
- Use Sanity asset URLs directly (requires admin backend)
- Don't test image changes via upload

**Status:** ❌ Image persistence blocked, ✅ Geometry & filters should work

---

## Summary: What Actually Works Right Now

| Node | Content | Geometry | Styles | Panel | Tested? |
|------|---------|----------|--------|-------|---------|
| hero-title | (group) | ✅ FIXED | (group) | ✅ | ❌ |
| hero-title-main | ✅ | ✅ | ✅ | ✅ | ❌ |
| hero-title-accent | ✅ | ✅ | ✅ | ✅ | ❌ |
| hero-subtitle | ✅ | ✅ | ✅ | ✅ | ⚠️ partial |
| hero-scroll-indicator | ✅ FIXED | ✅ | ✅ | ✅ FIXED | ❌ |
| hero-logo | (asset) | ✅ | ✅ | ✅ | ⚠️ partial |
| hero-bg-image | ❌ blob | ✅ | ✅ | ✅ | ⚠️ partial |

---

## Critical Gaps

1. **hero-title mismatch**: ✅ FIXED IN CODE (ea8d003), needs deploy test
2. **hero-scroll-indicator panel**: ✅ FIXED IN CODE (c14f0a6), NEVER TESTED
3. **hero-title-main/accent**: ✅ Code looks right, NEVER TESTED
4. **Blob blocking**: ❌ No fix yet (design limitation)

---

## What "Hero Complete" Actually Means

✅ Can be said when ALL of these pass:

1. **hero-title**: Deploy test shows matched: true after moving it
2. **hero-title-main**: Text + color change persists and is visible
3. **hero-title-accent**: Text + color change persists and is visible
4. **hero-subtitle**: Text + style changes persist and are visible
5. **hero-scroll-indicator**: Text change + position visible after panel fix
6. **hero-logo**: Opacity/scale/position changes persist and are visible
7. **hero-bg-image**: Geometry/filters persist (acknowledge blob blocks src)

---

## What's Actually Done vs. What's Claimed

| Aspect | What I Said | Actual | Status |
|--------|------------|--------|--------|
| "Hero is materializing" | Yes | Partially - some work, some fail | ⚠️ |
| "hero-scroll-indicator has panel" | Yes | No - exclusion was still there | ❌ FIXED |
| "hero-title works" | Yes | No - had mismatch | ❌ FIXED |
| "All panels exist" | Yes | Yes, for most | ✅ |
| "Tests confirm working" | Implicit | Zero actual tests | ❌ |

---

## Next Steps (Honest List)

1. **Restart dev server** with latest fixes (c14f0a6, ea8d003)
2. **Run test sequence** from hero-verification-plan.md
3. **Document results** in a separate file
4. **Fix failures** if any appear
5. **Only then** claim Hero is working

**Estimated:** ~15-20 minutes per node × 6 nodes = ~2 hours of testing

---
