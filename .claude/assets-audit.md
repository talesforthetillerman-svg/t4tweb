# 📸 AUDITORÍA FASE 1: Assets de T4T

**Fecha:** 2026-04-13  
**Estado:** Inventario completo sin acciones destructivas

---

## 1. ESTADÍSTICAS GENERALES

- **Total de imágenes/assets:** 62 archivos
- **Espacio total:** ~88 MB en `/public/images/`
- **Distribución:**
  - `t4tPics/`: 50 MB (problemas de tamaño)
  - `sections/`: 23 MB
  - `members/`: 4.2 MB
  - `backup/`: 932 KB
  - Raíz y otros: ~10 MB

---

## 2. DUPLICADOS EXACTOS DETECTADOS

### Grupo 1: Logo (2 archivos idénticos)
- ❌ `public/images/logo-original.png` (hash: 00e31...)
- ❌ `public/images/logo-transparent.png` (hash: 00e31...)
- **Acción propuesta:** Mantener `logo-transparent.png`, eliminar `logo-original.png`

### Grupo 2: 6yU30gorda (2 ubicaciones)
- ❌ `public/images/sections/6yU30gorda.jpg` (344 KB)
- ❌ `public/images/t4tPics/6yU30gorda.jpg` (344 KB)
- **Acción propuesta:** Mantener en `sections/`, eliminar de `t4tPics/`

### Grupo 3: Janosch Puhe (2 nombres)
- ❌ `public/images/members/Janosch Puhe2.JPG`
- ❌ `public/images/t4t-janosch.jpg`
- **Acción propuesta:** Mantener en `members/` con nombre consistente, eliminar variante

### Grupo 4: Logo (backup = root)
- ❌ `public/images/backup/logo.jpg`
- ❌ `public/images/logo.jpg`
- **Acción propuesta:** Mantener `logo.jpg` en root, eliminar backup

### Grupo 5: Band Photos (GRAN DUPLICACIÓN)
**Hash: 56c2a...** - 5 archivos idénticos (~1.5 MB cada)
- ❌ `public/images/about-section.jpg`
- ❌ `public/images/backup/band-live.jpg`
- ❌ `public/images/band-group.jpg`
- ❌ `public/images/t4t-2.jpg`
- ❌ `public/images/t4t-wave2.jpg`
- **Mejor versión:** Mantener en `sections/` (claridad de propósito)
- **Acción:** Eliminar 4 duplicados

**Hash: 5f450...** - 6 archivos idénticos (~2 MB cada)
- ❌ `public/images/backup/band-collage.jpg`
- ❌ `public/images/band-hero.jpg`
- ❌ `public/images/band-live.jpg`
- ❌ `public/images/band-section.jpg`
- ❌ `public/images/sections/hero-bg.jpg`
- ❌ `public/images/t4t-3.jpg`
- ❌ `public/images/t4tPics/hero-bg.jpg`
- **Mejor versión:** Mantener como `hero-bg.jpg` (nombre claro)
- **Acción:** Consolidar, eliminar 6 duplicados

**Hash: 65d6b...** - 5 archivos idénticos (~2 MB cada)
- ❌ `public/images/about-bg-main.jpg`
- ❌ `public/images/about-section-bg.jpg`
- ❌ `public/images/backup/band-group.jpg`
- ❌ `public/images/t4t-1.jpg`
- ❌ `public/images/t4t-wave1.jpg`
- **Mejor versión:** Mantener como `about-bg.jpg`
- **Acción:** Consolidar, eliminar 4 duplicados

### Grupo 6: DSC_4710.JPG (fotografía de evento)
- ❌ `public/images/DSC_4710.JPG` (7.8 MB)
- ❌ `public/images/live-section.jpg` (7.8 MB - mismo archivo)
- ❌ `public/images/sections/DSC_4710.JPG` (7.8 MB)
- **Acción propuesta:** Mantener en `sections/` como `live-section.jpg`, eliminar duplicados

### Grupo 7: Band Members (individual photos)
- `public/images/members/Janosch Puhe2.JPG` = `t4t-janosch.jpg`
- `public/images/members/J.Ma Garcia Lopez2.JPG` = `t4t-jma.jpg`
- `public/images/members/Tarik Benatmane.JPG` = `t4t-tarik.jpg`
- `public/images/members/Robii Crowford.JPG` = `t4t-robii.jpg`
- **Acción:** Mantener en `members/`, eliminar variantes en raíz

### Grupo 8: Manager & Press
- ❌ `public/images/Momo Garcia Manager.png` = `public/images/press-section.png`
- **Acción:** Consolidar, mantener como `manager.png`

---

## 3. PROBLEMAS CRÍTICOS

### 🔴 GIF Enormes en t4tPics
| Archivo | Tamaño | Problema |
|---------|--------|----------|
| `hero-bg-ezgif.com-resize.gif` | **33 MB** | ❌ INACEPTABLE - No es un GIF eficiente |
| `banner-crop.gif` | 3.2 MB | ⚠️ Muy pesado para una imagen de banner |
| `banner-crop-ezgif.com-gif-maker.gif` | 1.4 MB | ⚠️ Convertir a video (MP4) o webp animado |

**Recomendación:** Los GIF deben reemplazarse:
- Opción 1: Convertir a MP4 (mucho más eficiente)
- Opción 2: Usar WebP animado
- Opción 3: Usar JPEG estático + lazy loading

**Video detectado:**
- `public/images/t4tPics/Tales for the Tillerman Teaser.mp4` (9.8 MB)
- ⚠️ ¿Se usa actualmente? ¿Dónde?

