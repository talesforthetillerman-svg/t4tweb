# 📊 RESUMEN EJECUTIVO - Asset Management T4T

Auditado: 2026-04-13  
Status: Listo para implementación escalonada

---

## 🎯 HALLAZGOS CRÍTICOS

### Problema 1: Duplicación Masiva
- **23-25 archivos duplicados exactos**
- **~35-40 MB recuperables**
- Ejemplos: `band-section.jpg` tiene 6 copias con diferentes nombres

### Problema 2: GIFs Ineficientes
- `hero-bg-ezgif.com-resize.gif`: **33 MB** (¡inaceptable!)
- `banner-crop.gif`: **3.2 MB** (debería ser MP4 o WebP)
- **Total GIF ineficientes: 37+ MB**

### Problema 3: Estructura Caótica
- Imágenes en 5+ directorios sin patrón claro
- Nombres inconsistentes (`t4t-janosch.jpg` vs `members/Janosch Puhe2.JPG`)
- Sin metadatos, sin versionado

### Problema 4: Blob URLs Persistidas
- `visual-editor.tsx` detecta blob: pero NO los convierte
- Mensaje actual (línea 2128): "Local blob preview only"
- Riesgo: blob: URLs pueden no ser persistentes entre sesiones/deploys

---

## 📈 IMPACTO DE NO ACTUAR

| Riesgo | Probabilidad | Impacto |
|--------|-------------|--------|
| Imágenes perdidas en deploy | Alta | 🔴 Critical |
| Blob: URLs rotas en prod | Media | 🔴 Critical |
| Lentitud de carga | Alta | 🟡 Major |
| Límites de almacenamiento | Media | 🟡 Major |
| Imposible auditar assets | Alta | 🟡 Major |

---

## 🚀 PLAN RECOMENDADO

### ✅ IMPLEMENTAR AHORA (Crítico)

**1. Crear biblioteca estructura `public/assets/t4t/` (30 min)**
```bash
mkdir -p public/assets/t4t/{core,sections,members,ui}
```

**2. Crear `lib/sanity/image-library.ts` (1h)**
- Centralized source of truth
- Una sola URL para cada imagen
- Fácil de auditar y mantener

**3. Actualizar loaders para usar librería (1.5h)**
- `hero-loader.ts`
- `intro-banner-loader.ts`
- Otros que usen imágenes

**4. Mejorar upload handler en visual-editor (2h)**
- Implementar upload automático a Sanity
- Evitar blob: permanentes
- Marcar blobs que necesitan conversión

**Tiempo total: ~4.5 horas**  
**Riesgo: Bajo (cambios localizados, sin afectar core)**

---

### ⏳ IMPLEMENTAR DESPUÉS (Importante)

**1. Deduplicación y limpieza (~2h)**
- Copiar mejores versiones a `assets/t4t/`
- Eliminar duplicados
- Archivo el backup antiguo

**2. Conversión de GIFs (1-2h)**
- Convertir GIF 33MB a JPG o video MP4
- Liberar 30+ MB de espacio

**3. Sanity assetMetadata schema (1h)**
- Rastrear versionado
- Documentar propósito de cada asset

**Tiempo total: ~4-5 horas**  
**Riesgo: Bajo (script de migración manual, reversible)**

---

### 💡 CONSIDERACIONES

#### Qué Pasará Después
1. Todas las imágenes en `public/assets/t4t/`
2. Una sola fuente de verdad (`image-library.ts`)
3. Upload automático a Sanity (sin blob:)
4. Metadata centralizada
5. Fácil de auditar, mantener, crecer

#### Qué No Cambia
- Diseño visual
- Componentes React
- Hydration/boot
- Sanity schema de datos principales

#### Qué Se Simplifica
- Localizar cualquier imagen
- Detectar duplicados
- Actualizar URLs
- Investigar problemas

---

## 📋 ENTREGABLES POR FASE

### Fase 1 (Completada)
✅ Inventario completo de 62 archivos
✅ Hashes MD5 de todos los assets
✅ Análisis de duplicados (23-25 exactos)
✅ Detección de GIFs ineficientes
✅ Estructura propuesta

**Documentación:**
- `.claude/assets-audit.md` (este archivo)
- Mapeo de duplicados
- Recomendaciones de consolidación

---

### Fase 2 (A Implementar)
📝 **Biblioteca central `t4t` en Sanity**
- Schema `assetMetadata`
- Convención de naming
- Política de tags

**Archivos a crear:**
- `public/assets/t4t/{core,sections,members,ui}/`
- `lib/sanity/image-library.ts`
- Actualizar sanity schemas (si aplica)

