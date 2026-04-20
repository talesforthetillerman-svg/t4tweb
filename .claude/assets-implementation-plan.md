# 📐 PLAN DE IMPLEMENTACIÓN - Asset Management T4T

**Objetivo:** Crear biblioteca centralizada durable sin blob: permanentes

---

## FASE 2: BIBLIOTECA CENTRAL `t4t` EN SANITY

### 2.1 Estructura Propuesta

```
Sanity Asset Library: "t4t"
├── Asset Categories (tags):
│   ├── core (logos, branding)
│   ├── sections (hero, about, press, etc.)
│   ├── members (band members photos)
│   ├── ui (icons, placeholders)
│   └── archive (deprecated, old versions)
│
└── Naming Convention:
    {category}-{purpose}-{version}
    Examples:
    - core-logo-white-v1
    - sections-hero-bg-main-v1
    - members-janosch-puhe-v1
    - ui-icon-light-v1
```

### 2.2 Estructura de Metadatos en Sanity

**Crear schema `assetMetadata` para documentos:**

```typescript
// sanity/schemas/assetMetadata.ts
export const assetMetadata = {
  name: 'assetMetadata',
  title: 'Asset Metadata',
  type: 'document',
  fields: [
    {
      name: 'assetId',
      title: 'Sanity Asset ID',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: ['core', 'sections', 'members', 'ui', 'archive'],
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'purpose',
      title: 'Purpose/Usage',
      type: 'string',
      description: 'e.g., "hero-background", "band-member-photo"',
    },
    {
      name: 'version',
      title: 'Version',
      type: 'number',
      initialValue: 1,
    },
    {
      name: 'replacesAsset',
      title: 'Replaces Asset ID',
      type: 'string',
      description: 'If this is a new version, reference the old asset ID',
    },
    {
      name: 'quality',
      title: 'Quality Notes',
      type: 'text',
      description: 'Resolution, size, format notes',
    },
    {
      name: 'createdAt',
      title: 'Created',
      type: 'datetime',
    },
  ],
  preview: {
    select: {
      category: 'category',
      purpose: 'purpose',
      version: 'version',
    },
    prepare(selection: any) {
      return {
        title: `${selection.category}/${selection.purpose}`,
        subtitle: `v${selection.version}`,
      }
    },
  },
}
```

### 2.3 Configuración de Sanity

**Lo que necesitas en Sanity Studio:**

1. ✅ Ya existe: `client.assets.upload()` en `/api/editor-upload-asset`
2. ✅ Ya existe: `imageUrlBuilder` en `lib/sanity/image.ts`
3. ❓ Necesita: Schema de assetMetadata
4. ❓ Necesita: UI component en Studio para gestionar biblioteca

---

## FASE 3: PIPELINE DE UPLOAD CORRECTO

### 3.1 Flujo Actual vs Propuesto

**FLUJO ACTUAL (con problema):**
```
Editor → Selecciona archivo → blob: URL → Guardado en homeEditorState (¡PROBLEMA!)
         ↓
         visual-editor detecta blob: pero NO lo convierte
```

**FLUJO PROPUESTO:**
```
Editor → Selecciona archivo
         ↓
       Upload API (/api/editor-upload-asset)
         ↓
       Sanity Assets upload (create asset)
         ↓
       Genera URL persistente (cdn.sanity.io/...)
         ↓
       Crea AssetMetadata document en Sanity
         ↓
       Retorna URL + assetId
         ↓
       Visual editor actualiza nodo con URL persistente
         ↓
       Deploy comprueba: isPersistableImageSrc() ✓
         ↓
       Persiste en homeEditorState como URL real (NO blob:)
```

### 3.2 Cambios en `components/visual-editor.tsx`

**Ubicación:** líneas 2400-2520 (Image/Background input handler)

**Cambio 1: Mejorar manejador de subida**

