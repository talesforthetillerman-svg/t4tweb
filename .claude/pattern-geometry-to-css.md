# Patrón Encontrado: Geometry → CSS Transformation

**Fecha:** 2026-04-13  
**Descubrimiento:** La causa raíz del problema de materialización

---

## El Patrón

Todo elemento editable en el proyecto guarda sus cambios como **GEOMETRY + STYLES**:

```
elementStyles[nodeId] = {
  x: 72,              // ← Geometry: pixel position
  y: 5,               // ← Geometry: pixel position
  width: 56,          // ← Geometry: size
  height: 56,         // ← Geometry: size
  scale: 1.093,       // ← Geometry: scale
  color: "#ff0000",   // ← Style: actual CSS
  fontSize: 16,       // ← Style: actual CSS
}
```

**El Problema:** Los valores de geometry (x, y, width, height, scale) **NO son CSS válido**. CSS no entiende propiedades `x:` o `y:`.

**La Solución:** Transformar a CSS válido:
- x, y → `transform: translate(x px, y px)`
- scale → `transform: scale(scale)`
- width, height → `width: x px; height: y px;`

---

## La Herramienta Correcta

Ya existe en el proyecto:

**File:** `lib/hero-layout-styles.ts`  
**Función:** `getElementLayoutStyle(elementStyles, targetId)`

```typescript
export function getElementLayoutStyle(
  elementStyles: Record<string, unknown> | undefined,
  targetId: string,
  options?: { includeGeometry?: boolean }
): CSSProperties {
  // Toma geometry y lo convierte a CSS válido
  // Retorna: { transform: "translate(...) scale(...)", width: "...", height: "..." }
}
```

**Uso Correcto:**
```typescript
style={getElementLayoutStyle(data.elementStyles, "node-id")}
```

---

## Implementación por Sección

### ✅ Navbar (RESUELTO)

**Commit:** `24ae7f5`  
**Nodos aplicados:** nav-logo, nav-brand-name  
**Patrón:** `getElementLayoutStyle(data.elementStyles, "nav-logo")`

**Estado:** ✅ Funciona

### ✅ Hero (RESUELTO)

**Commit:** `51b78f5`  
**Nodos aplicados:** hero-logo, hero-bg-image, hero-title, hero-title-main, hero-title-accent, hero-subtitle, hero-scroll-indicator

**Estado:** ✅ Funciona

### ⚠️ Intro Banner (PARCIAL)

**Archivo:** `components/intro-banner-section.tsx`  
**Estado:** Necesita revisión

**Nodos editable según intro-loader.ts:**
- intro-banner-text
- intro-banner-gif
- intro-book-button
- intro-press-button

**Esperado:** Si Intro tiene elementStyles en Sanity, necesita aplicar getElementLayoutStyle()

### ⚠️ Band Members (PARCIAL)

**Archivo:** `components/band-members-section.tsx`  
**Estado:** Parcialmente aplicado

Line 72: `style={elementStyles["band-members-section"] as CSSProperties}`

**Problema:** Aplica directo, sin getElementLayoutStyle()

**Debe ser:** `style={getElementLayoutStyle(elementStyles, "band-members-section")}`

### ❌ Live Section (NO IMPLEMENTADO)

**Archivo:** `components/live-section.tsx`  
**Estado:** No carga elementStyles, no los aplica

### ❌ Press Kit Section (NO IMPLEMENTADO)

**Archivo:** `components/press-kit-section.tsx`  
**Status:** No carga elementStyles, no los aplica

### ❌ About Section (NO IMPLEMENTADO)

**Archivo:** `components/about-section.tsx`  
**Status:** No carga elementStyles, no los aplica

### ❌ Contact Section (NO IMPLEMENTADO)

**Archivo:** `components/contact-section.tsx`  
**Status:** No carga elementStyles, no los aplica

---

## Checklist por Sección

Para cada sección que quiera aplicar materialización:

1. **Verificar que editor-deploy lo guarda**
   - ¿Hay un `LAYOUT_IDS` set para esa sección?
   - ¿Se recopilan los elementStyles?
   - ¿Se mergean con prior?
   - ¿Se guardan en el patch?

2. **Verificar que loader lo devuelve**
   - ¿El query incluye `elementStyles`?
   - ¿Se pasa al return?

3. **Verificar que componente lo recibe**
   - ¿Recibe prop con data que incluye elementStyles?
   - Test: `console.log(data.elementStyles)`

4. **Aplicar getElementLayoutStyle()**
   - Importar: `import { getElementLayoutStyle } from "@/lib/hero-layout-styles"`
   - Por cada nodo: `style={getElementLayoutStyle(data.elementStyles, "node-id")}`
   - O merge: `style={{ ...defaults, ...getElementLayoutStyle(...) }}`

5. **Build + test**
   - `npm run build` → 0 errors
   - Editor → cambio → deploy
   - Public → refrescar → cambios visibles

---

## Cómo Funciona getElementLayoutStyle()

**Input:**
```javascript
elementStyles = {
  "my-node": {
    x: 100,
    y: 50,
    width: 200,
    height: 150,
    scale: 1.2,
    color: "#ff0000"
  }
}

getElementLayoutStyle(elementStyles, "my-node")
```

**Output:**
```javascript
{
  transform: "translate(100px, 50px) scale(1.2)",
  transformOrigin: "top left",
  width: "200px",
  height: "150px",
  color: "#ff0000"  // Non-geometry styles pass through
}
```

**Aplicable a style={}:**
```typescript
<div style={getElementLayoutStyle(data.elementStyles, "my-node")}>
```

---

## Implicaciones para el Proyecto

### Lo que Funciona Ahora
- Navbar ✅
- Hero ✅
- Band Members (parcial - necesita getElementLayoutStyle())
- Intro Banner (parcial - necesita verificación)

### Lo que NO Funciona Todavía
- Live Section (no tiene loader, no carga elementStyles)
- Press Kit (no tiene loader)
- About (no tiene loader)
- Contact (no tiene loader)

### Bloqueadores Todavía Existentes

**Asset/Image Persistence:**
- hero-bg-image, hero-logo, band-members-bg: si la imagen viene de blob:, no se guarda
- **Workaround:** Usuario sube imagen a Sanity directamente, no por editor blob

**Deploy Verification:**
- El verification query de hero (línea 1306) no verifica elementStyles, solo title/titleHighlight
- Pero el patch SÍ se guarda correctamente (no es error silencioso)

---

## Resumen de Patrones

```
Secuencia Correcta:

1. Editor → visual node moved/resized
2. visual-editor → llama deploy con geometry
3. deploy → editor-deploy.ts guarda en elementStyles[nodeId]
4. elementStyles → guarda en Sanity document.elementStyles
5. Sanity → persistencia correcta
6. loader → carga elementStyles del documento
7. component → recibe data.elementStyles
8. component → TRANSFORMA con getElementLayoutStyle()
9. DOM → style= con CSS válido
10. Browser → renderiza posición/tamaño correctos
```

---

## Verificación de Estado

**Implementado:**
- ✅ getElementLayoutStyle() existe y funciona
- ✅ Navbar aplica correctamente
- ✅ Hero aplica correctamente
- ✅ Deploy guarda correctamente
- ✅ Loaders devuelven correctamente

**Pendiente:**
- ⚠️ Band Members: cambiar aplicación directa por getElementLayoutStyle()
- ⚠️ Intro: verificar si aplica correctamente
- ❌ Live, Press, About, Contact: implementar loaders y aplicación

**Bloqueado:**
- ⚠️ Blob asset persistence (necesita cambio en editor o manual upload)

---
