# 🔍 AUDITORÍA NAVBAR: Causa Exacta

**Fecha:** 2026-04-13  
**Problema:** Navbar sigue pareciendo fallback en `/` aunque elementStyles se escriban correctamente

---

## HALLAZGO EXACTO

### ✅ El Loader (navigation-loader.ts)

```typescript
// Línea 43-50: Query de Sanity
const query = `*[_type == "navigation"][0]{
  brandName,
  "brandLogoUrl": brandLogo.asset->url,
  links[]{ label, href },
  ctaLabel,
  ctaHref,
  elementStyles  // ← SE PIDE
}`

// Línea 59-62: Validación
const elementStyles =
  fetched.elementStyles && typeof fetched.elementStyles === "object" && !Array.isArray(fetched.elementStyles)
    ? (fetched.elementStyles as NavigationData["elementStyles"])
    : {}

// Línea 70: SE EXPONE
return {
  ...
  elementStyles,  // ← DEVUELTO
}
```

**Status:** ✅ Loader devuelve elementStyles correctamente

### ✅ Home Page Public (home-page-public.tsx)

```typescript
// Línea 25: Se carga sin problema
loadNavigationData(),

// Línea 34: Se pasa al componente
<Navigation data={navigationData} />
```

**Status:** ✅ data (con elementStyles) se pasa correctamente

### ❌ Componente Navigation (components/navigation.tsx)

```typescript
// Línea 9: RECIBE data con elementStyles
export function Navigation({ data }: { data: NavigationData }) {
  // ...
  const navLinks = data.links  // ← Se usa esto
  const resolvedNavLogoSrc = useHomeEditorImageSrc("nav-logo", ...)  // ← Se usa esto
  // ❌ data.elementStyles NUNCA se usa
}
```

**Búsqueda exhaustiva:** "elementStyles" no aparece en todo el archivo  
**Resultado:** ❌ **data.elementStyles se carga pero NUNCA se aplica**

### Elementos que Deberían Aplicar Estilos

#### `nav-logo` (línea 209-217)
```typescript
<div
  data-editor-node-id="nav-logo"
  className="..."
  style={{  // ← HARDCODEADO, NO APLICA elementStyles
    width: "clamp(2.75rem, 9vw, 3.5rem)",
    height: "clamp(2.75rem, 9vw, 3.5rem)",
  }}
>
```

**Debería aplicar:** `data.elementStyles["nav-logo"]` pero no lo hace

#### `nav-brand-name` (línea 225-233)
```typescript
<span
  data-editor-node-id="nav-brand-name"
  className="..."
  // ❌ NO TIENE style= ATTRIBUTE
>
  {data.brandName}
</span>
```

**Debería aplicar:** `data.elementStyles["nav-brand-name"]` pero no lo tiene

---

## CADENA DE EVIDENCIA

| Paso | Qué Pasa | Status |
|------|----------|--------|
| 1. Deploy escribe `nav-logo`, `nav-brand-name` a `navigation.elementStyles` | Log: `storageTarget: navigation.elementStyles`, `matched: true` | ✅ |
| 2. Sanity guarda los datos correctamente | Log: `readBack` coincide con `expected` | ✅ |
| 3. navigation-loader.ts carga elementStyles | Línea 49: query incluye `elementStyles`, línea 70: se expone | ✅ |
| 4. home-page-public.tsx pasa data a Navigation | Línea 34: `<Navigation data={navigationData} />` | ✅ |
| 5. Navigation componente recibe data con elementStyles | Línea 9: `data: NavigationData` | ✅ |
| 6. Navigation aplica data.elementStyles a los elementos | Grep: `data.elementStyles` → 0 resultados | ❌ |

**Conclusión:** Datos cargados y pasados correctamente, **pero NO APLICADOS en el componente**

---

## POR QUÉ SIGUE VIENDO FALLBACK

```
Sanity: ✓ "nav-logo": { ... estilos editados ... }
  ↓
Loader: ✓ elementStyles: { "nav-logo": {...} }
  ↓
Component: ✓ Recibe data.elementStyles
  ↓
DOM: ❌ style={ width: "clamp(2.75rem, 9vw, 3.5rem)" }  // HARDCODEADO
  ↓
Visual: Sigue siendo FALLBACK (porque no se aplican estilos editados)
```

---

## SOLUCIÓN

Aplicar `data.elementStyles` a los elementos que tienen `data-editor-node-id`:

### Para `nav-logo` (línea 213)
```typescript
// ANTES:
style={{
  width: "clamp(2.75rem, 9vw, 3.5rem)",
  height: "clamp(2.75rem, 9vw, 3.5rem)",
}}

// DESPUÉS:
style={{
  ...{
    width: "clamp(2.75rem, 9vw, 3.5rem)",
    height: "clamp(2.75rem, 9vw, 3.5rem)",
  },
  ...(data.elementStyles["nav-logo"] as any),
}}
```

### Para `nav-brand-name` (línea 228)
```typescript
// ANTES: (sin style)

// DESPUÉS:
style={data.elementStyles["nav-brand-name"] as any}
```

---

## IMPLEMENTACIÓN ✅

### Cambios Realizados
- ✅ Merge data.elementStyles["nav-logo"] en nav-logo style (línea 213-216)
- ✅ Add style={data.elementStyles["nav-brand-name"]} a nav-brand-name span (línea 225-233)
- ✅ Build: `npm run build` - completado sin errores
- ✅ TypeScript: 0 errores

### Commit
```
985e210 Apply persisted elementStyles to navbar elements
```

## VERIFICACIÓN PRÓXIMA

- [ ] Cargar `/editor` → editar nav-logo color/posición
- [ ] Deploy
- [ ] Refrescar `/` 
- [ ] Verificar que cambios aparecen en público