---

### Fase 3 (A Implementar)
📝 **Pipeline de upload correcto**
- Mejorar `/api/editor-upload-asset`
- Actualizar `visual-editor.tsx` para:
  - Detectar blob: URLs
  - Upload automático a Sanity
  - Retornar URL persistente
  - Marcar como "_assetId" para metadata

**Validación en deploy:**
- Deploy verifica que NO hay blob: sin assetId
- Reporta claramente qué necesita upload

---

### Fase 4 (A Implementar)
📝 **Deduplicación y limpieza**
- Script de migración (no automático)
- Copiar mejores versiones
- Eliminar duplicados
- Archivo backup antiguo

**Resultado:**
- ~35-40 MB liberados
- Estructura clara
- Metadata completa

---

## ⚠️ RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|-----------|
| Romper referencias | Baja | Usar librería centralizada, test después |
| Perder imágenes | Muy Baja | Backup completo antes, mover vs eliminar |
| Sanity límites | Baja | Verificar plan de Sanity |
| Cambios durante impl | Media | Documenting, branches, no main touch |

---

## 🔧 ARCHIVOS QUE TOCAR

### Crear (Nuevo)
```
public/assets/t4t/
├── core/
├── sections/
├── members/
└── ui/

lib/sanity/image-library.ts
```

### Actualizar (Existente)
```
lib/sanity/hero-loader.ts          (rutas)
lib/sanity/intro-banner-loader.ts  (rutas)
components/visual-editor.tsx       (upload logic)
app/api/editor-deploy/route.ts    (validation)
```

### Opcional (Si Sanity CMS lo necesita)
```
sanity/schemas/assetMetadata.ts   (nuevo documento type)
```

---

## 📊 COMPARATIVA: ANTES vs DESPUÉS

### ANTES
```
public/images/
├── t4tPics/         (50 MB, caótico)
├── sections/        (23 MB, sin patrón)
├── members/         (4.2 MB)
├── backup/          (932 KB, ¿por qué?)
└── raíz/            (10 MB, mezclado)

= 88 MB total, con 35-40 MB duplicados
```

### DESPUÉS
```
public/assets/t4t/
├── core/            (logos, branding)
├── sections/        (hero, press, etc.)
├── members/         (band members)
└── ui/              (icons, placeholders)

lib/sanity/image-library.ts
export const T4T_ASSETS = {
  core: { logoWhite: '...', ... },
  sections: { heroBg: '...', ... },
  // ...
}

= ~48-50 MB limpio, sin duplicados, versionado
```

---

## 🎬 SIGUIENTES PASOS

### Inmediato
1. ✅ Revisar y aprobar este plan
2. ✅ Crear backups completos
3. ✅ Crear rama feature (`feature/asset-management`)

### Día 1-2 (Fase 2-3: Core)
1. Crear estructura `public/assets/t4t/`
2. Copiar mejores versiones (manualmente)
3. Crear `lib/sanity/image-library.ts`
4. Actualizar loaders
5. Mejorar upload handler
6. Test en local, staging

### Día 3 (Fase 4: Limpieza)
1. Script de migración
2. Deduplicación
3. GIF → MP4/WebP conversion
4. Backup antiguo
5. Final test

### Post-Deploy
1. Monitorear que imágenes cargan OK
2. Verificar no hay blob: en homeEditorState
3. Documentar para mantenimiento futuro

---

## 💼 RECOMENDACIÓN FINAL

**IMPLEMENTAR EN 2 ITERACIONES:**

**Iteración 1 (Crítica):** Fases 2-3
- Crear biblioteca estructura
- Centralizar referencias
- Mejorar upload logic
- **Resultado:** Sin blob: permanentes, imagen library clara

**Iteración 2 (Limpieza):** Fase 4
- Deduplicación
- Conversión de GIFs
- Archivo backup
- **Resultado:** Espacio liberado, estructura clara

---

## 📞 PREGUNTAS A RESPONDER

1. ¿Sanity tiene límite de storage? (Verificar plan)
2. ¿Las imágenes están referenciadas en Sanity CMS también?
3. ¿Necesitas versionado de assets?
4. ¿Necesitas historia de cambios?

---

## 🏁 CONCLUSIÓN

**Estado actual:** Caótico, con riesgos de pérdida de datos  
**Estado propuesto:** Organizado, durable, escalable  
**Esfuerzo:** ~8-10 horas distribuidas en 2 iteraciones  
**Riesgo:** Bajo (cambios localizados, reversibles)  
**ROI:** Alto (simplifican mantenimiento permanente)

**¿Listo para implementar?** 🚀