---

## 4. ESTRUCTURA DESORDENADA

### Problemas actuales:
1. **Múltiples nombrados de convención:**
   - `t4t-*.jpg` (genérico, no descriptivo)
   - `*-bg.jpg` (pero en múltiples directorios)
   - `band-*.jpg` vs `*-section.jpg`

2. **Falta de metadatos:**
   - Sin tags/categorías
   - Sin información de uso
   - Sin versionado

3. **Directorios redundantes:**
   - `backup/` (¿por qué? ¿se limpia alguna vez?)
   - `t4tPics/` (debería ser `original/` o similar)
   - Imágenes esparcidas en raíz

---

## 5. REFERENCIAS EN EL CÓDIGO

### Hallazgos:
- **hero-loader.ts:**
  ```
  logoUrl: "/images/t4tPics/logo-white.png"
  bgUrl: "/images/t4tPics/hero-bg.jpg"
  ```

- **intro-banner-loader.ts:**
  ```
  DEFAULT_INTRO_GIF_URL = "/images/t4tPics/banner-crop-ezgif.com-gif-maker.gif"
  ```

- **Components:** Imágenes en Sanity (necesitan auditoría en CMS)

---

## 6. PLAN CONSOLIDADO

### ✅ ACTIVOS A CONSERVAR (mejores versiones)

```
public/assets/t4t/
├── core/
│   ├── logo-white.png (500 KB) ← de t4tPics
│   ├── logo-transparent.png (ELIMINAR - duplicado)
│   ├── logo-qr.png (para descargas)
│   └── logo.jpg (ELIMINAR - duplicado de logo.jpg en root)
│
├── sections/
│   ├── hero-bg.jpg (192 KB JPG) ← REEMPLAZAR hero-bg.gif 33MB
│   ├── about-bg.jpg (reutilizar foto existente)
│   ├── band-section.jpg (reutilizar)
│   ├── live-section.jpg (7.8 MB - DSC_4710.JPG)
│   ├── press-bg.jpg (reutilizar)
│   └── contact-bg.jpg (reutilizar)
│
├── members/
│   ├── janosch-puhe.jpg
│   ├── jma-garcia-lopez.jpg
│   ├── otto-lorenz-contreras.jpg
│   ├── robii-crowford.jpg
│   └── tarik-benatmane.jpg
│
├── ui/
│   ├── icon-light.png
│   ├── icon-dark.png
│   ├── apple-icon.png
│   └── placeholder.jpg
│
└── media/
    ├── teaser-video.mp4 (¿se usa?)
    ├── banner-animated.webp (convertir de GIF 3.2MB)
    └── hero-bg-animated.webp (convertir si es necesario)
```

---

## 7. DUPLICADOS A ELIMINAR (con confianza)

**Fase 1 - Eliminar sin riesgo:**
1. `logo-original.png` (dup de logo-transparent)
2. `backup/logo.jpg` (dup de logo.jpg)
3. `backup/band-collage.jpg` (6 dupes del mismo)
4. `backup/band-group.jpg` (6 dupes del mismo)
5. `backup/band-hero.jpg` (dup de band-section.jpg)
6. `backup/band-live.jpg` (dup de about-section.jpg)
7. `t4t-1.jpg` (dup de about-bg-main.jpg)
8. `t4t-2.jpg` (dup de band-group.jpg)
9. `t4t-3.jpg` (dup de band-section.jpg)
10. `t4t-4.jpg` (dup de band-collage.jpg)
11. `t4t-janosch.jpg` (dup en members/)
12. `t4t-jma.jpg` (dup en members/)
13. `t4t-robii.jpg` (dup en members/)
14. `t4t-tarik.jpg` (dup en members/)
15. `t4t-wave1.jpg` (dup de about-bg-main)
16. `t4t-wave2.jpg` (dup de band-group)
17. `band-group.jpg` (mover a sections/)
18. `band-hero.jpg` (mover a sections/)
19. `band-live.jpg` (mover a sections/)
20. `band-collage.jpg` (mover a sections/)
21. `t4tPics/6yU30gorda.jpg` (dup en sections/)
22. `t4tPics/hero-bg.jpg` (mover a sections/)
23. `Momo Garcia Manager.png` (dup de press-section.png)
24. `DSC_4710.JPG` (dup en sections/)

**Fase 2 - Requiere evaluación:**
1. `hero-bg-ezgif.com-resize.gif` (33 MB) → ¿Se usa? Reemplazar con JPG
2. `banner-crop.gif` (3.2 MB) → ¿Se usa? Convertir a WebP o MP4
3. `banner-crop-ezgif.com-gif-maker.gif` (1.4 MB) → ¿Se usa? Consolidar con banner-crop.gif

---

## 8. PENDIENTE: AUDITORÍA EN SANITY

❓ **Necesita investigación:**
- ¿Qué imágenes están en Sanity CMS?
- ¿Hay blob: URLs guardadas en homeEditorState?
- ¿Qué referencias de imágenes existen en documentos publicados?

---

## 📋 RESUMEN EJECUTIVO

| Métrica | Valor |
|---------|-------|
| **Archivos duplicados exactos** | 23-25 archivos |
| **Espacio recuperable** | ~35-40 MB |
| **Directorios desordenados** | 5 (root, backup, t4tPics, sections, members) |
| **GIFs problemáticos** | 3 (totalizando ~37 MB) |
| **Convención de nombrado** | ❌ Inconsistente |
| **Metadatos** | ❌ Sin estructura |

