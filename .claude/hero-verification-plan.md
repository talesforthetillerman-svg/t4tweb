# Hero Section: Strong Verification Plan by Node

**Purpose:** Verify each hero node independently with extreme, unambiguous changes  
**Date:** 2026-04-13

---

## Test Strategy

For EACH node:
1. Make a **visible extreme change** in `/editor`
2. **Deploy** and record response
3. Check `verificationByNodeId` and `persistedNodes`
4. Visit `/` and **verify visually**
5. Document: captured?, verified?, persisted?, visible?

---

## Node 1: hero-title (Parent Group)

### Change Made
- **Displacement:** Move title down by +80px (drag entire h1 down)
- **What should happen:** h1.style gets `transform: translate(0, 80px)`

### In Editor
1. `/editor` → Click on "Tales for the Tillerman" title
2. Drag it down (use visual handles or see in panel)
3. Verify title visibly moved down in editor preview

### Deploy Step
```
POST /api/editor-deploy
Expected in payload.nodes:
  - id: "hero-title"
  - type: "group"
  - explicitPosition: true
  - geometry.y: ~80 (or whatever new y is)
```

### Verification Expected
```json
{
  "nodeId": "hero-title",
  "storageTarget": "heroSection.elementStyles",
  "expected": { "y": 80, ... },
  "readBack": { "y": 80, ... },
  "matched": true
}
```

### Visual Check on Public (/)
- [ ] Title is positioned lower than default
- [ ] Title is NOT back to original position (not re-centered)
- [ ] Subtitle and logo positions unchanged (only title moved)

**Status: MUST PASS after hero-title fix**

---

## Node 2: hero-title-main (Main Phrase)

### Change Made
- **Color:** Change to bright CYAN `#00FFFF`
- **Font Weight:** Set to 900 (ultra bold)
- **What should happen:** Text color is CYAN and super bold

### In Editor
1. `/editor` → Click on title
2. Panel shows "Hero Title (Group Editor)"
3. Scroll to Phrase 1 color control
4. Set to `#00FFFF`
5. Set font weight to 900
6. Verify text turns CYAN and bold in editor

### Deploy Step
```
POST /api/editor-deploy
Expected:
  - id: "hero-title-main"
  - type: (internal span, may not be separate node)
  - OR captured as part of hero-title.content
```

### Verification Expected
One of:
- Option A: `hero-title-main` appears in `verificationByNodeId` with color matched
- Option B: `hero-title` appears with color in expected/readBack
- Option C: Not verified (design choice), but persisted in elementStyles

### Visual Check on Public (/)
- [ ] Main phrase text is CYAN (not white/gradient)
- [ ] Main phrase is BOLD (weight 900, very heavy)
- [ ] Accent text is STILL orange gradient (unchanged)

**Status: MUST PASS if panel works correctly**

---

## Node 3: hero-title-accent (Accent Phrase)

### Change Made
- **Color:** Change to bright MAGENTA `#FF00FF`
- **Text:** Change to "ULTIMATE MUSIC" (visible different text)
- **What should happen:** Accent text is MAGENTA and says "ULTIMATE MUSIC"

### In Editor
1. `/editor` → Click on title
2. Panel shows "Hero Title (Group Editor)"
3. Scroll to Phrase 2 (accent) textarea
4. Change "LIVE" to "ULTIMATE MUSIC"
5. Set accent color to `#FF00FF`
6. Verify changes in editor preview

### Deploy Step
```
POST /api/editor-deploy
Expected:
  - content updates for accentText
  - style updates for hero-title-accent color
```

### Verification Expected
```json
{
  "nodeId": "hero-title" (or hero-title-accent),
  "expected": { "accentText": "ULTIMATE MUSIC", "color": "#FF00FF", ... },
  "readBack": { ... same ... },
  "matched": true
}
```

### Visual Check on Public (/)
- [ ] Accent phrase says "ULTIMATE MUSIC" (not "LIVE")
- [ ] Accent text is MAGENTA `#FF00FF` (not orange gradient)
- [ ] Main phrase is unchanged (still says "Tales for the Tillerman")

**Status: MUST PASS after hero-title fix**

---

## Node 4: hero-subtitle

### Change Made
- **Text:** Change from "LIVE ATMOSPHERE" to "*** TESTING ***"
- **Color:** Change to bright LIME `#00FF00`
- **Font Size:** Change to 20px (much larger)
- **What should happen:** Subtitle text, color, and size all change

### In Editor
1. `/editor` → Click on subtitle "LIVE ATMOSPHERE"
2. Panel should show text, color, font size controls
3. Change text to "*** TESTING ***"
4. Set color to `#00FF00` (lime green)
5. Set font size to `20px`
6. Verify all changes visible in editor

### Deploy Step
```
POST /api/editor-deploy
Expected:
  - id: "hero-subtitle"
  - type: "text"
  - explicitContent: true (for text change)
  - explicitStyle: true (for color/size)
  - content.text: "*** TESTING ***"
  - style.color: "#00FF00"
  - style.fontSize: "20px"
```

### Verification Expected
```json
{
  "nodeId": "hero-subtitle",
  "storageTarget": "heroSection.elementStyles",
  "expected": { 
    "text": "*** TESTING ***",
    "color": "#00FF00",
    "fontSize": "20px"
  },
  "readBack": { ... same ... },
  "matched": true
}
```

