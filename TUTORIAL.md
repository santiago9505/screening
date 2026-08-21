# 🎬 Tutorial Paso a Paso - Configuración API

## ⏱️ Tiempo estimado: 3 minutos

---

## 📍 PASO 1: Registrarse en Finnhub (1 minuto)

### 1.1 Abre tu navegador
Ve a: **https://finnhub.io/register**

### 1.2 Completa el formulario
- Email: Tu correo electrónico
- Password: Una contraseña segura
- First Name: Tu nombre
- Last Name: Tu apellido

### 1.3 Acepta términos y condiciones
☑️ Click en "I agree to the Terms of Service"

### 1.4 Click en "Sign Up"
Espera a que se cree tu cuenta

---

## 📧 PASO 2: Verificar Email (30 segundos)

### 2.1 Abre tu email
Busca un correo de Finnhub

### 2.2 Click en el link de verificación
El email tendrá un botón o link para verificar tu cuenta

### 2.3 Confirma la verificación
Serás redirigido al dashboard de Finnhub

---

## 🔑 PASO 3: Obtener API Key (30 segundos)

### 3.1 En el Dashboard de Finnhub
Verás una sección llamada "Your API Key" o similar

### 3.2 Copia tu API Key
La key se ve algo así:
```
TU_FINNHUB_API_KEY
```

**IMPORTANTE:** 
- ✅ Copia la key COMPLETA
- ✅ NO incluyas espacios
- ✅ Guárdala en un lugar seguro

---

## 💻 PASO 4: Configurar en el Proyecto (1 minuto)

### 4.1 Abre VS Code
Si no está abierto ya

### 4.2 Navega al archivo
Ruta: **`src/services/stockData.ts`**

Puedes abrirlo de dos formas:

**Opción A - Explorador:**
1. Panel izquierdo de VS Code
2. Carpeta `src`
3. Carpeta `services`
4. Archivo `stockData.ts`

**Opción B - Quick Open:**
1. Presiona `Ctrl + P` (Windows) o `Cmd + P` (Mac)
2. Escribe: `stockData.ts`
3. Enter

### 4.3 Localiza la línea correcta
Busca la **línea 9**, que dice:
```typescript
const FINNHUB_API_KEY = 'YOUR_FINNHUB_API_KEY';
```

**Tip:** Usa `Ctrl + G` para ir a una línea específica

### 4.4 Reemplaza el texto
**ANTES:**
```typescript
const FINNHUB_API_KEY = 'YOUR_FINNHUB_API_KEY';
```

**DESPUÉS:** (con TU key)
```typescript
const FINNHUB_API_KEY = 'TU_FINNHUB_API_KEY';
```

**⚠️ IMPORTANTE:**
- ✅ Mantén las comillas simples `'...'`
- ✅ Pega tu key entre las comillas
- ✅ NO borres el punto y coma `;` al final
- ✅ NO agregues espacios

### 4.5 Guarda el archivo
- Windows: `Ctrl + S`
- Mac: `Cmd + S`

---

## ✅ PASO 5: Verificar que Funciona (30 segundos)

### 5.1 La app se recargará automáticamente
El navegador debería refrescar automáticamente

### 5.2 Verifica que carguen datos
Deberías ver:
- ✅ Tabla con acciones (AAPL, MSFT, etc.)
- ✅ Precios actuales
- ✅ Columna RS con números
- ✅ Medias móviles (badges verde/rojo)

### 5.3 ¿No carga?
Revisa la consola del navegador:
1. Presiona `F12`
2. Pestaña "Console"
3. Busca errores en rojo

---

## 🎯 Ejemplo Completo de Configuración

### Antes (stockData.ts):
```typescript
// Finnhub API - Gratuita con 60 llamadas/minuto
// Regístrate en: https://finnhub.io/
const FINNHUB_API_KEY = 'YOUR_FINNHUB_API_KEY'; // ❌ CAMBIAR ESTO
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
```

