# ⏳ TEMA PENDIENTE: Sistema de Assets T4T

**STATUS:** AUDITORÍA COMPLETA - NO IMPLEMENTAR TODAVÍA  
**Fecha de Auditoría:** 2026-04-13  
**Prioridad:** CRÍTICA (después de publicación)

---

## 🚫 ORDEN CORRECTO DE TRABAJO

```
AHORA:
├── Resolver problema de publicación
│   ├── Materialización de homeEditorState → docs públicos
│   ├── Entender qué NO se publica
│   └── Fix del flujo de datos

DESPUÉS (cuando publicación esté OK):
└── Implementar sistema de assets T4T
    ├── Fase 2: Biblioteca central
    ├── Fase 3: Upload pipeline correcto
    └── Fase 4: Deduplicación
```

---

## 🎯 PROBLEMA CRÍTICO IDENTIFICADO

Las imágenes subidas desde el editor persisten como **`blob:` URLs** en lugar de convertirse a URLs persistentes.

### Impacto
- ❌ No persiste entre sesiones
- ❌ No se publica en web pública
- ❌ Inconsistencia de datos
- ❌ Riesgo de pérdida de imágenes

### Root Cause
- `visual-editor.tsx` DETECTA blob: (línea 2128, 378)
- Pero NO las convierte automáticamente a Sanity assets
- Advierte: "Local blob preview only"
- No hay pipeline automático de upload

---

## 📊 AUDITORÍA COMPLETADA

### Hallazgos
✅ 62 archivos inventariados  
✅ 23-25 duplicados exactos detectados  
✅ 35-40 MB recuperables  
✅ 37+ MB de GIFs ineficientes (33MB uno solo)  
✅ Estructura caótica en `public/images/`  
✅ Infraestructura ya existe:
   - `/api/editor-upload-asset` ← YA FUNCIONA
   - `lib/sanity/image.ts` ← helper existente
   - `writeClient.assets.upload()` ← disponible

### Documentación
- `.claude/assets-audit.md` (inventario detallado)
- `.claude/assets-implementation-plan.md` (plan técnico)
- `.claude/assets-summary.md` (resumen ejecutivo)

---

## 🏗️ DECISIÓN ARQUITECTÓNICA PENDIENTE

### Opción 1: Biblioteca Local
```
public/assets/t4t/
├── core/
├── sections/
├── members/
└── ui/
```
✓ Simple
✗ No versionado
✗ Sin deduplicación automática

### Opción 2: Sanity como Almacenamiento Real (RECOMENDADO)
```
Sanity Assets con namespace lógico "t4t"
├── core/
├── sections/
├── members/
└── ui/

assetMetadata documents para rastreo:
├── assetId → URL
├── category
├── purpose
├── version
└── replacesAsset (para dedup)
```
✓ Versionado
✓ Deduplicación automática
✓ Centralizado
✓ Sanity como fuente única

**PREFERENCIA:** Sanity como almacenamiento real

---

## 🔄 FLUJO FUTURO (cuando se implemente)

### Pipeline Correcto de Subida
```
1. Usuario sube imagen en editor
   ↓
2. Upload a /api/editor-upload-asset
   ↓
3. writeClient.assets.upload() → Sanity
   ↓
4. Retorna URL persistente (https://cdn.sanity.io/...)
   ↓
5. Crea AssetMetadata document en Sanity
   - assetId
   - categoría
   - propósito
   - metadata
   ↓
6. Nodo del editor actualiza con URL real (NO blob:)
   ↓
7. Deploy verifica: isPersistableImageSrc() ✓
   ↓
8. Persiste en homeEditorState como URL real
   ↓
9. Publicación envía datos correctos a web pública
```

### Estructura de Biblioteca
```
T4T_ASSETS (centralizado en lib/sanity/image-library.ts)
├── core
│   ├── logoWhite: '/sanity-cdn-url/...'
│   ├── logoTransparent: '/sanity-cdn-url/...'
│   └── logoQR: '/sanity-cdn-url/...'
├── sections
│   ├── heroBg: '/sanity-cdn-url/...'
│   ├── aboutBg: '/sanity-cdn-url/...'
│   ├── bandSection: '/sanity-cdn-url/...'
│   ├── liveSection: '/sanity-cdn-url/...'
│   ├── pressBg: '/sanity-cdn-url/...'
│   ├── contactBg: '/sanity-cdn-url/...'
│   └── bannerIntro: '/sanity-cdn-url/...'
├── members
│   ├── janoschPuhe: '/sanity-cdn-url/...'
│   ├── jmaGarciaLopez: '/sanity-cdn-url/...'
│   └── ... otros miembros
└── ui
    ├── iconLight: '/sanity-cdn-url/...'
    ├── iconDark: '/sanity-cdn-url/...'
    ├── appleIcon: '/sanity-cdn-url/...'
    └── placeholder: '/sanity-cdn-url/...'
```

