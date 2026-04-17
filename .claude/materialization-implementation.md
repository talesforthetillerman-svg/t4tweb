# 🔧 IMPLEMENTACIÓN: Materialización Real

**Objetivo:** Hacer que cambios de secciones IMPORTANTES lleguen a `/`  
**Estrategia:** Extender patching actual a más documentos

---

## FASE 1: Extensión Mínima (Band Members Background)

### Problema Específico
`band-members-bg` se guarda en homeEditorState pero NO llega a pública.

### Solución Mínima

**Paso 1: Agregar documento Sanity para band-members settings**

```typescript
// sanity/schemas/bandMembersSettings.ts (CREAR)
export const bandMembersSettings = {
  name: 'bandMembersSettings',
  type: 'document',
  title: 'Band Members Section Settings',
  fields: [
    {
      name: 'elementStyles',
      type: 'object',
      of: [],
      description: 'Layout/style overrides for band section elements',
    },
  ],
  preview: {
    prepare() {
      return { title: 'Band Members Settings' }
    },
  },
}
```

**Paso 2: En editor-deploy, agregar materialización**

**Ubicación:** `app/api/editor-deploy/route.ts` (después del patching de intro, línea ~1050)

```typescript
// AGREGAR: Band Members materialización
const BAND_LAYOUT_IDS = new Set([
  "band-members-section",
  "band-members-bg",
  "member-item-0",
  "member-item-1",
  "member-item-2",
  "member-item-3",
  "member-item-4",
])

let bandMembersElementStyles: Record<string, unknown> = {}
let hasBandLayout = false

for (const node of payload.nodes) {
  if (!BAND_LAYOUT_IDS.has(node.id)) continue
  
  if (!node.explicitPosition && !node.explicitSize && !node.explicitStyle) continue
  hasBandLayout = true
  
  // Agregar estilos
  bandMembersElementStyles[node.id] = {
    position: node.position || {},
    size: node.size || {},
    ...(node.style || {}),
  }
}

// Patchear documento si hay cambios
if (hasBandLayout) {
  // Buscar documento existente o crear
  const existingBandSettings = await writeClient.fetch(
    `*[_type == "bandMembersSettings"][0]{ _id, elementStyles }`
  )
  
  let bandSettingsDocId: string | null = null
  
  if (existingBandSettings?._id) {
    // Update existing
    const priorBandStyles = existingBandSettings.elementStyles || {}
    const mergedBandStyles = { ...priorBandStyles, ...bandMembersElementStyles }
    
    await writeClient
      .patch(toPublishedDocumentId(existingBandSettings._id))
      .set({ elementStyles: mergedBandStyles })
      .commit()
    
    bandSettingsDocId = existingBandSettings._id
    log("band-members patch committed", { docId: bandSettingsDocId })
  } else {
    // Create new
    const newBandSettings = {
      _type: 'bandMembersSettings',
      elementStyles: bandMembersElementStyles,
    }
    const response = await writeClient.create(newBandSettings)
    bandSettingsDocId = response._id
    log("band-members settings created", { docId: bandSettingsDocId })
  }
  
  persistedFields.push("bandMembersSettings.elementStyles")
  for (const [nodeId] of Object.entries(bandMembersElementStyles)) {
    if (!persistedNodes.includes(nodeId)) persistedNodes.push(nodeId)
  }
}
```

**Paso 3: En band-members-loader, usar los estilos**

```typescript
// lib/sanity/band-members-loader.ts (actualizar)

export async function loadBandMembersData(
  perspective: "published" | "previewDrafts" = "published"
): Promise<{ 
  members: BandMemberData[]
  elementStyles?: Record<string, Record<string, unknown>>
}> {
  // ... fetch members ...
  
  // Agregar: cargar estilos del editor
  const client = createClient({
    projectId: resolveSanityProjectId(),
    dataset: resolveSanityDataset(),
    apiVersion: "2024-01-01",
    useCdn: process.env.SANITY_USE_CDN === "true",
    perspective: perspective,
  })
  
  const settings = await client.fetch(
    `*[_type == "bandMembersSettings"][0]{ elementStyles }`
  )
  
  return {
    members: displayedMembers,
    elementStyles: settings?.elementStyles || {},
  }
}
```

**Paso 4: En BandMembersSection, aplicar estilos**

