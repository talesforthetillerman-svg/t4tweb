# Configuración de Propagación Pública

## Problema Actual
El deploy del editor funciona correctamente (persiste cambios en Sanity), pero la **pública no se actualiza automáticamente** después del deploy.

## Variables de Entorno Requeridas

### 1. VERCEL_DEPLOY_HOOK (RECOMENDADO)
**Propósito:** Dispara un nuevo deploy en Vercel después de cada cambio en el editor.

**Cómo configurar:**
1. Ve a tu proyecto en Vercel
2. Settings → Git → Deploy Hooks
3. Crea un nuevo deploy hook (ej: "editor-deploy")
4. Copia la URL generada
5. Agrega a `.env.local`:
   ```
   VERCEL_DEPLOY_HOOK=https://api.vercel.com/v1/integrations/deploy/...
   ```

**Ventajas:**
- Garantiza que la pública muestre los cambios más recientes
- Reconstruye la aplicación completa
- Limpia cachés de CDN

### 2. EDITOR_DEPLOY_PUBLIC_REVALIDATE_URL (ALTERNATIVA)
**Propósito:** Revalida solo la página `/` sin hacer deploy completo.

**Cómo configurar:**
1. Crea una API route en la pública que acepte revalidación
2. Agrega a `.env.local`:
   ```
   EDITOR_DEPLOY_PUBLIC_REVALIDATE_URL=https://tusitio.com/api/revalidate
   EDITOR_DEPLOY_PUBLIC_REVALIDATE_SECRET=tu-secreto
   ```

**Ventajas:**
- Más rápido que un deploy completo
- Menos consumo de recursos

## Estado Actual
```
✅ Hero ya NO está en homeEditorState (filtrado correctamente)
✅ Hero tiene UNA sola fuente de verdad (heroSection document)
✅ Applier/rehydration NO pisa Hero (excluido en HomeEditorOverridesProvider)
❌ VERCEL_DEPLOY_HOOK no configurado → pública no se actualiza automáticamente
```

## Consecuencias
Sin `VERCEL_DEPLOY_HOOK` configurado:
1. Los cambios **SÍ** se persisten en Sanity
2. La pública **NO** se actualiza automáticamente
3. Los usuarios ven contenido **stale** hasta el próximo deploy manual
4. El editor muestra "deploy successful" pero la pública sigue mostrando versión anterior

## Solución Inmediata
1. Configurar `VERCEL_DEPLOY_HOOK` en `.env.local`
2. Hacer un cambio de prueba en el editor
3. Verificar que la pública se actualice automáticamente

## Verificación
Después de configurar `VERCEL_DEPLOY_HOOK`:
- El deploy dejará de ser `partial`
- `publicPropagationConfigured: true`
- `vercelDeployHookConfigured: true`
- La pública se actualizará inmediatamente después del deploy