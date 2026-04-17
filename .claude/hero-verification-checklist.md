# Hero: Verificación Fuerte - Checklist

**Fecha:** 2026-04-13  
**Objetivo:** Confirmar que cada elemento del Hero se materializa correctamente

---

## Pre-requisitos para Verificación

### Build Status
```bash
npm run build
```
✅ **Resultado esperado:** `Compiled successfully`, 0 TypeScript errors

### Dev Server
```bash
npm run dev
```
✅ **Resultado esperado:** Server running on localhost:3000

### Acceso a Páginas
- ✅ `http://localhost:3000/editor` - Editor con visual controls
- ✅ `http://localhost:3000/` - Pública (sin editor context)

---

## Verificación 1: hero-logo

### En Editor
1. Ir a `/editor`
2. Seleccionar hero-logo (click en el logo)
3. Popup abre con controles
4. **Cambio extremo:** Mover logo mucho a la derecha (x = +200)
5. **Cambio extremo:** Aumentar escala a 2.0x
6. Verificar que logo se ve claramente movido en editor

### Deploy
1. Click en "Deploy" / "Save"
2. Esperar confirmación

### En Pública
1. Ir a `/` (refrescar navegador)
2. **Verificar visualmente:**
   - ✅ Logo está movido a la derecha (no en posición default)
   - ✅ Logo está escalado 2.0x (más grande que default)
   - ❌ Si logo sigue en posición default → **FIX NEEDED**

### Log Debug (Opcional)
Abrir DevTools → Console
```
[HERO-TRACE] HeroSection received: {
  elementStyles: [...],
  "hero-logo": { x: 200, y: ..., width: ..., height: ..., scale: 2.0 }
}
```

---

## Verificación 2: hero-title-main