### Después (stockData.ts):
```typescript
// Finnhub API - Gratuita con 60 llamadas/minuto
// Regístrate en: https://finnhub.io/
const FINNHUB_API_KEY = 'TU_FINNHUB_API_KEY'; // ✅ TU KEY AQUÍ
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
```

---

## 🔍 Verificación Visual

### ✅ Correcto:
```typescript
const FINNHUB_API_KEY = 'abc123xyz';
                        ^         ^
                        |         |
                   comilla    comilla
```

### ❌ Incorrecto:
```typescript
// Sin comillas
const FINNHUB_API_KEY = abc123xyz; // ❌ ERROR

// Con espacios
const FINNHUB_API_KEY = ' abc123xyz '; // ❌ ERROR

// Sin punto y coma
const FINNHUB_API_KEY = 'abc123xyz' // ❌ ERROR

// Comillas dobles (funciona pero inconsistente)
const FINNHUB_API_KEY = "abc123xyz"; // ⚠️ Mejor usar simples
```

---

## 🐛 Troubleshooting

### Problema: "401 Unauthorized"
**Causa:** API key incorrecta
**Soluciones:**
1. Copia la key de nuevo desde Finnhub dashboard
2. Verifica que no tenga espacios extra
3. Confirma que guardaste el archivo (`Ctrl + S`)

### Problema: "Rate limit exceeded"
**Causa:** Demasiadas llamadas
**Solución:** Espera 1 minuto, el caché ayudará

### Problema: No se ve nada
**Causa:** La app no se recargó
**Soluciones:**
1. Refresca el navegador (`F5` o `Ctrl + R`)
2. Verifica que el servidor siga corriendo
3. Revisa la consola (F12) para errores

### Problema: "Cannot find module"
**Causa:** No se guardó el archivo
**Solución:** Guarda (`Ctrl + S`) y espera a que compile

---

## 📱 Checklist Final

Marca cada paso mientras lo completas:

- [ ] ✅ Me registré en Finnhub
- [ ] ✅ Verifiqué mi email
- [ ] ✅ Copié mi API key
- [ ] ✅ Abrí `src/services/stockData.ts`
- [ ] ✅ Encontré la línea 9
- [ ] ✅ Pegué mi API key (con comillas)
- [ ] ✅ Guardé el archivo
- [ ] ✅ La app se recargó
- [ ] ✅ Veo datos de acciones
- [ ] ✅ El screener funciona!

---

## 🎉 ¡Listo!

Si completaste todos los pasos, tu Stock Screener Pro está **100% funcional**.

### Ahora puedes:
- 📊 Ver acciones en tiempo real
- 🔍 Aplicar filtros
- 📈 Analizar fundamentales
- 💼 Crear watchlists
- 🚀 Encontrar las mejores oportunidades

---

## 🔄 Opcional: Alpha Vantage (Fundamentales)

Si quieres datos fundamentales más detallados:

1. Ve a: https://www.alphavantage.co/support/#api-key
2. Solicita tu API key (gratis)
3. Abre `src/services/stockData.ts`
4. Línea 13: Reemplaza `'demo'` con tu key
5. Guarda

**Nota:** Esto es **opcional**. El screener funciona sin esto.

---

## 💡 Tip Extra

### Guarda tu API key de forma segura
1. Crea un archivo de texto
2. Nómbralo: `mis-api-keys.txt`
3. Guarda:
   ```
   Finnhub: TU_FINNHUB_API_KEY
   Alpha Vantage: ABC123XYZ
   ```
4. Guárdalo en un lugar seguro

**⚠️ NO lo subas a GitHub ni lo compartas públicamente**

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas:
1. Lee el archivo `README.md`
2. Revisa `API_SETUP.md` para más detalles
3. Consulta la documentación de Finnhub: https://finnhub.io/docs/api

---

**¡Feliz Trading! 📈🚀**
