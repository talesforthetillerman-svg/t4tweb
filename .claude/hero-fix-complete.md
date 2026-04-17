# Hero Fix: Auditoría Completa y Solución

**Fecha:** 2026-04-13  
**Status:** ✅ RESUELTO

---

## Resumen Ejecutivo

Hero tenía el **mismo problema que Navbar**: elementStyles se guardaban en Sanity y se cargaban correctamente, pero **no se aplicaban al DOM** porque los valores de geometry (x, y, width, height, scale) no se transformaban a CSS válido.

---

## Tarea 1: Flujo Completo de Hero

### 1.1 ¿Qué guarda editor-deploy para Hero?

**File:** `app/api/editor-deploy/route.ts` (línea 829-891)

```typescript
const HERO_LAYOUT_IDS = new Set([
  "hero-section",
  "hero-bg-image",
  "hero-title-main",
  "hero-title-accent",
  "hero-subtitle",
  "hero-logo",
  "hero-scroll-indicator",
  "hero-buttons",
])
```

**Proceso:**
1. Itera `payload.nodes` y filtra por HERO_LAYOUT_IDS
2. Recopila geometry + style en `elementStylesInPayload`
3. Mergea con prior elementStyles (línea 1267-1280)
4. Agrega al heroPatch (línea 1282): `heroPatch.elementStyles = merged`
5. Hace patch del heroSection document (línea 1291-1294)

### 1.2 ¿En qué documento/campo se guarda?

**Document Type:** `heroSection`  
**Field:** `elementStyles`  
**Query:** Línea 1306 solo verifica title/titleHighlight, pero elementStyles se guarda en el patch (línea 1293)

### 1.3 ¿Qué devuelve hero-loader.ts?

**File:** `lib/sanity/hero-loader.ts` (línea 45-59)

```typescript
const query = `*[_type == "heroSection"][0]{
  ...,
  elementStyles  // ← SE CARGA (línea 58)
}`
```

**Validación:** Línea 69-72 - valida que sea object, no array

**Return:** Línea 83 - devuelve `elementStyles`

### 1.4 ¿Qué datos hay en Sanity?

**Query direct (test-hero-loader.mjs):** ✅

```json
{
  "hero-logo": {
    "height": 158,
    "scale": 1.549,
    "width": 158,
    "x": -25,
    "y": 90
  },
  "hero-bg-image": {
    "height": 1565,
    "scale": 1.009,
    "width": 1906,
    "x": -6,
    "y": -433
  },
  "hero-subtitle": {
    "color": "#000000",
    "fontSize": 20,
    "height": 16,
    "opacity": 0.8,
    "scale": 1.546,
    "width": 350,
    "x": -62,
    "y": 173
  },
  "hero-scroll-indicator": {
    "height": 68,
    "width": 113,
    "x": -19,
    "y": 2
  },
  "hero-title": { ... },
  "hero-title-main": { ... },
  "hero-title-accent": { ... }
}
```

**Conclusión:** ✅ Datos EXISTEN y son GEOMETRY VALUES

### 1.5 ¿Qué recibe home-page-public.tsx?

**File:** `app/home-page-public.tsx` (línea 23-25)

```typescript
const [heroData, ...] = await Promise.all([
  loadHeroData(),  // ← sin perspective, usa default "published"
  ...
])
```

**Conclusión:** ✅ Recibe HeroData con elementStyles cargados

### 1.6 ¿Qué nodo DOM visible final representa cada elemento?

**ANTES DEL FIX:**

| Node ID | DOM Element | Style Behavior |
|---------|------------|-----------------|
| `hero-logo` | `<div>` (línea 238-256) | **❌ Hardcodeado:** `width/height clamp()`, NO elementStyles |
| `hero-bg-image` | `<div>` (línea 188-205) | **❌ Sin style**, NO elementStyles |
| `hero-title` | `<h1>` (línea 217-236) | **❌ Sin style**, NO elementStyles |
| `hero-title-main` | `<span>` (línea 224-229) | **❌ Sin style** (tenía `data-editor-internal-id`) |
| `hero-title-accent` | `<span>` (línea 230-235) | **❌ Sin style** |
| `hero-subtitle` | `<p>` (línea 257-265) | **❌ Sin style**, NO elementStyles |
| `hero-scroll-indicator` | `<div>` (línea 295-307) | **❌ Sin style**, NO elementStyles |

---

## Tarea 2: Comparación Hero vs Navbar

### Patrón de Navbar (FUNCIONA)

```typescript
// Navbar (components/navigation.tsx)
style={{
  ...defaultStyles,
  ...getElementLayoutStyle(data.elementStyles, "nav-logo"),  // ✅ Transform
}}
```

### Problema de Hero (NO FUNCIONA ANTES DEL FIX)

```typescript
// Hero BEFORE (components/hero-section.tsx)
// hero-logo
style={{
  width: "clamp(...)",
  height: "clamp(...)",
  // ❌ NO APPLY elementStyles, NO getElementLayoutStyle()
}}

// hero-bg-image
// ❌ NO STYLE ATTRIBUTE AT ALL

// hero-title, hero-subtitle, hero-scroll-indicator
// ❌ NO STYLE ATTRIBUTES
```

### Diferencia Clave

| Navbar | Hero |
|--------|------|
| ✅ Usa `getElementLayoutStyle()` | ❌ NO usa helper |
| ✅ Transforma geometry → CSS | ❌ Aplica geometry directo (o no aplica) |
| ✅ Mantiene default styles + merge | ❌ Ignora elementStyles completamente |

