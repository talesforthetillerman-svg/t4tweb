# 🔍 AUDITORÍA EXACTA: Flujo de Materialización

**Fecha:** 2026-04-13  
**Objetivo:** Entender qué cambios del editor se publican vs se quedan solo en homeEditorState

---

## PROBLEMA IDENTIFICADO

El editor guarda cambios en `homeEditorState.nodesJson` (documento singleton), pero la pública renderiza desde documentos reales (heroSection, navigation, introBanner, etc.). **Resultado:** cambios del editor se ven en `/editor` pero NO en `/`.

---

## TAREA 1: QUÉ SE GUARDA DÓNDE

### Documento Singleton: `homeEditorState`

**Ubicación:** `app/api/editor-deploy/route.ts` línea 1132-1151

```typescript
if (Array.isArray(payload.nodes) && payload.nodes.length > 0) {
  const homeStateDocument = {
    _id: HOME_EDITOR_STATE_DOCUMENT_ID,
    _type: SANITY_DOC_HOME_EDITOR_STATE,
    updatedAt: new Date().toISOString(),
    nodesJson: JSON.stringify(payload.nodes),  // ← TODO se guarda aquí
  }
  const homeStateResponse = await writeClient.createOrReplace(homeStateDocument)
  homeEditorStateDocumentId = homeStateResponse._id
  
  // Marca TODOS los nodos como persistidos
  for (const node of payload.nodes) {
    if (!persistedNodes.includes(node.id)) persistedNodes.push(node.id)
  }
}
```

**Clave:** `payload.nodes` incluye TODOS los cambios, sin importar el tipo.

**Problema:** homeEditorState es un singleton privado que:
- La pública `/` NO lee
- Solo el editor `/editor` usa para renderizar
- NO se materializa a documentos públicos

---

## TAREA 2: QUÉ SE MATERIALIZA A DOCUMENTOS PÚBLICOS REALES

### 1. Hero Section (heroSection document)

**Nodos que se materializan:** (línea 813-822)

```typescript
const HERO_LAYOUT_IDS = new Set([
  "hero-section",         // ← Layout/size de la sección
  "hero-bg-image",        // ← URL de imagen de fondo
  "hero-title-main",      // ← Estilo/posición
  "hero-title-accent",    // ← Estilo/posición
  "hero-subtitle",        // ← Estilo/posición
  "hero-logo",            // ← Estilo/posición
  "hero-scroll-indicator",// ← Estilo/posición
  "hero-buttons",         // ← Estilo/posición
])

// Solo estos nodos se procesan para patching a heroSection
for (const node of payload.nodes) {
  if (!HERO_LAYOUT_IDS.has(node.id)) continue  // ← Salta los que NO están en el set
  // ... patching logic
}
```

**Campos que se actualizan en heroSection:**
- `backgroundImage` (si `hero-bg-image` tiene URL persistible)
- `scrollLabel` (si `hero-scroll-indicator` tiene texto)
- `elementStyles` (posiciones, escalas, tamaños, colores)
- `title`, `titleHighlight`, `subtitle`, `description`, `ctaButtons` (solo si cambian en pública)

**Campos que NO se materializan:**
- ❌ Logo (obtenido del documento, no del editor)
- ❌ Content del título si cambia solo en editor (vive en homeEditorState)

---

### 2. Navigation Document

**Nodos que se materializan:** (línea 128-129)

```typescript
function isNavLayoutId(id: string): boolean {
  return id === "navigation" || id === "navigation-inner" || id.startsWith("nav-")
}
```

**Pattern:** Es una función, no un set, pero evalúa IDs que empiezan con `nav-`

**Campos que se actualizan en navigation:**
- `elementStyles` (posiciones, escalas, colores)
- Content (brandName, links) si cambia

**Campos que NO se materializan:**
- ❌ Cambios en nodos que NO comienzan con `nav-`

---

### 3. Intro Banner Document

**Nodos que se materializan:** (línea 111-117)

```typescript
const INTRO_LAYOUT_IDS = new Set([
  "intro-section",        // ← Layout
  "intro-banner-gif",     // ← GIF/imagen
  "intro-banner-text",    // ← Texto
  "intro-book-button",    // ← Botón
  "intro-press-button",   // ← Botón
])
```

**Campos que se actualizan en introBanner:**
- `elementStyles` (posiciones, escalas, colores, tipografía)
- Content (bannerText, gifUrl, bookLabel, pressLabel) si cambia

---

