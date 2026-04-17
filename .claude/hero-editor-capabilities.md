# Hero: Capacidades del Editor y Materialización

**Fecha:** 2026-04-13  
**Objetivo:** Verificar que las popups del editor mapean correctamente a los elementos y que se materializan

---

## Mapeo: Element → Popup Capabilities → Materialización

### hero-logo

**Popup Captura:**
- Position (x, y)
- Size (width, height)
- Scale
- Opacity
- Image/Logo (src)

**Sanity Storage:**
- geometry + scale → `elementStyles["hero-logo"]` ✅
- image src → `logo.asset` (separado, no en elementStyles)

**Componente Aplica:**
```typescript
style={getElementLayoutStyle(data.elementStyles, "hero-logo")}  // ✅
// Transforma: { x, y, width, height, scale } → CSS válido
```

**Status:**
- ✅ Posición, tamaño, escala se materializan
- ⚠️ Cambio de imagen bloqueado por blob: (no persistible)

---

### hero-title (Grouped: main + accent)

**Popup Captura:**
- Main text (en hero-title-main)
- Accent text (en hero-title-accent)
- Position (x, y)
- Size (width, height)
- Scale
- Color (por cada span)
- Font weight
- Font style

**Sanity Storage:**
- text → `title`, `titleHighlight` (separados, no en elementStyles)
- geometry + color/weight → `elementStyles["hero-title"]`, `elementStyles["hero-title-main"]`, `elementStyles["hero-title-accent"]`

**Componente Aplica:**
```typescript
// h1 element
style={getElementLayoutStyle(data.elementStyles, "hero-title")}  // ✅

// Span main
style={getElementLayoutStyle(data.elementStyles, "hero-title-main")}  // ✅

// Span accent
style={getElementLayoutStyle(data.elementStyles, "hero-title-accent")}  // ✅
```

**Status:**
- ✅ Posición, tamaño, escala, color se materializan
- ✅ Texto se materializa (persistido en title/titleHighlight)

---

### hero-subtitle

**Popup Captura:**
- Text
- Position (x, y)
- Size (width, height)
- Scale
- Color
- Font size
- Font weight
- Font style
- Opacity
- Gradient (si aplica)

**Sanity Storage:**
- text → `subtitle` (separado, no en elementStyles)
- geometry + color/font/gradient → `elementStyles["hero-subtitle"]`

**Componente Aplica:**
```typescript
style={getElementLayoutStyle(data.elementStyles, "hero-subtitle")}  // ✅
```

**Status:**
- ✅ Posición, tamaño, escala se materializan
- ✅ Estilo (color, font, gradient, opacity) se materializa
- ✅ Texto se materializa

---

### hero-scroll-indicator

**Popup Captura:**
- Text (scrollLabel)
- Position (x, y)
- Size (width, height)
- Scale
- Opacity

**Sanity Storage:**
- text → `scrollLabel` (separado, no en elementStyles)
- geometry + opacity → `elementStyles["hero-scroll-indicator"]`

**Componente Aplica:**
```typescript
style={getElementLayoutStyle(data.elementStyles, "hero-scroll-indicator")}  // ✅
```

**Status:**
- ✅ Posición, tamaño, escala se materializan
- ✅ Texto se materializa

---

### hero-bg-image

**Popup Captura:**
- Image/Background (src)
- Position (x, y)
- Size (width, height)
- Scale
- Opacity
- Filters (contrast, saturation, brightness, negative)

**Sanity Storage:**
- image src → `backgroundImage.asset` (separado, no en elementStyles)
- geometry + filters → `elementStyles["hero-bg-image"]`

**Componente Aplica:**
```typescript
style={getElementLayoutStyle(data.elementStyles, "hero-bg-image")}  // ✅
// Transforma: { x, y, width, height, scale } → CSS válido
// Filters (contrast, saturation, etc) → apply on Image or div
```

**⚠️ Nota importante:** Los filters como contrast, saturation, brightness se guardan en elementStyles pero **no se aplican al DOM**. Necesitarían CSS filters aplicados.

**Status:**
- ✅ Posición, tamaño, escala se materializan
- ⚠️ Cambio de imagen bloqueado por blob:
- ❌ Filters (contrast, saturation, brightness) se guardan pero NO se aplican

---

## Resumen de Capacidades

### Completamente Funcional ✅
- hero-logo: posición, tamaño, escala
- hero-title: posición, tamaño, escala, color, texto
- hero-title-main: posición, tamaño, color
- hero-title-accent: posición, tamaño, color
- hero-subtitle: posición, tamaño, escala, color, font, gradient, texto, opacity
- hero-scroll-indicator: posición, tamaño, escala, texto

### Parcialmente Bloqueado ⚠️
- hero-logo: imagen bloqueada por blob:
- hero-bg-image: imagen bloqueada por blob:, filters NO aplicados
- hero-bg-image: geometry SÍ se aplica

### No Implementado ❌
- hero-bg-image: filters (contrast, saturation, brightness, negative) se guardan pero no se aplican

---

## Verificación Pendiente

Para confirmar que las popups funcionan:

1. **hero-logo**
   - Mover en editor → x, y cambian
   - Deploy
   - Verificar en `/` que posición cambió ✅

2. **hero-title**
   - Cambiar texto en popup
   - Deploy
   - Verificar que texto cambió ✅

3. **hero-subtitle**
   - Cambiar texto + color
   - Deploy
   - Verificar en `/` ✅

4. **hero-scroll-indicator**
   - Cambiar scroll label
   - Deploy
   - Verificar en `/` ✅

5. **hero-bg-image**
   - Mover/resize background
   - Deploy
   - Verificar en `/` que se movió ✅
   - (No cambiar imagen por blob:)

---