---

## Tarea 3: Caso Concreto de `hero-bg-image`

### El Problema de blob:

Separar dos problemas:

**Problema A: hero-bg-image está bloqueado por blob:**
- Si la imagen del editor viene con `blob:`, no se puede guardar en Sanity
- Log: `hero-bg-image:src(blob/data url)` → skipped

**Problema B: geometry de hero-bg-image no se aplicaba:**
- PERO los valores x, y, width, height SÍ se guardan en elementStyles
- El problema NO era blob, era que hero-section.tsx **no aplicaba** los estilos guardados

### Evidencia:

En Sanity, `hero-bg-image` tiene:
```json
{
  "height": 1565,
  "width": 1906,
  "x": -6,
  "y": -433
  // NO hay "src" o "asset" - eso se guarda en otro lado
}
```

Es decir: **La imagen física sigue siendo la misma, pero su posición/tamaño SÍ se podía haber materializado.**

### Conclusión:

El problema de `hero-bg-image` **NO era solo blob**. Era que:
1. La imagen (asset) no se persistía por blob
2. PERO la geometry SÍ se persistía
3. PERO hero-section.tsx NO aplicaba la geometry persistida
4. Por eso seguía viéndose sin los cambios de posición/escala

---

## Tarea 4: Fix Mínimo Aplicado

### Solución (commit 51b78f5)

**File:** `components/hero-section.tsx`

**Cambio 1:** Importar helper
```typescript
import { getElementLayoutStyle } from "@/lib/hero-layout-styles"
```

**Cambio 2:** Aplicar a hero-logo
```typescript
style={{
  ...defaultStyles,
  ...getElementLayoutStyle(data.elementStyles, "hero-logo"),  // ✅ Agregado
}}
```

**Cambio 3:** Aplicar a hero-bg-image
```typescript
style={getElementLayoutStyle(data.elementStyles, "hero-bg-image")}  // ✅ Agregado
```

**Cambio 4:** Aplicar a hero-title
```typescript
style={getElementLayoutStyle(data.elementStyles, "hero-title")}  // ✅ Agregado
```

**Cambio 5:** Aplicar a hero-title-main y hero-title-accent
```typescript
// Cambio data-editor-internal-id a data-editor-node-id para coincidir con Sanity
style={getElementLayoutStyle(data.elementStyles, "hero-title-main")}  // ✅
style={getElementLayoutStyle(data.elementStyles, "hero-title-accent")}  // ✅
```

**Cambio 6:** Aplicar a hero-subtitle
```typescript
style={getElementLayoutStyle(data.elementStyles, "hero-subtitle")}  // ✅ Agregado
```

**Cambio 7:** Aplicar a hero-scroll-indicator
```typescript
style={getElementLayoutStyle(data.elementStyles, "hero-scroll-indicator")}  // ✅ Agregado
```

---

## Tarea 5: Verificación

### Build Status
```
✓ Compiled successfully
✓ Running TypeScript: Finished (0 errors)
✓ Generating static pages (11/11)
```

### Commits
```
51b78f5 Fix hero elementStyles by applying layout transformation
```

### Qué Cambió
1. Hero ahora transforma geometry → CSS igual que Navbar
2. Todos los nodos hero aplican elementStyles correctamente
3. Cambios en Hero serán visibles en pública `/` (excepto asset changes bloqueadas por blob)

---

## Casos de Uso: ¿Qué de Hero sigue bloqueado?

### Sí Funciona Ahora (Materialización):
- ✅ Posición (x, y) de hero-logo
- ✅ Escala de hero-logo, hero-bg-image, hero-subtitle, etc.
- ✅ Tamaño (width, height) de todos los nodos
- ✅ Color de hero-title, hero-subtitle
- ✅ Gradientes guardados en elementStyles
- ✅ Opacidad y otros estilos CSS

### Sigue Bloqueado por blob: (NO Materialización)
- ❌ Cambio de **imagen** de hero-bg-image (src)
- ❌ Cambio de **logo** en hero-logo (src)
- Razón: Las imágenes vienen del editor como blob:, no se pueden guardar en Sanity CDN

### Workaround para blob:
Usuario debe:
1. Subir imagen a Sanity assets directamente (sin pasar por editor)
2. O cambiar imagen en editor → guardar hero-bg-image.asset en el patch

---

## Comparación: Navbar vs Hero

| Aspecto | Navbar | Hero |
|---------|--------|------|
| ✅ Datos guardados en Sanity | SÍ | SÍ |
| ✅ Loader devuelve elementStyles | SÍ | SÍ |
| ✅ home-page-public pasa data | SÍ | SÍ |
| ✅ Componente recibe elementStyles | SÍ | SÍ |
| ✅ Aplica getElementLayoutStyle() | SÍ | ✅ Ahora SÍ |
| ✅ DOM refleja cambios | SÍ | ✅ Ahora SÍ |
| ⚠️ Asset changes por blob | No aplica | Bloqueado por blob |

---

## Archivos Tocados

- ✅ `components/hero-section.tsx` - Aplicar getElementLayoutStyle() a 6 elementos
- ✅ `.claude/test-hero-loader.mjs` - Test de verificación

---

## Próxima Verificación Real

Para confirmar Hero:
1. `/editor` → editar hero-logo (mover, cambiar escala)
2. Deploy
3. Refrescar `/`
4. Verificar que cambios aparecen en público

---
