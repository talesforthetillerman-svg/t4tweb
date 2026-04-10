# Agent Guidelines for Tales for the Tillerman Website

## Project Overview

- **Framework:** Next.js 16 + React 19 + TypeScript 5
- **Package Manager:** pnpm (use `pnpm` commands)
- **Path Alias:** `@/*` maps to project root (use for internal imports)
- **Key Directories:**
  - `app/` - Next.js App Router pages and layouts
  - `components/` - React components (18 total)
  - `hooks/` - Custom React hooks with Framer Motion animations
  - `public/` - Static assets (images, PDFs, data)

## Commands

```bash
# Development
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Linting (ESLint via Next.js)
pnpm lint

# Type checking (TypeScript strict mode)
pnpm typecheck

# Run both before committing
pnpm typecheck && pnpm lint && pnpm build
```

## TypeScript Guidelines

- **Strict mode enabled** - No implicit any, strict null checks
- Always define explicit types for function parameters and return values
- Use `interface` for object shapes, `type` for unions/primitives
- Avoid `any` - use `unknown` and type guard when necessary
- Import types with `import type { TypeName }` for tree-shaking

## React Components

- **All interactive components must have `"use client"`** directive at the top
- **Use named exports** (not default exports):
  ```tsx
  export function ComponentName() { ... }
  ```
- Server components can use default exports for pages/layouts
- Always use `ref` pattern for scroll animations with Framer Motion:
  ```tsx
  const ref = useRef<HTMLElement>(null)
  const { opacity, scale, y } = useScrollAnimation(ref)
  ```

## Imports

Order imports:
1. React and Next.js built-ins (`next/image`, `next/font`, `react`)
2. Third-party libraries (`framer-motion`)
3. Internal imports using `@/*` alias (`@/components`, `@/hooks`, `@/app`)
4. Relative imports (only if `@/*` doesn't apply)

```tsx
import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Navigation } from "@/components/navigation"
import { useScrollAnimation } from "@/hooks/useScrollAnimation"
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `HeroSection`, `PressKit` |
| Hooks | camelCase with `use` prefix | `useScrollAnimation` |
| Constants files | camelCase | `campaignContent.ts` |
| Variables | camelCase | `isScrolled`, `navLinks` |
| CSS classes | kebab-case | `bg-primary`, `text-foreground` |
| Types/Interfaces | PascalCase | `ScrollAnimationConfig` |

## Styling

- **Primary color:** `#FF8C21` (orange) - use via `bg-primary` or `#[#FF8C21]`
- **Tailwind CSS** for utility classes
- **CSS Custom Properties** in `app/globals.css` for design tokens (colors, spacing, animations)
- Global component classes available in `globals.css`: `.btn`, `.card`, `.chip`
- Use `clamp()` for responsive typography scale
- Prefer Tailwind's responsive prefixes (`md:`, `lg:`) over media queries

## Animations (Framer Motion)

Available hooks in `@/hooks/useScrollAnimation`:
- `useScrollAnimation(ref, config?)` - General scroll fade/scale
- `useStickyImageAnimation(ref)` - Parallax image with inverse movement
- `useContentAnimation(ref)` - Content overlay animations
- `useParallaxZoom(ref)` - Subtle background zoom
- `useStaggerDelay(index, baseDelay?)` - Stagger timing for lists

Always respect `prefers-reduced-motion` - check and skip animations if user prefers reduced motion.

## Error Handling

- Wrap async operations in try-catch blocks
- Display user-friendly error messages (not technical details)
- Use `console.error` with context for debugging, never in UI
- Never expose sensitive information in error messages

## Accessibility

- Use semantic HTML (`<nav>`, `<main>`, `<section>`, `<button>`)
- Always add `aria-label` to icon-only buttons
- Ensure color contrast meets WCAG AA standards
- Use `aria-expanded` and `aria-controls` for collapsible elements
- Test with keyboard navigation

## File Organization

```
src/ or root/
├── app/
│   ├── layout.tsx      # Root layout with fonts, metadata, JSON-LD
│   ├── page.tsx        # Home page composition
│   └── globals.css     # Global styles + CSS custom properties
├── components/
│   ├── *.tsx           # React components (named exports)
│   └── *.ts            # Component constants/helpers
├── hooks/
│   └── use*.ts         # Custom React hooks
└── public/
    ├── images/         # Static images
    └── data/           # CSV or JSON data files
```

## Pre-Deploy Checklist

Before any deployment, run:
```bash
pnpm typecheck
pnpm lint
pnpm build
```

All three must pass without errors.
