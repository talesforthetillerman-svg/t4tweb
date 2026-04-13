# 🚫 NODOS BLOQUEADOS: Por Qué No Se Publican

**Propósito:** Catalogar qué cambios del editor quedan atrapados y por qué

---

## CATEGORÍA 1: Nodos Sin Materialización Definida

Estos nodos se guardan en homeEditorState pero NO tienen documento Sanity donde persistir.

### Band Members Section
| Node ID | Tipo | Razón | Solución |
|---------|------|-------|----------|
| `band-members-section` | section | Sin documento bandMembersSettings | Crear schema + implementar materialización |
| `band-members-bg` | background | Sin documento bandMembersSettings | Crear schema + implementar materialización |
| `member-item-0...4` | card | Sin documento bandMembersSettings | Crear schema + implementar materialización |

**Impacto:** Cambios en estilos, posición, tamaño de band-members NO llegan a `/`

### Live Section
| Node ID | Tipo | Razón | Solución |
|---------|------|-------|----------|
| `live-section` | section | Sin documento liveSettings | Crear schema + implementar materialización |
| `live-bg` | background | Sin documento liveSettings | Crear schema + implementar materialización |
| `concert-card-*` | card | Sin documento liveSettings | Crear schema + implementar materialización |

**Impacto:** Cambios en live section NO llegan a `/`

### Press Kit Section
| Node ID | Tipo | Razón | Solución |
|---------|------|-------|----------|
| `press-kit-section` | section | Sin documento pressKitSettings | Crear schema + implementar materialización |
| `press-kit-bg` | background | Sin documento pressKitSettings | Crear schema + implementar materialización |
| `resource-*` | card | Sin documento pressKitSettings | Crear schema + implementar materialización |
| `manager-*` | card | Sin documento pressKitSettings | Crear schema + implementar materialización |

**Impacto:** Cambios en press kit NO llegan a `/`

### About & Contact Sections
| Node ID | Tipo | Razón | Solución |
|---------|------|-------|----------|
| `about-section` | section | Sin documento aboutSettings | Crear schema + implementar materialización |
| `about-bg` | background | Sin documento aboutSettings | Crear schema + implementar materialización |
| `contact-section` | section | Sin documento contactSettings | Crear schema + implementar materialización |
| `contact-bg` | background | Sin documento contactSettings | Crear schema + implementar materialización |

**Impacto:** Cambios en about/contact NO llegan a `/`

### Scene Wrappers & Dividers
| Node ID | Tipo | Razón | Solución |
|---------|------|-------|----------|
| `section-divider-*` | divider | Es componente puro, no documentable | Considerar como layout, no persistir |
| `scene-*` | wrapper | Es layout wrapper, no documentable | No persistir directamente |
| `ribbons-block` | decorative | Es componente decorativo | No persistir |

**Impacto:** Cambios en dividers/wrappers NO pueden persistir (by design)

### Latest Release
| Node ID | Tipo | Razón | Solución |
|---------|------|-------|----------|
| `latest-release-section` | section | Sin documento, componente renderizado | No hay fuente Sanity actual |
| `latest-release-*` | card | Sin documento | Renderiza desde código, no CMS |

**Impacto:** No tiene documento Sanity

---

## CATEGORÍA 2: Nodos Bloqueados por blob: URLs

Estos nodos TENDRÍAN documento, pero el valor es una URL no-persistible.

### Images with blob: URLs

| Node ID | Tipo | Valor Actual | Bloqueante | Solución |
|---------|------|--------------|-----------|----------|
| `hero-bg-image` | image | `blob:...` | isImageSrcPersistable() retorna false | Upload a Sanity assets primero |
| Cualquier `*-image` con blob: | image | `blob:...` | No pasa validación | Upload a Sanity assets primero |
| Cualquier `*-bg` con blob: | background | `blob:...` | No pasa validación | Upload a Sanity assets primero |

**Deploy Log:**
```
"skippedNodes": ["hero-bg-image:src(blob/data url)"]
```

**Por qué:**
```typescript
// app/api/editor-deploy/route.ts línea 795-796
} else if (!isImageSrcPersistable(src)) {
  skippedNodes.push("hero-bg-image:src(blob/data url)")
```

**Función validadora (línea 374-379):**
```typescript
function isPersistableImageSrc(value: string | undefined): boolean {
  if (!value) return false
  const src = value.trim()
  if (!src) return false
  if (src.startsWith("blob:") || src.startsWith("data:") || src.startsWith("javascript:")) return false
  return src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")
}
```

**Solución:**
1. Usar `/api/editor-upload-asset` para subir a Sanity ANTES de guardar
2. O hacer que visual-editor convierta blob: → Sanity URL automáticamente

---

## CATEGORÍA 3: Parcialmente Materializado (Hero Específico)

Estos nodos están en HERO_LAYOUT_IDS pero tienen limitaciones.

### hero-logo
| Limitación | Razón |
|----------|-------|
| URL del logo NO se materializa | Se obtiene del documento heroSection, no del editor |
| Estilo/posición SÍ se materializa | Va a elementStyles |

