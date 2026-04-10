# CHANGELOG - t4tweb-1 Ediciones Confirmadas

## ✅ EDICIONES ACTIVAS (NO REMOVER)

### NAVBAR (navigation.tsx)
- [x] Espaciado homogéneo entre elementos con `flex justify-between`
- [x] Botones con gradiente naranja #FF8C21
- [x] Gap uniforme `gap-3 lg:gap-4`
- [x] Sombras naranja en hover
- [x] Logo 80x80 px
- [x] Mobile menu responsive

### HERO SECTION (hero-section.tsx)
- [x] Logo: 336x336 px (aumentado 20%)
- [x] Logo: Posicionado 10% más abajo (`pt-8 md:pt-12`)
- [x] Logo: Aparece 100% opaco sin scroll inicial
- [x] Logo: Parallax lento comienza exactamente con scroll
- [x] Logo: Desciende 250px total durante scroll
- [x] Logo: Desaparece junto a botones con `buttonsOpacity`
- [x] Botones: Desaparecen con logo (`buttonsOpacity` transform)
- [x] Botones: Gradiente naranja #FF8C21 multi-color
- [x] Botones: Sombras dinámicas en hover
- [x] Texto: Posicionado 20% más abajo (`pb-32 md:pb-48`)
- [x] Fondo: Imagen subida 20% más (`objectPosition: "center -25%"`)
- [x] Fondo: Full-width sin huecos negros
- [x] Fade transition bottom: 40px altura

### QUICK ACTIONS (quick-actions-section.tsx)
- [x] Espaciado compacto: `gap-2 md:gap-3`
- [x] Botones con colores originales (verde, azul, púrpura, rosa)
- [x] Altura reducida: `py-8 md:py-10`
- [x] Padding compacto: `p-4 md:p-5`

### GLOBALS & STYLING (globals.css)
- [x] Color primario: #FF8C21 (33 100% 56%)
- [x] Sombras naranja en botones
- [x] Body: `overflow-x: clip` en lugar de `hidden`
- [x] Full-width backgrounds sin limitaciones

### LAYOUT (scene-section.tsx)
- [x] Sin `max-w-6xl` limiting
- [x] Full-width content: `w-full` solo
- [x] `overflow-hidden` para backgrounds

### SEO & METADATA
- [x] JSON-LD Schema MusicGroup
- [x] JSON-LD Schema Organization
- [x] Open Graph completo
- [x] Twitter Cards
- [x] robots.txt
- [x] sitemap.xml

## ⚠️ REGLAS PARA FUTURAS EDICIONES

1. **SIEMPRE leer el archivo completo antes de editar**
2. **NO usar write_file a menos que sea una reescritura completa justificada**
3. **USAR edit_file para cambios puntuales** para NO perder el resto
4. **Documentar cada cambio aquí** antes de implementar
5. **Verificar cambios con `read_file` DESPUÉS de cada edición**
6. **Si falta algo, RESTAURAR inmediatamente**

## 🔄 PASOS ANTES DE CADA EDICIÓN

1. `read_file` → Revisar contenido actual
2. `edit_file` O `write_file` → Hacer cambio específico
3. `npm run build` → Verificar no hay errores
4. Visitar http://localhost:3000 → Verificar visualmente
5. Documentar aquí los cambios realizados