## TAREA 3: QUÉ TIPOS DE NODOS NO TIENEN MATERIALIZACIÓN

### Nodos que se guardan SOLO en homeEditorState.nodesJson

**Tabla de nodos sin materialización:**

| Node ID | Tipo | Dónde Aparece | Por Qué No Se Materializa |
|---------|------|---------------|---------------------------|
| `band-members-bg` | background | Solo en `/editor` | ❌ Sin set de IDs, sin estrategia de patch |
| `band-members-section` | section | Solo en `/editor` | ❌ Sin equivalente en documentos públicos |
| `section-divider-*` | divider | Solo en `/editor` | ❌ Componente que no tiene documento Sanity |
| `live-section` | section | Solo en `/editor` | ❌ Sin documento público dedicado |
| `live-bg` | background | Solo en `/editor` | ❌ Sin estrategia de materialización |
| `about-section` | section | Solo en `/editor` | ❌ Renderiza desde código, no Sanity |
| `about-bg` | background | Solo en `/editor` | ❌ No tiene documento Sanity |
| `press-kit-*` | card/section | Solo en `/editor` | ❌ Renderiza desde código |
| `contact-section` | section | Solo en `/editor` | ❌ Renderiza desde código |
| `scene-*` | wrapper | Solo en `/editor` | ❌ Wrapper layout, no persistible |
| `latest-release-*` | section/card | Solo en `/editor` | ❌ No tiene documento Sanity |
| `footer-*` | footer elements | Solo en `/editor` | ❌ Renderiza desde código |
| `ribbons-*` | decorative | Solo en `/editor` | ❌ Elemento decorativo sin persistencia |
| `hero-*` (sin estar en HERO_LAYOUT_IDS) | various | Solo en `/editor` | ❌ Fuera del set de materialización |

---

## TAREA 4: POR QUÉ CAMBIOS NO LLEGAN A `/`

### Ejemplo Real: `band-members-bg`

**Flujo Actual:**
```
1. Usuario edita band-members-bg en /editor
   ↓
2. Visual editor guarda cambio en homeEditorState (línea 1138)
   ↓
3. homeEditorState.nodesJson = { ... band-members-bg: { src: "...", style: {...} } ... }
   ↓
4. Public `/` renderiza BandMembersSection
   ↓
5. BandMembersSection carga backgroundImage de loaders
   ↓
6. Loaders no leen homeEditorState (no tienen acceso)
   ↓
7. BandMembersSection muestra imagen ANTIGUA (la del loader)
   ↓
8. ❌ Cambio del editor NO aparece en `/`
```

**Por qué:**
- `band-members-bg` NO está en ningún LAYOUT_IDS set
- NO hay código que materialice este nodo a un documento Sanity
- BandMembersSection no lee `homeEditorState`
- Pública lee desde loaders que leen documentos Sanity (no homeEditorState)

### Ejemplo Real: `section-divider-press-band`

**Flujo:**
```
1. Usuario edita section-divider-press-band en /editor
   ↓
2. homeEditorState.nodesJson recibe cambio
   ↓
3. Pero section-divider-press-band es un componente de layout puro
   ↓
4. No hay documento Sanity que lo respalde
   ↓
5. No hay materialización posible HOY
   ↓
6. ❌ Cambio queda atrapado en homeEditorState
```

---

## ARQUITECTURA ACTUAL (VISUALIZADA)

```
/editor (visual-editor.tsx)
   ↓ (lee)
homeEditorState.nodesJson ← guardado aquí
   ↓ (renderiza)
Vista del editor muestra cambios

/ (home-page-public.tsx)
   ↓ (carga)
heroLoader (perspective: published)
navigationLoader (perspective: published)
introBannerLoader (perspective: published)
bandMembersLoader (perspective: published)
liveLoader (perspective: published)
   ↓ (leen)
Documentos reales en Sanity
   ↓ (renderiza)
Vista pública ANTIGUA

↕ DESCONEXIÓN ↕
homeEditorState cambios NO llegan a documentos públicos
```

---

## QUÉ SE MATERIALIZA HOY (COMPLETO)

### ✅ Nodos que SÍ llegan a `/`

