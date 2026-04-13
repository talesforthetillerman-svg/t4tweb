# Auditoría: Por Qué Hero Nodes No Entran en changedNodeIds

**Fecha:** 2026-04-13  
**Problema:** hero-logo, hero-title, hero-subtitle, hero-scroll-indicator NO aparecen en `changedNodeIds` aunque se editen

---

## Sistema de Dirty Tracking

**Archivo:** `components/visual-editor.tsx`

**Función `getNodeSignature()`** (línea 1319):
```typescript
return JSON.stringify({
  geometry: node.geometry,
  style: node.style,
  content: node.content,
  explicitContent: node.explicitContent,
  explicitStyle: node.explicitStyle,
  explicitPosition: node.explicitPosition,
  explicitSize: node.explicitSize,
})
```

**Comparación con baseline** (línea 1355-1361):
- Si la firma cambió → Se agrega a `dirtyNodeIdsRef`
- dirtyNodeIdsRef se env ía como `changedNodeIds` en el payload de deploy

**Conclusión:** El dirty tracking FUNCIONA si:
1. El nodo entra en `nodes` Map
2. Su firma cambia
3. No hay exclusiones especiales

---

## Flujo de Edición Esperado

### 1. Usuario selecciona nodo
```
Línea 895: dispatch({ type: "SELECT_NODE", nodeId: ... })
Línea 2135-2232: Panel abre para hero-title (grupo)
```

### 2. Usuario edita en panel
```
Línea 2145: dispatch({ type: "UPDATE_GROUP", nodeId: selectedNode.id, patch: {...} })
```

### 3. Comando se procesa en reducer
```
Línea 949-967: UPDATE_GROUP
  → patchNode(command.nodeId, updater)
  → Actualiza node en `next` Map
  → Firma cambia
```

### 4. Node se marca como dirty
```
Línea 1357-1359: if (baseline !== current) dirtyNodeIdsRef.add(id)
```

### 5. Deploy recibe changedNodeIds
```
Línea 1398-1402: changedNodeIds = Array.from(dirtyNodeIdsRef.current)
```

---

## Problemas Identificados

### Problema 1: hero-logo NO tiene panel de edición

**Estado:** ❌ SIN PANEL

- Tipo: "image"
- Línea 1371-1373: `isHeroAssetNode` se define pero **NUNCA se usa**
- NO hay condicional en el panel JSX para hero-logo
- **Resultado:** Usuario NO puede editar hero-logo desde el panel
- **Síntoma:** hero-logo no entra en changedNodeIds

**Evidencia:**
- Línea 2525+: Hay panel para background + video
- **FALTA:** Panel para tipo "image"

---

### Problema 2: hero-subtitle puede estar excluida del panel

**Estado:** ⚠️ CONDICIONALMENTE EXCLUIDA

- Tipo: "text"
- Línea 2237: `!(selectedNode.type === "text" && selectedNode.id === "hero-subtitle" && heroSubtitleSegments.length > 0)`
- Línea 1369: `heroSubtitleSegments` = `[]` si es hero-subtitle
- **PERO:** ¿Hay otro lugar donde se establece textSegments?

**Posible Problema:** Si hero-subtitle tiene `content.textSegments || content.titleSegments`, entonces heroSubtitleSegments NO será `[]` y será excluida

---

### Problema 3: hero-scroll-indicator está explícitamente excluida

**Estado:** ❌ EXCLUIDA

- Tipo: "card"
- Línea 1374: `isHeroScrollIndicatorCard = selectedNode?.type === "card" && selectedNode.id === "hero-scroll-indicator"`
- Línea 1394: `!isHeroScrollIndicatorCard` → Excluye del panel de editable cards
- **Resultado:** NO hay panel para editar hero-scroll-indicator
- **Síntoma:** hero-scroll-indicator no entra en changedNodeIds

**Código:**
```typescript
const isSimpleEditableCard =
  selectedNode?.type === "card" &&
  !isHeroScrollIndicatorCard &&  // ← EXCLUIDO
  !isFooterSocialGroup &&
  !hasNestedEditableChildren &&
  !hasStructuredCardFields
```

---

### Problema 4: hero-title-main y hero-title-accent NO se editan directamente

**Estado:** ⚠️ DEPENDENCIA DE hero-title

- Tipo: "group" (contenedor), NO son nodos editables directamente
- Se editan via hero-title (group) → UPDATE_GROUP con campos "text" y "accentText"
- **PROBLEMA:** Los spans hero-title-main y hero-title-accent NO tienen IDs propios en el nodo del grupo
- Línea 479-480: Se extraen del DOM pero no como nodos separados
- **Resultado:** Si el usuario modifica posición/tamaño de hero-title-main directamente en el editor, cambios NO se capturan porque no hay nodo "hero-title-main" en `nodes` Map

**Conclusión:** hero-title-main y hero-title-accent son **UI interna de hero-title**, no nodos independientes

---

## Resumen de Problemas

| Node | Panel | Tipo | Estado |
|------|-------|------|--------|
| hero-logo | ❌ No existe | image | ❌ NO entra en changedNodeIds |
| hero-title | ✅ Existe | group | ✅ SÍ entra |
| hero-title-main | ❌ Dependencia | Texto interno | ⚠️ Solo si hero-title editado |
| hero-title-accent | ❌ Dependencia | Texto interno | ⚠️ Solo si hero-title editado |
| hero-subtitle | ⚠️ Condicional | text | ⚠️ Puede estar excluida |
| hero-scroll-indicator | ❌ Excluida explícitamente | card | ❌ NO entra en changedNodeIds |
| hero-bg-image | ✅ Panel para video | background | ✅ Pero SLO si videoUrl |

---

## Comparación: Por Qué band-members-bg SÍ entra en changedNodeIds

**band-members-bg:**
- Tipo: "background"
- Línea 2525: Hay panel para `background && mediaKind === "video"`
- **PERO:** band-members-bg es video, así que el panel SÍ aparece
- Usuario puede editar opacity, videoUrl → dispatch UPDATE_BACKGROUND
- UPDATE_BACKGROUND actualiza el nodo → Firma cambia → Entra en changedNodeIds

**Conclusión:** band-members-bg entra porque:
1. Tiene un panel de edición
2. El panel despacha comandos UPDATE_*
3. Los comandos actualizan el nodo
4. El cambio se detecta en dirty tracking

---

## Fixes Necesarios

### Fix 1: Crear panel para hero-logo
- Agregar condicional para `selectedNode.type === "image"` (o hero-logo específico)
- Permitir editar: opacity, scale, posición
- Despachar UPDATE_IMAGE

### Fix 2: Desexcluir hero-scroll-indicator
- Remover la exclusión `!isHeroScrollIndicatorCard`
- O crear un panel específico para hero-scroll-indicator
- Permitir editar: text, opacity, posición
- Despachar UPDATE_CARD o UPDATE_SECTION

### Fix 3: Verificar hero-subtitle
- Verificar si `heroSubtitleSegments.length > 0` es siempre false
- Si NO es false, la exclusión es válida pero impide edición

### Fix 4: Documentar hero-title-main y hero-title-accent
- NO son nodos independientes, son campos internos de hero-title
- Se editan via hero-title panel con "text" y "accentText"
- No se puede editar posición/tamaño de forma independiente desde el panel

---
