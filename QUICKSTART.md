# Quick Start Guide - Stock Screener Pro

## 🚀 Inicio Rápido (5 minutos)

### Paso 1: Instalar Dependencias
```bash
npm install
```
✅ Ya completado!

### Paso 2: Obtener API Key de Finnhub (2 minutos)
1. Abre: https://finnhub.io/register
2. Crea cuenta (email + contraseña)
3. Verifica tu email
4. Copia tu API key del dashboard

### Paso 3: Configurar la API Key
Abre el archivo: **src/services/stockData.ts**

Busca la línea 9:
```typescript
const FINNHUB_API_KEY = 'YOUR_FINNHUB_API_KEY';
```

Reemplaza con tu key:
```typescript
const FINNHUB_API_KEY = 'tu_key_aqui';
```

### Paso 4: ¡Iniciar!
```bash
npm run dev
```

La aplicación se abrirá en: http://localhost:3000

---

## 📱 ¿Qué puedes hacer?

### Buscar y Filtrar Acciones
- 🔍 Busca por símbolo o nombre
- 📊 Filtra por precio, volumen, market cap
- 📈 Filtra por medias móviles (SMA 20/50/200)
- 💪 Filtra por Relative Strength (RS)

### Crear Watchlists
1. Haz clic en "Nueva Lista"
2. Dale un nombre
3. Haz clic en el ícono + junto a cualquier acción

### Ver Fundamentales
- Haz clic en cualquier fila de acción
- Verás EPS, Ventas y Márgenes trimestrales
- Análisis de crecimiento automático

### Interpretar el Relative Strength (RS)
- 🟢 80-100: ¡Súper fuerte! Supera al mercado
- 🔵 60-79: Fuerte, buen rendimiento
- 🟡 40-59: Neutral
- 🔴 0-39: Débil, bajo rendimiento

### Medias Móviles
- ✅ Verde = Precio sobre la media (alcista)
- ❌ Rojo = Precio bajo la media (bajista)

---

## 🎯 Flujo de Trabajo Recomendado (Swing Trading)

### Noche/Fin de Semana:
1. **Filtrar por RS alto** (> 80)
2. **Verificar medias móviles** (precio sobre SMA 20 y 50)
3. **Revisar fundamentales** (EPS growth > 25%)
4. **Agregar a watchlist** las mejores candidatas

### Día de Trading:
1. Revisa tu watchlist
2. Verifica el precio actualizado
3. Confirma que se mantienen las condiciones
4. Toma decisiones informadas

---

## 💡 Tips Pro

### Para encontrar acciones ganadoras:
```
RS > 80 ✅
Precio > SMA 20 ✅
Precio > SMA 50 ✅
EPS Growth > 25% ✅
```

### Filtros populares:

**Momentum Plays:**
- RS Min: 80
- Sobre SMA 20, 50 y 200

**Value + Growth:**
- Precio Max: $100
- RS Min: 60
- EPS Growth > 20%

**Large Caps Estables:**
- Market Cap Min: $100B
- Sobre SMA 200

---

## ⚙️ Personalización

### Cambiar las acciones del screener:
Edita `src/services/stockData.ts`, línea 14:

```typescript
export const POPULAR_STOCKS = [
  'AAPL', 'MSFT', 'TU_ACCION_AQUI'
];
```

### Cambiar frecuencia de actualización:
Edita `src/App.tsx`, línea 56:

```typescript
const interval = setInterval(loadStocks, 5 * 60 * 1000); // 5 min
```

---

## 🐛 Problemas?

### No carga datos:
1. Verifica que configuraste la API key
2. Revisa la consola (F12) para errores
3. Confirma tu internet funciona

### Datos desactualizados:
- Plan gratis tiene delay de 15 minutos
- ¡Perfecto para swing trading!

### Rate limit error:
- Espera 1 minuto
- El screener usa caché de 5 minutos

---

## 📚 Más Información

- **README.md**: Documentación completa
- **API_SETUP.md**: Guía detallada de APIs
- Finnhub Docs: https://finnhub.io/docs/api

---

## 🎉 ¡Listo!

Ya tienes tu screener profesional funcionando. Ahora puedes:
- ✅ Encontrar acciones con momentum
- ✅ Analizar fundamentales
- ✅ Gestionar watchlists
- ✅ Tomar mejores decisiones de trading

**¡Feliz trading! 📈**

---

*Recuerda: Esta herramienta es para investigación. No constituye asesoramiento financiero.*