### En Editor
1. Ir a `/editor`
2. Seleccionar hero-title (click en el title grande)
3. Popup abre
4. **Cambio extremo:** Cambiar color a rojo (#ff0000)
5. **Cambio extremo:** Cambiar font weight a 900 (ultra bold)
6. Verificar cambios visibles en editor

### Deploy
1. Click "Deploy"
2. Esperar

### En Pública
1. Ir a `/` (refrescar)
2. **Verificar visualmente:**
   - ✅ Título es ROJO (no blanco/default)
   - ✅ Título es MÁS BOLD (peso 900, no 600)
   - ❌ Si sigue blanco/normal → **FIX NEEDED**

---

## Verificación 3: hero-title-accent

### En Editor
1. Ir a `/editor`
2. Seleccionar hero-title (mismo elemento)
3. **Cambio extremo:** Cambiar accent color a cyan (#00ffff)
4. Verificar cambio visible en editor

### Deploy
1. Click "Deploy"

### En Pública
1. Ir a `/` (refrescar)
2. **Verificar visualmente:**
   - ✅ Accent text es CYAN (no orange/default)
   - ❌ Si sigue orange/default → **FIX NEEDED**

---

## Verificación 4: hero-subtitle

### En Editor
1. Ir a `/editor`
2. Seleccionar hero-subtitle (click en "LIVE ATMOSPHERE")
3. Popup abre
4. **Cambio contenido:** Cambiar texto a "TEST SUBTITLE"
5. **Cambio extremo:** Cambiar color a green (#00ff00)
6. **Cambio extremo:** Aumentar font size a 40px (muy grande)
7. Verificar cambios en editor

### Deploy
1. Click "Deploy"

### En Pública
1. Ir a `/` (refrescar)
2. **Verificar visualmente:**
   - ✅ Texto cambió a "TEST SUBTITLE"
   - ✅ Texto es VERDE (no orange/default)
   - ✅ Texto es MÁS GRANDE (40px)
   - ❌ Si no cambió → **FIX NEEDED**

---

## Verificación 5: hero-scroll-indicator

### En Editor
1. Ir a `/editor`
2. Seleccionar hero-scroll-indicator (abajo, "SCROLL" text)
3. Popup abre
4. **Cambio contenido:** Cambiar texto a "SWIPE DOWN"
5. **Cambio extremo:** Mover arriba mucho (y = -200)
6. Verificar cambios en editor

### Deploy
1. Click "Deploy"

### En Pública
1. Ir a `/` (refrescar)
2. **Verificar visualmente:**
   - ✅ Texto cambió a "SWIPE DOWN" (no "SCROLL")
   - ✅ Scroll indicator está arriba (no abajo)
   - ❌ Si sigue abajo/SCROLL → **FIX NEEDED**

---

## Verificación 6: hero-bg-image Geometry

### En Editor
1. Ir a `/editor`
2. Seleccionar hero-bg-image (click en background)
3. Popup abre
4. **Cambio extremo:** Mover background a la derecha (x = +300)
5. **Cambio extremo:** Aumentar scale a 1.5x
6. Verificar cambios en editor

### Deploy
1. Click "Deploy"

### En Pública
1. Ir a `/` (refrescar)
2. **Verificar visualmente:**
   - ✅ Background está desplazado (no centrado)
   - ✅ Background está escalado (más grande)
   - ❌ Si sigue centrado/normal → **FIX NEEDED**

### Nota: Filters
- Si aplicas contrast/saturation/brightness en editor, deberían aplicarse
- ✅ Esto ya está implementado

---

## Verificación 7: Consistencia Total

### Cambios Múltiples a la Vez
1. En editor: Cambiar logo + title + subtitle + scroll simultaneously
2. Deploy todo junto
3. En `/` refrescar
4. **Verificar:** Todos los cambios aparecen juntos, no parcialmente

---

## Verificación 8: Persistencia entre Sesiones

### Sesión 1: Hacer cambios y deploy
1. Logo: mover + escalar
2. Title: color rojo
3. Deploy

### Sesión 2: Cerrar y abrir browser
1. Cerrar navegador completamente
2. Esperar 30 segundos
3. Abrir navegador nueva sesión
4. Ir a `/`
5. **Verificar:** Los cambios AÚN están presentes (no desaparecieron)

---

## Logs Esperados en Consola (Dev Tools)

### En `/editor` durante visual edit
```
[HERO-TRACE] HeroSection received: {
  elementStyles: ["hero-logo", "hero-title", "hero-title-main", ...],
  "hero-logo": { x: 200, y: 90, ... },
  "hero-title": { ... }
}
```

### En deploy response
```json
{
  "persistedFields": ["title", "titleHighlight", "hero.elementStyles"],
  "persistedNodes": ["hero-logo", "hero-title", "hero-subtitle", "hero-scroll-indicator", ...],
  "elementStyles": {
    "sent": 6,
    "read": 6,
    "nodeIds": ["hero-logo", "hero-title", ...]
  }
}
```

### En `/` pública
```
[HERO-TRACE] HeroSection received: {
  elementStyles: ["hero-logo", "hero-title", ...],
  "hero-logo": { x: 200, ... }  // ← Los cambios están aquí
}
```

---

## Checklist de Éxito

Para pasar esta verificación, todos estos deben cumplirse:

- [ ] hero-logo aparece movido + escalado en pública
- [ ] hero-title-main aparece con color editado en pública
- [ ] hero-title-accent aparece con color editado en pública
- [ ] hero-subtitle aparece con texto editado + color editado en pública
- [ ] hero-scroll-indicator aparece con texto editado + posición editada en pública
- [ ] hero-bg-image aparece con geometry editado en pública
- [ ] Múltiples cambios juntos aparecen todos en pública
- [ ] Los cambios persisten entre sesiones de navegador
- [ ] Build pasa sin errores
- [ ] Deploy response reporta persistencia correctamente

---

## En Caso de Fallo

Si algún elemento no aparece con cambios en pública:

### Paso 1: Revisar Sanity directamente
```javascript
// En console del navegador
fetch('https://qtpb6qpz.api.sanity.io/v2024-01-01/data/query/production?query=*[_type=="heroSection"][0]{elementStyles}')
  .then(r => r.json())
  .then(r => console.log(r.result[0]?.elementStyles))
```

Si `elementStyles` está vacío:
- ❌ Problem in deploy/save
- ✅ Check editor-deploy logs

Si `elementStyles` tiene los datos:
- ❌ Problem in loader o component
- ✅ Check hero-loader.ts, HeroSection rendering

### Paso 2: Revisar que loader devuelve datos
En `/editor` console:
```javascript
// Add temporary console.log in hero-loader or check Network tab
// Verify that HeroData.elementStyles has data
```

### Paso 3: Revisar que componente los aplica
En `/` console:
```javascript
// The [HERO-TRACE] logs should show the data received
// If elementStyles is empty, problem is in loader
// If elementStyles has data but not applied, problem is in HeroSection style application
```

---

## Deploy Rollback (si es necesario)

Si los cambios aparecen pero incorrectamente:

1. No hay rollback automático
2. Manual: Volver a editor, revertir cambios, deploy limpio
3. O: Ir a Sanity studio, editar heroSection.elementStyles manualmente

---