```typescript
// ANTES (línea ~2431):
onUpload={async (file: File) => {
  // Solo intenta blob
  const reader = new FileReader()
  reader.onload = () => {
    dispatch({
      type: "UPDATE_BACKGROUND",
      nodeId: selectedNode.id,
      patch: { src: reader.result as string, mediaKind: "image" },
    })
  }
  reader.readAsDataURL(file)
}}

// DESPUÉS:
onUpload={async (file: File) => {
  try {
    // 1. Intenta subir a Sanity
    const formData = new FormData()
    formData.append("file", file)
    
    const uploadRes = await fetch("/api/editor-upload-asset", {
      method: "POST",
      body: formData,
    })
    
    if (uploadRes.ok) {
      const { url, assetId } = await uploadRes.json()
      
      // 2. Actualiza nodo con URL persistente
      dispatch({
        type: "UPDATE_BACKGROUND",
        nodeId: selectedNode.id,
        patch: { 
          src: url, 
          mediaKind: "image",
          _assetId: assetId, // Metadata para rastreo
        },
      })
      
      // 3. Toast de éxito
      console.log("✓ Image uploaded to Sanity:", assetId)
    } else {
      // Fallback a blob si falla
      const errorText = await uploadRes.text()
      console.warn("Upload failed, using local preview:", errorText)
      
      // Blob fallback solo para vista previa
      const reader = new FileReader()
      reader.onload = () => {
        dispatch({
          type: "UPDATE_BACKGROUND",
          nodeId: selectedNode.id,
          patch: { 
            src: reader.result as string, 
            mediaKind: "image",
            _needsUpload: true, // Marcar como pendiente
          },
        })
      }
      reader.readAsDataURL(file)
    }
  } catch (error) {
    console.error("Upload error:", error)
  }
}}
```

**Cambio 2: Validación en deploy**

En `/app/api/editor-deploy/route.ts` línea ~1466, cambiar el filtro:

```typescript
// ANTES: reporta como failed
const nonPersistableNodes = Array.from(nodes.values())
  .filter((node) => (node.type === "image" || node.type === "background") 
    && !isPersistableImageSrc(node.content.src))
  .map((node) => node.id)

// DESPUÉS: intenta convertir blob: → Sanity
const nonPersistableNodes = Array.from(nodes.values())
  .filter((node) => {
    if ((node.type === "image" || node.type === "background") && 
        !isPersistableImageSrc(node.content.src)) {
      
      // Si está marcado como blob necesitando upload
      if (node.content._needsUpload && node.content.src.startsWith("blob:")) {
        return true // Sigue siendo un error
      }
      return false // OK si tiene URL persistente pero falta metadata
    }
    return false
  })
```

---

## FASE 4: REGLAS DE DEDUPLICACIÓN Y LIMPIEZA

### 4.1 Script de Deduplicación (Fase 1 completa)

```bash
# NO EJECUTAR AÚN - PROPUESTA SOLAMENTE

# 1. Crear directorio nuevo limpio
mkdir -p public/assets/t4t/{core,sections,members,ui}

# 2. Copiar mejores versiones (ejecutado con confirmar)
cp public/images/logo-transparent.png public/assets/t4t/core/
cp public/images/t4tPics/logo-white.png public/assets/t4t/core/
# ... etc

# 3. Crear índice de migración
echo "asset,oldPath,newPath,hash,size,status" > .claude/migration.csv
```

### 4.2 Reglas de Decisión

| Caso | Acción | Justificación |
|------|--------|---------------|
| 2+ archivos hash idéntico | Mantener 1 mejor ubicado | Elimina duplicación |
| Variantes (similares pero no idénticas) | Mantener mejor resolución | Calidad |
| backup/ | Revisar, mover a archive/ | Claridad |
| t4tPics/ | Reclasificar por propósito | Nombre descriptivo |
| GIF >5MB | Convertir a MP4/WebP | Performance |
| Archivo no referenciado | Mover a archive/ | Detectar huérfanos |

### 4.3 Proceso Manual Recomendado

**NO automatizar** todo esto. En su lugar:

1. **Crear la estructura nueva en `public/assets/t4t/`**
2. **Copiar manualmente mejores versiones**
3. **Actualizar referencias en código** (loaders, componentes)
4. **Probar que todo funciona**
5. **Luego eliminar antiguo** (mantener backup)

---

## CAMBIOS EN CÓDIGO

### Archivos a Modificar

#### 1. `lib/sanity/hero-loader.ts` (línea 27-28)
```typescript
// ANTES
logoUrl: "/images/t4tPics/logo-white.png",
bgUrl: "/images/t4tPics/hero-bg.jpg",

// DESPUÉS
logoUrl: "/assets/t4t/core/logo-white.png",
bgUrl: "/assets/t4t/sections/hero-bg.jpg",
```

#### 2. `lib/sanity/intro-banner-loader.ts` (línea 15)
```typescript
// ANTES
DEFAULT_INTRO_GIF_URL = "/images/t4tPics/banner-crop-ezgif.com-gif-maker.gif"

// DESPUÉS
// Opción A: Usar imagen estática
DEFAULT_INTRO_GIF_URL = "/assets/t4t/sections/banner-intro.jpg"

// Opción B: Convertir GIF a MP4 (mejor para performance)
DEFAULT_INTRO_BANNER_VIDEO = "/assets/t4t/sections/banner-intro.mp4"
```