```typescript
// components/band-members-section.tsx (actualizar props)

interface BandMembersSectionProps {
  initialMembers: BandMemberData[]
  elementStyles?: Record<string, Record<string, unknown>> // ← AGREGAR
}

export function BandMembersSection({ 
  initialMembers, 
  elementStyles = {} 
}: BandMembersSectionProps) {
  // ... usar elementStyles para aplicar estilos ...
  
  return (
    <section
      style={elementStyles["band-members-section"] as CSSProperties}
      // ...
    >
      <div
        style={elementStyles["band-members-bg"] as CSSProperties}
        // ...
      >
        {/* Imagen de fondo */}
      </div>
      // ... rest of component
    </section>
  )
}
```

**Paso 5: Pasar elementStyles desde loader**

```typescript
// app/home-page-public.tsx (actualizar)

const [heroData, navigationData, introBannerData, bandMembersData, liveConcerts] = 
  await Promise.all([
    loadHeroData(perspective),
    loadNavigationData(perspective),
    loadIntroBannerData(perspective),
    loadBandMembersData(perspective), // ← Ahora retorna { members, elementStyles }
    loadLiveConcerts(),
  ])

// Cuando renderiza:
<BandMembersSection 
  initialMembers={bandMembersData.members}
  elementStyles={bandMembersData.elementStyles}
/>
```

---

## FASE 2: Extensión a Otras Secciones (Patrón)

Una vez que Band Members funcione, repetir patrón para:

### Live Section
```typescript
const LIVE_LAYOUT_IDS = new Set([
  "live-section",
  "live-bg",
  "concert-card-*", // si aplica
])
```
→ Crear `liveSettings` document  
→ Patchear en editor-deploy  
→ Cargar en live-loader  
→ Aplicar en LiveSection

### Press Kit Section
```typescript
const PRESS_LAYOUT_IDS = new Set([
  "press-kit-section",
  "press-kit-bg",
  "resource-*",
  "manager-*",
])
```
→ Mismo patrón

### Scene Sections (About, Contact)
```typescript
const SCENE_LAYOUT_IDS = new Set([
  "about-section",
  "about-bg",
  "contact-section", 
  "contact-bg",
])
```
→ Usar documento existente o crear

---

## IMPLEMENTACIÓN ACTUAL (SIN CAMBIOS)

**Hoy:**
```
Hero      → ✅ Materializa a heroSection.elementStyles
Navigation → ✅ Materializa a navigation.elementStyles
Intro      → ✅ Materializa a introBanner.elementStyles
---
Band       → ❌ Solo en homeEditorState
Live       → ❌ Solo en homeEditorState
Press      → ❌ Solo en homeEditorState
About      → ❌ Solo en homeEditorState
Contact    → ❌ Solo en homeEditorState
```

**Después de implementar:**
```
Hero       → ✅ Materializa a heroSection.elementStyles
Navigation → ✅ Materializa a navigation.elementStyles
Intro      → ✅ Materializa a introBanner.elementStyles
Band       → ✅ Materializa a bandMembersSettings.elementStyles ← NUEVO
Live       → ⏳ Siguiente (mismo patrón)
Press      → ⏳ Siguiente (mismo patrón)
About      → ⏳ Siguiente (mismo patrón)
Contact    → ⏳ Siguiente (mismo patrón)
```

---

## IMPACTO

**Con esta implementación mínima:**
- ✅ Band members bg, layout, estilos NOW aparecen en `/`
- ✅ Los cambios del editor en band-members-section se publican
- ✅ El patrón es repetible para otras secciones

**Qué sigue sin poder publicarse:**
- ❌ Secciones que no tienen documento Sanity (scene wrappers, dividers)
- ❌ blob: URLs (necesitan upload a Sanity, tema aparte)
- ❌ Contenido puro que no es estilo/layout

---

## CHECKLIST DE IMPLEMENTACIÓN

- [ ] Crear `bandMembersSettings` schema en Sanity
- [ ] Agregar Band LAYOUT_IDS en editor-deploy
- [ ] Implementar patching a bandMembersSettings
- [ ] Actualizar band-members-loader para retornar elementStyles
- [ ] Actualizar BandMembersSection para aplicar estilos
- [ ] Test en local: editar band-members-bg en `/editor`
- [ ] Test en local: verificar que `/` refleja cambios
- [ ] Repetir patrón para Live, Press, About, Contact

---

## RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|-----------|
| Documento bandMembersSettings no existe | Media | Crear antes, con estructura clara |
| Estilos no se aplican en componente | Media | Usar type: object en Sanity schema |
| Caching impide ver cambios | Baja | force-dynamic ya está en loaders |
| Conflicto con homeEditorState | Baja | homeEditorState sigue siendo source, solo materializa |

