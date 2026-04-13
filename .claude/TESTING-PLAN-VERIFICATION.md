# Testing Plan & Verification

**Status:** Ready for real browser testing  
**Build:** ✅ Clean  
**All changes committed:** ✅ Yes  

---

## Testing Checklist

### Phase 1: Boot Behavior (5 minutes)

```
1. Hard refresh /editor (Ctrl+Shift+R)
   □ Observe browser console
   □ Look for logs: [BOOT] Node scan starting...
   □ Look for logs: [BOOT] scanRegistry() found N nodes...
   □ Look for logs: [BOOT] Categories: { heroNodes: X, navNodes: Y, other: Z }
   □ Loader should disappear within 2 seconds
   □ Content should be visible and correct
   
2. Verify content is FRESH (not old)
   □ Check hero-title text matches what's in Sanity drafts
   □ Check hero-subtitle text matches
   □ Check nav-logo image matches
   □ Nothing should look like yesterday's edit
   
3. Open dev console → Network tab
   □ Check that only fresh requests are being made
   □ No old cached resources
```

### Phase 2: Edit Within Session (10 minutes)

```
1. Edit hero-title text
   □ Click hero-title element
   □ Open panel
   □ Change text to something obvious (e.g., "TEST EDIT HEROIC")
   □ Should appear in /editor immediately
   
2. Edit hero-subtitle
   □ Click hero-subtitle
   □ Open panel
   □ Change text to something obvious
   □ Should appear immediately
   
3. Edit hero-logo opacity
   □ Select hero-logo
   □ Open panel or drag
   □ Change opacity to 0.5
   □ Should change visually
   
4. Edit nav-brand-name
   □ Select nav-brand-name
   □ Should be selectable
   □ Open panel if exists
   □ Edit text or color
   
5. Refresh browser WHILE EDITING (Ctrl+F5)
   □ sessionStorage should still have current state
   □ edits should be preserved
   □ Can continue editing
   □ This is WITHIN-session persistence (should work)
```

### Phase 3: Deploy & Public Verification (10 minutes)

```
1. Deploy one of the edits (hero-title)
   □ Click Deploy button
   □ Check browser console: changedNodeIds should include "hero-title"
   □ Check /api/editor-deploy received the payload
   □ Sanity should be updated
   
2. Navigate to / (public)
   □ Hard refresh (Ctrl+Shift+R)
   □ Should show the deployed hero-title edit
   □ OLD edits should NOT be visible
   
3. Return to /editor
   □ Should still show the deployed version
   □ Check that new edits don't appear (unless deployed)
```

### Phase 4: Cross-Session Test (Very important)

```
1. Edit something in /editor
   □ Change hero-subtitle to "OLD EDIT"
   □ DON'T deploy
   □ Close /editor (navigate away or close tab)
   
2. Wait or go to different project
   □ Time passes, context is cleared
   
3. Return to /editor
   □ Hero-subtitle should NOT show "OLD EDIT"
   □ Should show Sanity current content
   □ This proves: no sessionStorage restore from old session
   □ This is the FIX we wanted
```

### Phase 5: Stress Test (Optional)

```
1. Multiple rapid edits
   □ Edit 5-10 nodes rapidly
   □ Deploy
   □ Check all appear in changedNodeIds
   □ Check all deployed successfully
   
2. Large text edits
   □ Change hero-title to very long text
   □ Refresh while editing
   □ sessionStorage should preserve
   
3. Boot with no internet
   □ Intentionally disconnect
   □ Try to open /editor
   □ Should show timeout error after 30 seconds
   □ Shows that boot timeout works
```

---

## Expected Results

### ✅ What Should Happen Now

```
/editor:
  - Boots in ~1-2 seconds
  - Shows fresh content (not old)
  - Allows editing immediately
  - Overlays appear correctly
  - Deploy works
  
/:
  - Shows deployed changes
  - Does NOT show un-deployed edits
  - Does NOT show old content
  - Fresh every time
  
Cross-session:
  - Closing browser and returning shows current Sanity state
  - OLD edits don't reappear unless deployed
  - No sessionStorage contamination
```

### ❌ What Should NOT Happen

```
- Old content appearing
- Loader hanging forever
- Editor taking >5 seconds to boot
- sessionStorage loading old data
- HeroSectionWrapper merging text
- Boot going through two paths
- Quantum state (different result each session)
```

---

## Console Logs to Expect

### Successful Boot:
```
[BOOT] Node scan starting at TIMESTAMP...
[BOOT] Scanning DOM for all [data-editor-node-id] elements...
[BOOT] scanRegistry() found 23 nodes: [ "hero-section", "hero-bg-image", "hero-title", ... ]
[BOOT] Categories: { heroNodes: 8, navNodes: 3, other: 12 }
[BOOT] Boot complete. Nodes: 23, { ids: [...], heroNodes: [...] }
[WRAPPER] Showing content { isEditing: true, editorBootComplete: true }
```

### Boot Timeout:
```
[BOOT] Timeout: Editor boot did not complete within 30 seconds
[BOOT] This indicates scanRegistry() failed or nodes could not be loaded
```

---

## If Something Goes Wrong

### Symptom: Loader doesn't disappear
**Check:**
- Console for boot logs
- Is scanRegistry() running?
- Are nodes being found?
- Check for error in console
- After 30 seconds, should force show content anyway

### Symptom: Old content still appears
**Check:**
- HeroSectionWrapper - is it still merging? (should NOT be)
- sessionStorage - is restore code still there? (should NOT be)
- Build - did changes get compiled?
- Browser cache - clear it (Ctrl+Shift+Delete)

### Symptom: Edits not persisting across refresh
**Check:**
- sessionStorage - might have been cleared too aggressively
- But this should NOT happen in same session

---

## Verification Checklist

```
After testing, verify:

□ Build is clean (no errors/warnings)
□ TypeScript passed
□ No console errors (except expected logs)
□ /editor boots without old content
□ User can edit nodes
□ Deploy works
□ Public shows deployed changes
□ Cross-session doesn't restore old sessionStorage
□ Loader doesn't hang
□ All changes are in git history
```

---

## Success Criteria

✅ System passes if:

1. No old content appears in /editor
2. /editor boots in ~2 seconds
3. User can edit and deploy
4. Public reflects deployed changes
5. Closing browser and returning doesn't show old edits
6. Build is clean
7. No console errors

---

## Next Actions

1. **Restart dev server:** `npm run dev`
2. **Open browser dev tools:** F12 → Console tab
3. **Navigate to /editor:** Watch logs
4. **Try editing a node:** Verify panel appears
5. **Deploy:** Check logs for changedNodeIds
6. **Navigate to /:** Verify public shows changes
7. **Close /editor and return:** Verify no old content

Then report:
- Did it work as expected?
- Any old content appearing?
- Any errors in console?
- Any issues with editing/deploying?

