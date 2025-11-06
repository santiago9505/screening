# Stock Screener Pro 📈

Screener profesional de acciones en tiempo real con diseño estilo TradingView/MarketSurge. Permite filtrar por medias móviles, calcular Relative Strength (RS) y visualizar datos fundamentales trimestrales (EPS, Sales, Margins).

## 🚀 Características

- **Datos en Tiempo Real**: Integración con Finnhub API (gratuita) para precios actualizados
- **Filtros Avanzados**: Por precio, volumen, market cap y medias móviles (SMA 20/50/200)
- **Relative Strength (RS)**: Similar a MarketSmith, compara rendimiento vs S&P 500
- **Fundamentales Trimestrales**: Vista detallada de EPS, Ventas y Márgenes
- **Watchlists Personalizadas**: Crea y gestiona múltiples listas de seguimiento
- **UI Profesional**: Tema oscuro inspirado en TradingView
- **Actualización Automática**: Datos se refrescan cada 5 minutos

## 📋 Requisitos Previos

1. **Node.js** (versión 16 o superior)
2. **API Keys Gratuitas**:
   - Finnhub: https://finnhub.io/register (60 llamadas/minuto gratis)
   - Alpha Vantage: https://www.alphavantage.co/support/#api-key (opcional, para datos fundamentales)

## 🔧 Instalación

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar API Keys

Edita el archivo `src/services/stockData.ts` y reemplaza las API keys:

```typescript
const FINNHUB_API_KEY = 'TU_API_KEY_AQUI';
const ALPHA_VANTAGE_API_KEY = 'TU_API_KEY_AQUI';
```

**Cómo obtener las API keys:**

#### Finnhub (Principal - Obligatorio)
1. Ve a https://finnhub.io/register
2. Crea una cuenta gratuita
3. Copia tu API key del dashboard
4. Pégala en `FINNHUB_API_KEY`

#### Alpha Vantage (Opcional - Para fundamentales)
1. Ve a https://www.alphavantage.co/support/#api-key
2. Solicita tu API key gratuita
3. Revisa tu email para obtener la key
4. Pégala en `ALPHA_VANTAGE_API_KEY`

### 3. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

La aplicación se abrirá en: http://localhost:3000

## 📊 Uso

### Pantalla Principal
- **Tabla de Acciones**: Muestra ~50 acciones populares con datos en tiempo real
- **Búsqueda**: Filtra por símbolo o nombre
- **Ordenamiento**: Haz clic en los encabezados de columna para ordenar

### Filtros
1. Haz clic en el botón **"Filtros"**
2. Configura:
   - Rango de precios
   - RS mínimo (0-100)
   - Checkboxes para filtrar acciones sobre SMA 20/50/200

### Relative Strength (RS)
- **Verde (80-100)**: Rendimiento superior muy fuerte vs S&P 500
- **Azul (60-79)**: Rendimiento superior
- **Amarillo (40-59)**: Rendimiento neutro
- **Rojo (0-39)**: Rendimiento inferior

### Medias Móviles
- **Verde**: Precio está sobre la media móvil
- **Rojo**: Precio está bajo la media móvil
- Muestra SMA 20, 50 y 200

### Watchlists
1. Haz clic en **"Nueva Lista"**
2. Dale un nombre a tu lista
3. Haz clic en el ícono **+** junto a cualquier acción para agregarla
4. Selecciona una lista en el panel izquierdo para filtrar

### Ver Fundamentales
1. Haz clic en cualquier fila de la tabla
2. Se abrirá un modal con:
   - **EPS trimestral** y crecimiento
   - **Ventas** y crecimiento
   - **Márgenes**: Bruto, Operativo y Neto
   - Análisis de crecimiento promedio

## 🎨 Personalización

### Agregar Más Acciones
Edita `src/services/stockData.ts` y modifica el array `POPULAR_STOCKS`:

```typescript
export const POPULAR_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'TU_SIMBOLO_AQUI'
];
```

### Cambiar Intervalo de Actualización
En `src/App.tsx`, línea ~56:

```typescript
const interval = setInterval(loadStocks, 5 * 60 * 1000); // 5 minutos
```

### Modificar Colores
Edita `tailwind.config.js`:

```javascript
colors: {
  dark: {
    100: '#1e222d',  // Fondos
    200: '#2a2e39',
    300: '#131722',
  },
  accent: {
    blue: '#2962ff',   // Color principal
    green: '#26a69a',  // Positivo
    red: '#ef5350',    // Negativo
  }
}
```

## 🛠️ Tecnologías

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Iconos**: Lucide React
- **Gráficos**: Recharts
- **APIs**: Finnhub (precios), Alpha Vantage (fundamentales)
- **HTTP Client**: Axios

## 📦 Build para Producción

```bash
npm run build
```

Los archivos optimizados estarán en la carpeta `dist/`.

Para previsualizar el build:

```bash
npm run preview
```

## 🔒 Límites de API Gratuita

### Finnhub Free Tier
- 60 llamadas/minuto
- Datos retrasados 15 minutos (acciones)
- Suficiente para swing trading

### Alpha Vantage Free Tier
- 5 llamadas/minuto
- 500 llamadas/día
- Datos fundamentales limitados

**Tip**: El screener usa caché interno (5 minutos) para reducir llamadas a la API.

## 📈 Roadmap de Mejoras

- [ ] Agregar más indicadores técnicos (RSI, MACD, Bollinger Bands)
- [ ] Gráficos interactivos con TradingView widget
- [ ] Exportar watchlists a CSV
- [ ] Notificaciones de alertas de precio
- [ ] Modo multi-timeframe
- [ ] Integración con más brokers

## 🐛 Troubleshooting

### Error: "Cannot find module 'axios'"
```bash
npm install
```

### API devuelve error 401
- Verifica que pegaste correctamente tu API key
- Asegúrate de no tener espacios extra
- Confirma que tu cuenta de Finnhub está activa

### Datos no se cargan
- Abre la consola del navegador (F12)
- Verifica errores de red
- Confirma que no excediste el límite de la API

### Rendimiento lento
- Reduce el número de acciones en `POPULAR_STOCKS`
- Aumenta el intervalo de actualización
- Considera actualizar al tier de pago de Finnhub

## 📄 Licencia

MIT License - Úsalo libremente para proyectos personales o comerciales.

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Siéntete libre de abrir issues o pull requests.

---

**Nota**: Esta aplicación es para fines educativos e informativos. No constituye asesoramiento financiero. Siempre haz tu propia investigación antes de invertir.
