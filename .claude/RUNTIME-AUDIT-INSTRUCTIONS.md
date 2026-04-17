# Runtime Audit Instructions

**Goal:** Capture the EXACT timeline and DOM state of `/editor` boot

## Setup (Do This First)

1. **Clear browser cache and storage:**
   ```
   - Open DevTools (F12)
   - Go to Application tab
   - Clear Storage > All site data
   - Close DevTools
   ```

2. **Open fresh incognito/private window**
   - This prevents any cached state

3. **Open DevTools again**
   - Go to Console tab
   - Keep it open

## The Test

4. **Navigate to http://localhost:3000/editor**
   - Watch the console logs appear
   - Note the sequence and timestamps
   - Copy ALL logs starting from [RUNTIME] through the first few seconds

5. **What you should see:**
   ```
   [RUNTIME] EditorPage mounted at ...
   [BOOT-PHASE1] ... First useEffect running (no deps)
   [BOOT-PHASE1] ... isEditorRoute=true
   [BOOT-PHASE1] ... Desktop detected, setting isEditing=true
   [WRAPPER-HYDRATE] Client hydration complete at ...
   [WRAPPER-LOADER] ... Showing loader. isEditing=true, bootComplete=false
   [BOOT-PHASE2] ... Node scan starting
   [BOOT-PHASE2] ... Scanning DOM for all [data-editor-node-id] elements...
   [BOOT-PHASE2] ... scanRegistry() found N nodes: [list]
   [BOOT-PHASE2] ... Categories: {heroNodes: X, navNodes: Y, other: Z}
   [BOOT-PHASE2] ... Built nodes, calling setNodes(N)
   [BOOT-PHASE2] ... Boot complete. Calling setEditorBootComplete(true)
   [WRAPPER-CONTENT] ... Showing content. isEditing=true, bootComplete=true
   [OVERLAY-MOUNT] ... VisualEditorOverlay mounting
   [OVERLAY-MOUNT] ... Context loaded. isEditing=true, nodes.size=N
   [HERO-WRAPPER] ... Rendering with data: title="...", subtitle="..."
   ```

## What to Capture

Copy the ENTIRE console output and paste it back with these answers:

1. **Total time from [RUNTIME] to [WRAPPER-CONTENT]:** _____ ms
2. **How long loader visible:** _____ ms
3. **Any errors or warnings:** YES / NO (if YES, paste them)
4. **Were [BOOT-PHASE2] logs printed or missing:** printed / missing / partial
5. **Final message - is it [WRAPPER-CONTENT] or something else:** _____
6. **Number of nodes found by scanRegistry():** _____

## Visual Inspection

While waiting for logs:

7. **What do you SEE on screen?**
   - Black screen with "Loading editor..."
   - Content appears (hero, nav, sections)
   - Overlays appear (selection boxes, toolbar)
   - Describe the sequence and timing

8. **When did overlays/panels become visible:** immediately / after X seconds / never

9. **Does hero-title text look correct?** YES / NO
   - If NO: what does it say?

10. **Can you click on hero-logo and select it?** YES / NO / needs click, doesn't highlight

## Then Tell Me

Paste:
- Full console log output
- Answers to questions 1-10
- Screenshot of the screen after it fully loaded

This will show me EXACTLY what's happening in runtime, not just static analysis.

