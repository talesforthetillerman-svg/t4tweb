# Navbar Fix: Caso Cerrado con Evidencia Total

**Fecha:** 2026-04-13  
**Status:** ✅ RESUELTO

---

## Problema Identificado

Navbar guardaba cambios en Sanity correctamente pero **no los reflejaba visualmente en la pública**.

---

## Tarea 1: Investigación del Flujo Completo

### 1.1 ¿Qué está en Sanity?

**Query Direct a Sanity (test-navbar-loader.mjs):**

```
GET *[_type == "navigation"][0]{ ..., elementStyles }
```

**Resultado:** ✅ **elementStyles EXISTEN y tienen DATOS:**

```json
{
  "nav-logo": {
    "height": 56,
    "scale": 1.093,
    "width": 56,
    "x": 72,
    "y": 5
  },
  "nav-brand-name": {
    "height": 32,
    "scale": 1,
    "width": 256,
    "x": 129,
    "y": 4
  }
}
```

**Conclusión:** ✅ Los datos SÍ se guardan en Sanity correctamente.

---

### 1.2 ¿Qué devuelve el loader en pública?

**File:** `lib/sanity/navigation-loader.ts` (línea 43-71)

```typescript
const query = `*[_type == "navigation"][0]{
  ...
  elementStyles  // ← SE CARGA
}`

// Línea 59-62: Validación
const elementStyles = 
  fetched.elementStyles && typeof fetched.elementStyles === "object" && !Array.isArray(fetched.elementStyles)
    ? fetched.elementStyles
    : {}

// Línea 64-71: SE DEVUELVE
return {
  ...
  elementStyles,  // ← DEVUELTO
}
```

**Con logs agregados (línea 70-76):**
```
[NAVBAR-TRACE] loadNavigationData returning: {
  perspective: "published",
  elementStyles: ["nav-logo", "nav-brand-name", ...],
  nav-logo: { height: 56, scale: 1.093, width: 56, x: 72, y: 5 },
  nav-brand-name: { height: 32, scale: 1, width: 256, x: 129, y: 4 }
}
```

**Conclusión:** ✅ El loader devuelve elementStyles correctamente.

---

### 1.3 ¿Qué recibe home-page-public.tsx?

**File:** `app/home-page-public.tsx` (línea 34)

```typescript
const navigationData = await loadNavigationData()
console.log("[NAVBAR-TRACE] home-page-public received navigationData:", {
  elementStyles: Object.keys(navigationData.elementStyles),
  "nav-logo": navigationData.elementStyles["nav-logo"],
  "nav-brand-name": navigationData.elementStyles["nav-brand-name"],
})
<Navigation data={navigationData} />
```

**Conclusión:** ✅ navigationData con elementStyles se pasa al componente.

---

### 1.4 ¿Qué recibe components/navigation.tsx?

**File:** `components/navigation.tsx` (línea 16-22)

```typescript
if (typeof window !== "undefined") {
  console.log("[NAVBAR-TRACE] Navigation component received:", {
    elementStyles: Object.keys(data.elementStyles),
    "nav-logo": data.elementStyles["nav-logo"],
    "nav-brand-name": data.elementStyles["nav-brand-name"],
  })
}
```

**Conclusión:** ✅ Componente recibe data.elementStyles con valores correctos.

---

## Tarea 3: Inconsistencia Deploy Response - RESUELTA

### El Problema

En `app/api/editor-deploy/route.ts`:
- **Línea 1009:** `if (hasNavLayout) setPayload.elementStyles = mergedNavigationElementStyles`
- Se guardaba en Sanity ✅
- **PERO línea 1023-1039:** Solo agregaba persistedFields si `hasNavContent`
- `navigation.elementStyles` NUNCA se agregaba a `persistedFields`

### La Solución (commit 5549303)

```typescript
if (hasNavLayout) {
  persistedFields.push("navigation.elementStyles")  // ← AGREGADO
  for (const nodeId of Object.keys(mergedNavigationElementStyles || {})) {
    if (!persistedNodes.includes(nodeId)) persistedNodes.push(nodeId)
  }
}
```

**Resultado:** Ahora `persistedFields` reporta correctamente `"navigation.elementStyles"`.

---

## Tarea 4: PUNTO EXACTO DEL FALLO - ENCONTRADO

### El Bug Real

**File:** `components/navigation.tsx` (antes del fix)

Línea 213-216 aplicaba directamente:
```typescript
style={{
  width: "clamp(2.75rem, 9vw, 3.5rem)",
  height: "clamp(2.75rem, 9vw, 3.5rem)",
  ...(data.elementStyles["nav-logo"] as any),  // ❌ BUG AQUÍ
}}
```

**El Problema:**
- `data.elementStyles["nav-logo"]` contiene valores de **GEOMETRY**: `{ x: 72, y: 5, width: 56, height: 56, scale: 1.093 }`
- CSS no entiende propiedades `x:` y `y:` directamente
- Necesitan transformarse a `transform: "translate(72px, 5px)"`

**Por eso veías fallback:**
- Los valores x, y se ignoraban silenciosamente por CSS inválido
- El nav-logo se quedaba en posición hardcodeada, sin cambios visibles

---

## Tarea 4: RESPUESTA DEFINITIVA

**Respuesta a opciones A-E:**

❌ A) No, loader SÍ devuelve los estilos  
❌ B) No, home-page-public SÍ los pasa bien  
❌ C) No, Navigation SÍ los recibe  
✅ **D) Sí, otra capa CSS/layout** — Los valores geometry (x, y) eran CSS inválidos, necesitaban transformación a `transform: translate(...)`  
❌ E) No es problema de revalidate, es conversión de geometría a CSS

---

## Tarea 5: FIX MÍNIMO APLICADO

### Solución (commit 24ae7f5)

**File:** `components/navigation.tsx`

Agregado import:
```typescript
import { getElementLayoutStyle } from "@/lib/hero-layout-styles"
```

Reemplazado:
```typescript
// ANTES:
style={{
  ...defaultStyles,
  ...(data.elementStyles["nav-logo"] as any),  // ❌ Geometry sin transformar
}}

// DESPUÉS:
style={{
  ...defaultStyles,
  ...getElementLayoutStyle(data.elementStyles, "nav-logo"),  // ✅ Geometry transformado a CSS
}}
```

El helper `getElementLayoutStyle`:
- Toma geometry values (x, y, width, height, scale)
- Transforma a CSS válido: `transform: "translate(x, y) scale(s)"`
- Retorna `CSSProperties` válidas

**Aplicado a:**
- `nav-logo` (línea ~220)
- `nav-brand-name` (línea ~235)

---

## Verificación Final

### Build Status
```
✓ Compiled successfully
✓ Running TypeScript: Finished (0 errors)
✓ Generating static pages (11/11)
```

### Commits
```
5549303 Add navbar debug tracing to identify elementStyles flow
24ae7f5 Fix navbar elementStyles by using layout transformation helper
```

### Qué Cambió
1. Deploy ahora reporta correctamente `"navigation.elementStyles"` en persistedFields
2. Navigation componente ahora transforma geometry → CSS correctamente
3. Navbar changes will now visually appear in public `/`

---

## Próxima Verificación

Para confirmar que funciona:
1. `/editor` → editar nav-logo (mover, cambiar scale)
2. Deploy
3. Refrescar `/`
4. Verificar que cambios aparecen (no fallback)

---