**Resultado:** Cambios de estilo del logo aparecen en `/`, cambios de URL NO

---

## CATEGORÍA 4: Contenido vs Estilo

### Qué SÍ se materializa (Hero, Nav, Intro)
- ✅ Estilo/layout (elementStyles)
- ✅ Tipografía (fontSize, fontWeight)
- ✅ Colores (color, backgroundColor)
- ✅ Posición (translate, scale)
- ✅ Tamaño (width, height)
- ✅ Algunas URLs (hero-bg-image si no es blob:)
- ✅ Texto simple (scrollLabel, bannerText) si cambia en Sanity

### Qué NO se materializa
- ❌ Contenido nuevo creado solo en editor (no en Sanity)
- ❌ Text nodes que no tienen equivalente en documento
- ❌ Layout de secciones sin documento Sanity
- ❌ blob: URLs
- ❌ Cambios que NO están en un LAYOUT_IDS set

---

## SUMMARY TABLE: Todos Los Nodos

| Sección | Nodo | Estado | Por Qué |
|---------|------|--------|--------|
| **HERO** | hero-section | ✅ | En HERO_LAYOUT_IDS |
| | hero-bg-image | ⚠️ | En set, pero bloqueado si blob: |
| | hero-title-main | ✅ | En HERO_LAYOUT_IDS |
| | hero-title-accent | ✅ | En HERO_LAYOUT_IDS |
| | hero-subtitle | ✅ | En HERO_LAYOUT_IDS |
| | hero-logo | ⚠️ | Estilo sí, URL no |
| | hero-scroll-indicator | ✅ | En HERO_LAYOUT_IDS |
| | hero-buttons | ✅ | En HERO_LAYOUT_IDS |
| **NAV** | navigation | ✅ | isNavLayoutId() true |
| | nav-* | ✅ | isNavLayoutId() true |
| **INTRO** | intro-section | ✅ | En INTRO_LAYOUT_IDS |
| | intro-banner-gif | ✅ | En INTRO_LAYOUT_IDS |
| | intro-banner-text | ✅ | En INTRO_LAYOUT_IDS |
| | intro-book-button | ✅ | En INTRO_LAYOUT_IDS |
| | intro-press-button | ✅ | En INTRO_LAYOUT_IDS |
| **BAND** | band-members-* | ❌ | Sin bandMembersSettings |
| **LIVE** | live-* | ❌ | Sin liveSettings |
| **PRESS** | press-kit-* | ❌ | Sin pressKitSettings |
| **ABOUT** | about-* | ❌ | Sin aboutSettings |
| **CONTACT** | contact-* | ❌ | Sin contactSettings |
| **DIVIDERS** | section-divider-* | ❌ | No documentables |
| **SCENE** | scene-* | ❌ | No documentables |
| **LATEST** | latest-release-* | ❌ | Sin documento Sanity |
| **RIBBONS** | ribbons-* | ❌ | No documentables |

---

## DESBLOQUEO REQUERIDO

### Para que más cambios lleguen a `/`:

1. **Crear documentos Sanity** para:
   - bandMembersSettings
   - liveSettings
   - pressKitSettings
   - aboutSettings
   - contactSettings

2. **Agregar LAYOUT_IDS sets** para cada sección

3. **Implementar patching** en editor-deploy para cada nueva sección

4. **Cargar en loaders** para que componentes usen los estilos

5. **Pasar elementStyles** a componentes

**Esfuerzo:** ~3-4 horas por sección  
**Complejidad:** Repetitiva (mismo patrón para todas)

---

## BLOQUEANTES CRÍTICOS

### 1. blob: URLs
**Nodos afectados:** hero-bg-image (y potencialmente otros)  
**Bloqueante:** No pueden persistir sin ser subidas a Sanity primero  
**Solución:** Implementar upload automático en visual-editor.tsx

**Status:** Requiere trabajo adicional del asset system  
**Timeline:** Después de resolver este problema

### 2. Documentos no-documentables
**Nodos:** section-divider-*, scene-*, ribbons-*  
**Problema:** Son componentes de layout puro sin CMS backing  
**Solución:** Considerar como layout de página, no persistibles

**Status:** Arquitectura discussion needed  
**Timeline:** Decisión de diseño

### 3. Componentes sin Sanity
**Nodos:** latest-release-*  
**Problema:** Se renderizan desde código, no de CMS  
**Solución:** Migrar a Sanity o dejar como-está

**Status:** Refactor needed  
**Timeline:** Futuro

---

## CONCLUSIÓN

**Nodos que pueden desbloquearse hoy:** 70+ (band, live, press, about, contact)  
**Nodos que no pueden persistir:** 10-15 (dividers, scene, ribbons)  
**Nodos bloqueados por blob::** 1-5 (imágenes sin upload)

**Siguiente paso:** Implementar materialización para Band Members, verificar que funciona, repetir patrón para otros.