---

## 📋 QUÉ NO HACER AHORA

```
❌ Mover archivos
❌ Borrar duplicados
❌ Refactor masivo de rutas
❌ Cambios en loaders
❌ Modificar visual-editor.tsx upload handler
❌ Crear public/assets/t4t/
❌ Crear image-library.ts

Esto es una FASE SEPARADA.
```

---

## 📋 QUÉ SÍ HACER CUANDO SE IMPLEMENTE

### Análisis Necesario
1. ¿Cómo integrar assets en Sanity correctamente?
   - Schema assetMetadata
   - Policy de naming
   - Tags/categorías

2. ¿Cómo conectar `/api/editor-upload-asset` al flujo real?
   - Upload automático en visual-editor
   - Retorna URL persistente
   - Actualiza nodo sin parar

3. ¿Cómo evitar que cualquier nodo persista `blob:`?
   - Validación en deploy
   - Advertencia en editor
   - Conversión automática si es posible

4. ¿Plan de migración?
   - public/images/ → Sanity assets
   - Deduplicación basada en hash
   - Versionado
   - Reutilización

### Implementación (Fases 2-4)
- **Fase 2:** Biblioteca central en Sanity
- **Fase 3:** Pipeline de upload correcto
- **Fase 4:** Deduplicación y limpieza

---

## 🔗 CONEXIÓN CON PROBLEMA ACTUAL

### Problema de Publicación (AHORA)
- Web pública muestra contenido antiguo
- Changes from editor no llegan a public
- Mismatch entre published vs previewDrafts

### Problema de Assets (DESPUÉS)
- blob: URLs no persistibles
- Imágenes perdidas en deploy
- Sin fuente única de verdad

**Relación:** El problema de assets AMPLIFICA el de publicación.
Si no tenemos URLs persistentes, la publicación no puede funcionar.

---

## 📌 CHECKLIST FUTURO

Cuando volvamos a este tema, verificar:

- [ ] ¿Problema de publicación está resuelto?
- [ ] ¿Sanity CMS está confirmado como almacén?
- [ ] ¿Schema assetMetadata diseñado?
- [ ] ¿Política de naming clara?
- [ ] ¿Plan de migración documentado?
- [ ] ¿API editor-upload-asset listo?
- [ ] ¿Límites de Sanity verificados?

---

## 📚 REFERENCIAS

**Documentación Existente:**
- `.claude/assets-audit.md` - Inventario completo
- `.claude/assets-implementation-plan.md` - Plan técnico
- `.claude/assets-summary.md` - Resumen ejecutivo

**Archivos de Código Relevantes:**
- `components/visual-editor.tsx` (línea 2128, 378, 1466)
- `app/api/editor-upload-asset/route.ts` (ya existe)
- `lib/sanity/image.ts` (ya existe)
- `lib/sanity/hero-loader.ts` (rutas actuales)

**Problemas en Código:**
- blob: detectados pero no convertidos
- upload handler solo para vista previa
- no hay URL persistente automática
- public/images/ caótico

---

## 🎬 CÓMO RETOMAR

Cuando estés listo para implementar:

1. Lee `.claude/assets-audit.md` (5 min)
2. Lee `.claude/assets-implementation-plan.md` (10 min)
3. Decide Sanity vs local
4. Comienza Fase 2: Estructura + Biblioteca
5. Luego Fase 3: Upload pipeline correcto
6. Finalmente Fase 4: Deduplicación

**Tiempo estimado:** 8-10 horas en 2 iteraciones

---

## ⚠️ RECORDATORIO CRÍTICO

**NO HACER TODAVÍA:**
- Este es un tema PARA DESPUÉS
- Primero resuelve publicación
- LUEGO vuelve a assets
- El orden importa

**GUARDAR PARA:**
- Próxima sesión donde se haya resuelto publicación
- Cuando necesites URLs persistentes en editor
- Cuando quieras limpiar `public/images/`
- Cuando implementes deduplicación

