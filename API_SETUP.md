# 🔑 Configuración de API Keys

Para que el Stock Screener funcione, necesitas obtener API keys gratuitas.

## 1. Finnhub API (OBLIGATORIO) - Datos de Precios

### ¿Por qué Finnhub?
- ✅ Completamente GRATUITO
- ✅ 60 llamadas por minuto (suficiente para el screener)
- ✅ Datos de precios en tiempo real (delay de 15 min para plan gratis)
- ✅ Sin necesidad de tarjeta de crédito

### Pasos para obtener tu API Key:

1. **Registrarse**
   - Ve a: https://finnhub.io/register
   - Completa el formulario de registro
   - Verifica tu email

2. **Obtener la API Key**
   - Inicia sesión en https://finnhub.io/dashboard
   - Tu API key aparecerá inmediatamente en el dashboard
   - Copia la key (se verá algo así: `c123abc456def789`)

3. **Configurar en el proyecto**
   - Abre el archivo: `src/services/stockData.ts`
   - Encuentra la línea: `const FINNHUB_API_KEY = 'YOUR_FINNHUB_API_KEY';`
   - Reemplaza `'YOUR_FINNHUB_API_KEY'` con tu key (mantén las comillas)
   - Ejemplo: `const FINNHUB_API_KEY = 'c123abc456def789';`

## 2. Alpha Vantage API (OPCIONAL) - Datos Fundamentales

### ¿Por qué Alpha Vantage?
- ✅ GRATUITO
- ✅ Datos fundamentales (EPS, Revenue)
- ⚠️ Limitado a 5 llamadas/minuto y 500/día
- ℹ️ Si no la configuras, el screener funcionará pero sin datos fundamentales detallados

### Pasos para obtener tu API Key:

1. **Solicitar Key**
   - Ve a: https://www.alphavantage.co/support/#api-key
   - Ingresa tu email
   - Acepta los términos

2. **Verificar Email**
   - Revisa tu correo (puede tardar unos minutos)
   - Copia la API key del email

3. **Configurar en el proyecto**
   - Abre el archivo: `src/services/stockData.ts`
   - Encuentra la línea: `const ALPHA_VANTAGE_API_KEY = 'demo';`
   - Reemplaza `'demo'` con tu key
   - Ejemplo: `const ALPHA_VANTAGE_API_KEY = 'ABC123XYZ';`

## 3. Verificar la Configuración

Una vez configuradas las keys:

```bash
npm run dev
```

Si todo está correcto:
- ✅ La aplicación se abrirá en http://localhost:3000
- ✅ Verás datos de acciones cargándose
- ✅ El banner amarillo desaparecerá después de configurar

Si ves errores:
- ❌ Verifica que copiaste las keys correctamente
- ❌ Asegúrate de mantener las comillas simples
- ❌ No dejes espacios extra antes o después de la key

## 💡 Ejemplo Completo

```typescript
// ANTES (src/services/stockData.ts)
const FINNHUB_API_KEY = 'YOUR_FINNHUB_API_KEY';
const ALPHA_VANTAGE_API_KEY = 'demo';

// DESPUÉS (con tus keys)
const FINNHUB_API_KEY = 'TU_FINNHUB_API_KEY';
const ALPHA_VANTAGE_API_KEY = 'TU_ALPHA_VANTAGE_API_KEY';
```

## 🆘 Problemas Comunes

### "API returns 401 Unauthorized"
- La key está incorrecta o mal formateada
- Copia la key de nuevo desde el dashboard
- Verifica que no haya espacios extra

### "Rate limit exceeded"
- Finnhub gratis: máximo 60 llamadas/minuto
- Alpha Vantage gratis: máximo 5 llamadas/minuto
- Solución: Espera un minuto y recarga la página

### "No data loaded"
- Verifica tu conexión a internet
- Confirma que las APIs están funcionando visitando sus dashboards
- Revisa la consola del navegador (F12) para más detalles

## 📊 Límites del Plan Gratuito

| Proveedor | Llamadas/Min | Llamadas/Día | Delay |
|-----------|--------------|--------------|-------|
| Finnhub   | 60           | Ilimitado    | 15min |
| Alpha Vantage | 5       | 500          | Tiempo real |

**Nota**: Para swing trading (análisis nocturno), estos límites son más que suficientes.

## 🚀 ¿Listo para Empezar?

1. ✅ Obtén tu Finnhub API key
2. ✅ (Opcional) Obtén tu Alpha Vantage key
3. ✅ Configura las keys en `src/services/stockData.ts`
4. ✅ Ejecuta `npm run dev`
5. ✅ ¡Empieza a hacer screening!

---

**¿Necesitas ayuda?** Abre un issue en el proyecto o revisa la documentación oficial:
- Finnhub Docs: https://finnhub.io/docs/api
- Alpha Vantage Docs: https://www.alphavantage.co/documentation/