### Visual Check on Public (/)
- [ ] Subtitle text shows "*** TESTING ***" (not "LIVE ATMOSPHERE")
- [ ] Subtitle is LIME GREEN `#00FF00` (not orange gradient)
- [ ] Subtitle is LARGER (20px, noticeably bigger than default ~14px)

**Status: Panel exists, should PASS**

---

## Node 5: hero-scroll-indicator

### Change Made
- **Text:** Change from "SCROLL" to "👆 SWIPE UP 👆"
- **Displacement:** Move up by -100px (y = y - 100)
- **Opacity:** Set to 0.3 (very faint)
- **What should happen:** Indicator moves up, shows new text, is dimmer

### In Editor
1. `/editor` → Click on bottom "SCROLL" text
2. Panel should show after hero-scroll-indicator fix (c14f0a6)
3. Change text to "👆 SWIPE UP 👆"
4. Drag up (move y position down negatively)
5. Set opacity to 0.3
6. Verify changes in editor

### Deploy Step
```
POST /api/editor-deploy
Expected:
  - id: "hero-scroll-indicator"
  - type: "card"
  - explicitContent: true (for text)
  - explicitPosition: true (for y change)
  - explicitStyle: true (for opacity)
  - content.text: "👆 SWIPE UP 👆"
  - geometry.y: (lower value, moved up)
  - style.opacity: 0.3
```

### Verification Expected
```json
{
  "nodeId": "hero-scroll-indicator",
  "storageTarget": "heroSection.elementStyles",
  "expected": { 
    "text": "👆 SWIPE UP 👆",
    "y": <lower>,
    "opacity": 0.3
  },
  "readBack": { ... same ... },
  "matched": true
}
```

### Visual Check on Public (/)
- [ ] Indicator moved UP from bottom (not at original position)
- [ ] Text shows "👆 SWIPE UP 👆" (not "SCROLL")
- [ ] Indicator is VERY FAINT (opacity 0.3, barely visible)

**Status: Panel fix applied (c14f0a6), MUST TEST**

---

## Node 6: hero-logo (Image)

### Change Made
- **Opacity:** Set to 0.5 (semi-transparent)
- **Scale:** Set to 1.3 (30% larger)
- **Position:** Move right by +40px
- **What should happen:** Logo is bigger, faint, offset to right

### In Editor
1. `/editor` → Click on T4T logo
2. Panel should show opacity, scale, position controls
3. Set opacity to 0.5
4. Set scale to 1.3
5. Drag right (+40px on x)
6. Verify all changes in editor

### Deploy Step
```
POST /api/editor-deploy
Expected:
  - id: "hero-logo"
  - type: "image"
  - explicitPosition: true (x moved)
  - explicitSize: true (or explicitStyle for scale)
  - geometry.x: <+40>
  - style.scale: 1.3
  - style.opacity: 0.5
```

### Verification Expected
```json
{
  "nodeId": "hero-logo",
  "storageTarget": "heroSection.elementStyles",
  "expected": { 
    "x": <+40>,
    "scale": 1.3,
    "opacity": 0.5
  },
  "readBack": { ... same ... },
  "matched": true
}
```

### Visual Check on Public (/)
- [ ] Logo is LARGER (scale 1.3, not default)
- [ ] Logo is OFFSET RIGHT (not centered)
- [ ] Logo is FAINT (opacity 0.5, semi-transparent)
- [ ] Logo is NOT replaced with fallback

**Status: Panel exists, geometry should work**

---

## Node 7: hero-bg-image (Background)

### Status: ❌ KNOWN BLOCKER

**Cannot test** image src changes because upload creates `blob:` URL.

**Can test** geometry/filters:
- Opacity: Set to 0.8
- Contrast: Set to 120
- Don't change image src (would be blob)

### If Proceeding
1. Change opacity only
2. Verify in deploy: `hero-bg-image` opacity captured
3. Check public: background slightly faint

---

## Summary Table (After Tests)

| Node | Panel Present? | Captured? | Verified? | Visual? | Status |
|------|---|---|---|---|---|
| hero-title | ✅ (group) | ✅ NOW | ✅ (fixed) | ? | READY |
| hero-title-main | ✅ (panel) | ✅ | ? | ? | READY |
| hero-title-accent | ✅ (panel) | ✅ | ? | ? | READY |
| hero-subtitle | ✅ | ✅ | ? | ? | READY |
| hero-scroll-indicator | ✅ (fixed) | ✅ (fixed) | ? | ? | READY |
| hero-logo | ✅ | ✅ | ? | ? | READY |
| hero-bg-image | ✅ | ✅ | ? | ⚠️ blob | PARTIAL |

---

## Test Execution Order

1. **First:** hero-title-main (simplest: just color)
2. **Second:** hero-subtitle (panel test)
3. **Third:** hero-scroll-indicator (panel fix test)
4. **Fourth:** hero-title (parent displacement, tests mismatch fix)
5. **Fifth:** hero-title-accent (accent-specific changes)
6. **Sixth:** hero-logo (image geometry)

Each test is independent and can be done separately.

---