#### 3. Crear `lib/sanity/image-library.ts` (nuevo)
```typescript
/**
 * Centralized image library for T4T.
 * Single source of truth for all asset URLs.
 */

export const T4T_ASSETS = {
  core: {
    logoWhite: '/assets/t4t/core/logo-white.png',
    logoTransparent: '/assets/t4t/core/logo-transparent.png',
    logoQR: '/assets/t4t/core/logo-qr.png',
  },
  sections: {
    heroBg: '/assets/t4t/sections/hero-bg.jpg',
    aboutBg: '/assets/t4t/sections/about-bg.jpg',
    bandSection: '/assets/t4t/sections/band-section.jpg',
    liveSectionBg: '/assets/t4t/sections/live-section.jpg',
    pressBg: '/assets/t4t/sections/press-bg.jpg',
    contactBg: '/assets/t4t/sections/contact-bg.jpg',
    bannerIntro: '/assets/t4t/sections/banner-intro.jpg', // O .mp4 si video
  },
  members: {
    janoschPuhe: '/assets/t4t/members/janosch-puhe.jpg',
    jmaGarciaLopez: '/assets/t4t/members/jma-garcia-lopez.jpg',
    ottoLorenzContreras: '/assets/t4t/members/otto-lorenz-contreras.jpg',
    robiiCrowford: '/assets/t4t/members/robii-crowford.jpg',
    tarikBenatmane: '/assets/t4t/members/tarik-benatmane.jpg',
  },
  ui: {
    iconLight: '/assets/t4t/ui/icon-light.png',
    iconDark: '/assets/t4t/ui/icon-dark.png',
    appleIcon: '/assets/t4t/ui/apple-icon.png',
    placeholder: '/assets/t4t/ui/placeholder.jpg',
  },
} as const
```

#### 4. Actualizar loaders para usar la librería
```typescript
// hero-loader.ts
import { T4T_ASSETS } from './image-library'

const FALLBACK: HeroData = {
  title: "",
  titleHighlight: "",
  subtitle: "",
  description: "",
  logoUrl: T4T_ASSETS.core.logoWhite,
  bgUrl: T4T_ASSETS.sections.heroBg,
  // ...
}
```

---

## PENDIENTE EN SANITY CMS

❓ **Verificar y crear (si no existe):**

1. [ ] Asset upload endpoint working: `/api/editor-upload-asset` ✓ (YA EXISTE)
2. [ ] Schema `assetMetadata` para rastrear assets en Sanity
3. [ ] Policy/tags para organizar assets en Studio
4. [ ] Documentación para usuarios en Studio

---

## TIMELINE Y ESFUERZO

| Fase | Duración | Complejidad | Estado |
|------|----------|-------------|--------|
| **Fase 1: Auditoría** | Completada | Baja | ✅ |
| **Fase 2: Biblioteca Central** | 1-2h | Baja | ⏳ |
| **Fase 3: Upload Pipeline** | 2-3h | Media | ⏳ |
| **Fase 4: Limpieza/Dedup** | 1-2h | Baja | ⏳ |
| **Total** | ~5-7h | Media | ⏳ |

---

## CHECKLIST FINAL

### Pre-Implementación
- [ ] Revisar y aprobar estructura `assets/t4t/`
- [ ] Crear schema `assetMetadata` en Sanity (si aplica)
- [ ] Backup completo de `public/images/`

### Implementación
- [ ] Crear estructura `public/assets/t4t/`
- [ ] Copiar mejores versiones de imágenes
- [ ] Crear `lib/sanity/image-library.ts`
- [ ] Actualizar loaders para usar nueva librería
- [ ] Mejorar `visual-editor.tsx` para upload a Sanity
- [ ] Probar que imágenes cargan correctamente

### Post-Implementación
- [ ] Verificar que NO hay blob: en homeEditorState
- [ ] Eliminar `public/images/` antiguo (mover a backup)
- [ ] Documentar para futuro mantenimiento
- [ ] Actualizar `.claude/MEMORY.md` con nueva estructura

---

## NOTAS IMPORTANTES

### Qué NO cambiar
- ❌ Diseño de componentes
- ❌ Hydration/boot logic
- ❌ Editor UI core
- ❌ Sanity schema de documentos principales

### Qué SÍ cambiar
- ✅ Rutas de imágenes
- ✅ Upload handler
- ✅ Deploy validation
- ✅ Librería centralizada

### Cuidados
1. **Sanity Asset Limits:** Verificar límites de Storage en tu proyecto
2. **CDN vs Local:** Si usas Sanity CDN, confirmar que SANITY_USE_CDN está correcto
3. **Metadata:** Rastrear qué assetId corresponde a qué URL
4. **Testing:** Verificar en local, staging y producción

