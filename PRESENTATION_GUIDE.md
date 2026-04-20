# Sanity Presentation & Visual Editing Guide

## Overview

This project now includes official **Sanity Presentation** as a backup visual editor alongside the custom visual editor.

## Architecture

- **Custom Editor**: `/editor` - Full-featured custom visual editor
- **Sanity Studio**: `/studio` - Sanity CMS dashboard
- **Sanity Presentation**: Available within Studio
- **Draft Mode**: Automatic support via Next.js Draft Mode API

## Quick Start

### 1. Start Development Server

```bash
npm run dev
```

The app runs on:
- **Frontend**: http://localhost:3000
- **Studio**: http://localhost:3000/studio
- **Custom Editor**: http://localhost:3000/editor

### 2. Open Sanity Studio

Navigate to: http://localhost:3000/studio

### 3. Access Sanity Presentation

Inside the Studio:
1. Open any document (e.g., Hero Section)
2. Click the **"Presentation"** tab in the top nav
3. You'll see a live preview of the page with Visual Editing enabled

Presentation will:
- Show the webpage inside a preview panel
- Allow you to edit content visually in context
- Support Draft Mode automatically via `/api/draft/enable` endpoint

## How It Works

### Draft Mode Flow

1. **Enter Presentation** → Click document in Studio
2. Studio calls `POST /api/draft/enable?slug=/` 
3. Next.js enables Draft Mode (cookie-based)
4. Frontend loads data from `drafts` perspective instead of `published`
5. You see draft content in real-time preview
6. **Exit Presentation** → Studio calls `POST /api/draft/disable?slug=/`
7. Draft Mode is disabled, frontend shows published content again

### Visual Editing

The `VisualEditing` component from `@sanity/visual-editing/next` provides:
- Live preview synchronization
- Embedded Studio editing via Presentation
- Automatic origin mapping for draft mode

## File Structure

```
app/api/draft/
  ├── enable/route.ts      # Enable Draft Mode (called by Presentation)
  ├── disable/route.ts     # Disable Draft Mode (called by Presentation)

app/layout.tsx             # Root layout with VisualEditing provider

lib/sanity/
  ├── hero-loader-with-draft.ts  # Hero loader with draft mode support
  ├── preview-url.ts             # Preview URL helper for Sanity config

sanity/
  ├── sanity.config.ts     # Sanity config with Presentation tool
  ├── lib/preview-url.ts   # Preview URL resolver
```

## Configuration

### Sanity Config (`sanity/sanity.config.ts`)

Presentation tool is configured with:
- **Preview URL**: http://localhost:3000 (auto-detected for dev/production)
- **Document locations**: Maps documents to their preview URL

### Environment Variables

No additional env vars required, but you can customize:

```env
SANITY_PREVIEW_URL=http://custom-preview-url.local
```

## Testing

### Test Draft Mode Enable

```bash
curl -X POST "http://localhost:3000/api/draft/enable?slug=/"
```

Should enable draft cookies and redirect to `/`

### Test Visual Editing

1. Open Studio: http://localhost:3000/studio
2. Open Hero Section document
3. Click "Presentation" tab
4. Edit content in the preview panel
5. Changes should reflect in real-time

## Known Limitations

- Presentation preview only works within Studio (security model)
- Custom editor (`/editor`) and Sanity Presentation are separate tools
- This is intentional — both can coexist for flexibility

## Rollback

To remove Sanity Presentation:

1. Remove from `sanity/sanity.config.ts`: Remove `presentationTool` from plugins
2. Remove from `app/layout.tsx`: Remove `VisualEditing` provider
3. Keep `/api/draft/*` routes (they're harmless if unused)

This is a **minimal, reversible** implementation that doesn't interfere with the custom editor.