| Node | Campo Destino | Documento | Cómo |
|------|---------------|-----------|------|
| `hero-bg-image` | `backgroundImage` | heroSection | Si src es persistible (no blob:) |
| `hero-scroll-indicator` | `scrollLabel` | heroSection | Si tiene texto |
| `hero-*` (en HERO_LAYOUT_IDS) | `elementStyles` | heroSection | Estilos/layout en `elementStyles[nodeId]` |
| `nav-*`, `navigation` | `elementStyles` | navigation | Estilos/layout en `elementStyles[nodeId]` |
| `intro-*` (en INTRO_LAYOUT_IDS) | `elementStyles` | introBanner | Estilos/layout en `elementStyles[nodeId]` |

**Total:** Solo Hero, Navigation, Intro Banner tienen materialización  
**Resto:** 70%+ de los cambios quedan en homeEditorState

---

## QUÉ NO SE MATERIALIZA (LISTA COMPLETA)

### ❌ Nodos sin estrategia de materialización hoy

1. **Band Members Section**
   - band-members-bg (background)
   - member-item-* (cards)
   
2. **Section Dividers**
   - section-divider-* (todos los dividers)

3. **Latest Release**
   - latest-release-* (section + cards)

4. **About Section**
   - about-section, about-bg

5. **Press Kit**
   - press-kit-*, manager-*

6. **Live Section**
   - live-section, live-bg, concert-*

7. **Contact Section**
   - contact-section, contact-*

8. **Footer**
   - footer-*

9. **Decorative**
   - ribbons-*, scene-*

10. **Otros**
    - Cualquier nodo que NO esté explícitamente en un LAYOUT_IDS o isLayoutId()

---

## TAREA 5: NODOS BLOQUEADOS POR `blob:`

### Imágenes que NO pueden persistir hoy

| Node ID | Tipo | Razón | Bloqueo |
|---------|------|-------|---------|
| `hero-bg-image` | image | Carga desde `blob:` | Saltado en línea 796 |
| (cualquier image con blob:) | image | Upload local sin persistir | isImageSrcPersistable() retorna false |

**Log de deploy actual:**
```
"skippedNodes": ["hero-bg-image:src(blob/data url)"]
```

---

## MAPEO EXPLÍCITO: CÓMO ARREGLARLO

### Opción A: Extender materialización existente

Para que `band-members-bg` llegue a `/`:

1. **Crear documento Sanity para band members settings**
   ```typescript
   // sanity/schemas/bandMembersSection.ts
   {
     name: 'bandMembersSection',
     type: 'document',
     fields: [
       { name: 'backgroundImage', type: 'image' },
       { name: 'elementStyles', type: 'object' }
     ]
   }
   ```

2. **Agregar a materialización en editor-deploy**
   ```typescript
   const BAND_LAYOUT_IDS = new Set([
     "band-members-section",
     "band-members-bg",
     "member-item-*"
   ])
   ```

3. **Patchear a documento real**
   ```typescript
   const bandPatch = { ... elementStyles... }
   await writeClient.patch(bandMembersDocId).set(bandPatch).commit()
   ```

4. **Cargar en loaders**
   ```typescript
   // lib/sanity/band-members-loader.ts
   const settings = await client.fetch(`*[_type == "bandMembersSection"][0]`)
   // Usar settings.elementStyles para estilos del editor
   ```

### Opción B: Materializar a documentos existentes

Para `band-members-bg`, usar documento existente o agregar campo.

---

## RESUMEN: QUÉ VIVE DÓNDE

| Localidad | Qué Guarda | Quién Lee | Usa Cambios |
|-----------|-----------|-----------|-------------|
| `homeEditorState.nodesJson` | Todos los nodos | `/editor` solo | Sí |
| `heroSection.elementStyles` | Hero estilos/layout | Loaders (pública) | Sí |
| `navigation.elementStyles` | Nav estilos/layout | Loaders (pública) | Sí |
| `introBanner.elementStyles` | Intro estilos/layout | Loaders (pública) | Sí |
| (otros documentos) | Contenido base | Loaders (pública) | No cambios del editor |

---

## CONCLUSIÓN

**El problema exacto:**
- homeEditorState es un singleton que almacena TODO
- Pero materializa SOLO a 3 documentos (Hero, Nav, Intro)
- Cambios en otros nodos se quedan atrapados en homeEditorState
- Pública NO lee homeEditorState, solo documentos reales
- **Resultado:** 70% de cambios del editor NO llegan a `/`

**Necesario para materializar:**
1. Crear documentos Sanity para secciones faltantes (o extender existentes)
2. Agregar LAYOUT_IDS sets para cada sección
3. Implementar patching a esos documentos en editor-deploy
4. Cargar esos documentos en loaders para que pública los use

