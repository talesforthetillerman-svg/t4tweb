# Boot Audit: Findings & Root Causes

**Date:** 2026-04-13

---

## Critical Findings

### Finding 1: HomeEditorStateApplier - DEAD CODE
**Severity:** LOW (doesn't affect boot, just clutter)
**File:** `components/home-editor-state-applier.tsx`
**Status:** Completely disabled, returns null, never imported
**Evidence:** 
```bash
grep -r "HomeEditorStateApplier" /Users/macbookair/t4tweb-1 --include="*.tsx"
# Result: Only finds the definition, zero imports
```
**Comment in code:** "DISABLED: This component was causing fallback/rollback issues in /editor with retries"
**Action:** DELETE - pure dead code

---

### Finding 2: sessionStorage Staleness - ROOT CAUSE OF INTERMEDIATE STATES
**Severity:** HIGH (causes exact symptom: old content visible briefly)
**File:** `components/visual-editor.tsx` lines 706-730 and 758-765
**Root Problem:**
1. sessionStorage is written when nodes change (line 758-765)
2. sessionStorage is NEVER cleared when editor closes (isEditing=false)
3. User leaves /editor
4. User returns to /editor
5. Boot restores stale nodes from old sessionStorage (line 706-730)
6. Content rendered fresh from SSR (previewDrafts) but nodes are old
7. Visual mismatch: content appears in old positions, then recalculates

**Proof of Flow:**
```
Entry 1 to /editor:
  → scanRegistry() finds fresh DOM
  → creates nodes with correct positions
  → nodes saved to sessionStorage (line 762)
  
User leaves /editor (closes tab, navigates away):
  → isEditing becomes false
  → NO cleanup of sessionStorage ← BUG
  → sessionStorage STILL contains old nodes

Entry 2 to /editor (next day):
  → SSR loads previewDrafts (FRESH data)
  → Boot tries sessionStorage restore (line 710)
  → Finds old nodes from previous session ← STALE
  → Restores them, restoredFromSession=true
  → SKIPS DOM scan (line 726)
  → Uses OLD nodes with content from FRESH SSR
  → Visual mismatch
  → User sees old position for 100ms, then overlay system corrects it
```

**Symptom Matches:** "shows intermediate/fallback appearance", "content appears in wrong position"

**Fix Required:** Clear sessionStorage when isEditing becomes false

---

### Finding 3: nodesBuiltRef Prevents Fresh Scans - CORRECT BEHAVIOR
**Status:** Working as designed
**File:** `components/visual-editor.tsx` line 694-701
**Purpose:** Prevent double-scanning of DOM on hydration
**How it works:**
- Set to false initially
- After first scan, set to true (line 701)
- If set to true, next useEffect skips scan (line 700)
- Prevents re-scanning if isEditing toggles
**Is this a problem?** NO
- It's correct to scan once
- Subsequent state changes don't need re-scan
- nodesBuiltRef is never reset except on component mount
**Note:** This DOES rely on sessionStorage restore being correct, which depends on Finding 2 fix

---

## Secondary Issues Found

### Issue 1: No cleanup when editor closes
**File:** `components/visual-editor.tsx`
**Line:** After line 755 (where isEditing cleanup happens)
**Current:** Only sets editorBootComplete=false
**Missing:** Clear sessionStorage when isEditing becomes false
**Why:** Prevents stale sessions from contaminating next boot

### Issue 2: nodesBuiltRef never resets
**Impact:** If a fresh `/editor` entry should rescan, it won't
**But:** With sessionStorage cleared, this is correct (no re-scan needed)
**Edge case:** If sessionStorage restore fails (rare), we'd still use old DOM
**Status:** Acceptable, not a bug, but sessionStorage cleanup is more critical

---

## Code Status Summary

| Component | Status | Issues | Action |
|-----------|--------|--------|--------|
| `HomeEditorStateApplier` | Dead code | None (just clutter) | DELETE |
| `sessionStorage restore` | Active | STALE DATA on return | FIX: clear on exit |
| `sessionStorage write` | Active | Works correctly | NO CHANGE |
| `nodesBuiltRef` | Active | Works correctly | NO CHANGE |
| `EditorAwareHomePageWrapper` | Active | Now uses editorBootComplete | NO CHANGE |
| `VisualEditorProvider` | Active | Core boot logic | NO CHANGE |
| `HomeEditorOverridesProvider` | Active | Image source resolution | NO CHANGE |

---

## Fixes Required

### Fix 1: Delete HomeEditorStateApplier
**File:** Delete `components/home-editor-state-applier.tsx`
**Impact:** Zero (dead code)
**Risk:** None

### Fix 2: Clear sessionStorage on Editor Exit
**File:** `components/visual-editor.tsx`
**Location:** In the useEffect that resets editorBootComplete (around line 751)
**Change:**
```typescript
// Reset boot complete flag and clear session state when editor closes
useEffect(() => {
  if (!isEditing) {
    setEditorBootComplete(false)
    // Clear stale session state to prevent staleness on next boot
    try {
      window.sessionStorage.removeItem("__VISUAL_EDITOR_SESSION_STATE__")
    } catch (e) {
      // Ignore errors
    }
  }
}, [isEditing])
```

---

## Testing Plan After Fixes

1. Delete HomeEditorStateApplier
2. Add sessionStorage cleanup on editor exit
3. Build (TypeScript check)
4. Test:
   - Go to /editor
   - Make edits (opacity, position, text)
   - Leave /editor (navigate away, close browser)
   - Return to /editor
   - Verify NO intermediate state or old content
   - Verify content loaded fresh and correct positions
   - Verify can edit immediately
   
---

## Expected Result

**After Fixes:**
- `/editor` boots cleanly without sessionStorage stale state
- No intermediate visual flash
- No old content appearing
- No editor blocking on boot
- Correct persistence flow still works

