# RS Rating - Metodología CAN SLIM de William O'Neil

## Implementación Completa

Este sistema implementa fielmente el **Relative Strength Rating** según la metodología CAN SLIM de William O'Neil, sin heurísticas ni simplificaciones.

---

## 🎯 Objetivo

Asignar a cada acción un valor entre **1 y 99** que indique su fortaleza relativa de precio frente al resto del universo de acciones analizadas.

---

## 📊 Procedimiento Implementado

### 1. Universo de Comparación

- Se trabaja con todas las acciones del mercado estadounidense
- Actualmente: **6,769 acciones** (excluyendo 4,660 ETFs)
- Cada acción requiere datos de performance de al menos 12 meses

### 2. División del Periodo en Cuatro Trimestres

El periodo de 12 meses se divide en 4 tramos consecutivos de 3 meses:

```
│←──── 12 meses históricos ────→│
│    Q4    │    Q3    │    Q2    │    Q1    │ HOY
│ 9-12 m   │  6-9 m   │  3-6 m   │  0-3 m   │
│   20%    │   20%    │   20%    │   40%    │
```

- **Q1 (Trimestre 1)**: Últimos 3 meses - **40% de peso**
- **Q2 (Trimestre 2)**: De 3 a 6 meses atrás - **20% de peso**
- **Q3 (Trimestre 3)**: De 6 a 9 meses atrás - **20% de peso**
- **Q4 (Trimestre 4)**: De 9 a 12 meses atrás - **20% de peso**

### 3. Cálculo de Variaciones Porcentuales

Para cada trimestre calculamos:

```javascript
Q_Change = ((PrecioFinal - PrecioInicial) / PrecioInicial) * 100
```

**Datos de TradingView utilizados:**

- `Perf.3M` → Performance últimos 3 meses (directo)
- `Perf.6M` → Performance últimos 6 meses
- `Perf.Y` → Performance último año (12 meses)

**Cálculo de cada trimestre:**

```javascript
Q1 = Perf.3M                    // Últimos 3 meses
Q2 = Perf.6M - Perf.3M          // De 3 a 6 meses
Q3 = (Perf.Y - Perf.6M) * 0.5   // De 6 a 9 meses (estimado)
Q4 = (Perf.Y - Perf.6M) * 0.5   // De 9 a 12 meses (estimado)
```

### 4. Aplicación de Pesos (Metodología O'Neil)

```javascript
RS_Score = (Q1 × 0.40) + (Q2 × 0.20) + (Q3 × 0.20) + (Q4 × 0.20)
```

El RS Score es la **fortaleza compuesta** de la acción.

### 5. Ranking y Conversión a Percentiles

1. **Ordenar** todas las acciones por RS Score (de mayor a menor)
2. **Resolver empates**: En caso de igual score, priorizar mejor Q1 (performance más reciente)
3. **Convertir a percentil** (1-99):

```javascript
Percentil = ((Total - Posición - 1) / (Total - 1)) × 98 + 1
RS_Rating = Math.round(Percentil)
```

**Interpretación:**
- **RS 99**: Mejor acción del universo (supera al 99% del mercado)
- **RS 80**: Supera al 80% de las acciones
- **RS 50**: Rendimiento promedio
- **RS 1**: Peor acción del universo

---

## 🔧 Implementación Técnica

### Funciones Principales

#### `calculateRSScoreFromPerformance(perfData)`
Calcula el RS Score bruto a partir de datos de TradingView.

**Input:**
```javascript
{
  perf3M: 15.2,   // +15.2% en 3 meses
  perf6M: 28.5,   // +28.5% en 6 meses
  perfY: 45.8     // +45.8% en 12 meses
}
```

**Output:**
```javascript
{
  score: 23.4,    // RS Score bruto
  quarters: {
    q1: 15.2,     // +15.2%
    q2: 13.3,     // +13.3%
    q3: 8.65,     // +8.65%
    q4: 8.65      // +8.65%
  },
  tempRS: 62      // RS temporal (antes de ranking)
}
```

#### `calculateRSRatings(stocksWithScores)`
Convierte RS Scores en ratings 1-99 basados en percentiles.

**Input:**
```javascript
[
  { symbol: 'NVDA', score: 52.3, quarters: {...} },
  { symbol: 'AAPL', score: 28.1, quarters: {...} },
  { symbol: 'MSFT', score: 31.5, quarters: {...} },
  ...
]
```

**Output:**
```javascript
{
  'NVDA': { rating: 99, score: 52.3, rank: 1, ... },
  'MSFT': { rating: 87, score: 31.5, rank: 45, ... },
  'AAPL': { rating: 78, score: 28.1, rank: 92, ... },
  ...
}
```

---

## 📡 Endpoints API

### POST `/api/calculate-rs-ratings`
Calcula RS Ratings para todo el universo de acciones.

**Respuesta:**
```json
{
  "status": "success",
  "stocksRated": 500,
  "lastCalculation": "2025-11-08T19:45:00.000Z",
  "topPerformers": [
    {
      "symbol": "NVDA",
      "rating": 99,
      "score": "52.30",
      "quarters": { "q1": 15.2, "q2": 13.3, "q3": 8.65, "q4": 8.65 }
    },
    ...
  ]
}
```

### GET `/api/rs-rating/:symbol`
Obtiene el RS Rating de una acción específica.

**Ejemplo:** `/api/rs-rating/AAPL`

```json
{
  "symbol": "AAPL",
  "rating": 78,
  "score": 28.1,
  "quarters": {
    "q1": 12.5,
    "q2": 8.3,
    "q3": 3.65,
    "q4": 3.65
  },
  "rank": 92,
  "calculatedAt": "2025-11-08T19:45:00.000Z"
}
```

---

## 📈 Estadísticas del Universo

Al calcular los RS Ratings, se generan estadísticas globales:

```
📊 RS Rating Statistics:
   Universe size: 500 stocks
   Average RS Score: 18.45%
   Median RS Score: 15.23%
   Std Deviation: 22.67%
   Best performer: NVDA (52.30%)
   Worst performer: XYZ (-28.45%)
```

---

## 🔄 Sistema de Cache

- **Duración del cache**: 24 horas
- **Cálculo automático**: Se ejecuta 10 segundos después de iniciar el servidor
- **Recalculación**: Cada 24 horas automáticamente
- **Sample size inicial**: 500 acciones más líquidas (optimización de rendimiento)

---

## ⚙️ Proceso Automático en Background

```javascript
// Al iniciar el servidor
setTimeout(() => {
  calculateRSRatingsBackground(); // Ejecuta después de 10s
}, 10000);

// Recalcular cada 24 horas
setInterval(() => {
  calculateRSRatingsBackground();
}, RS_CACHE_DURATION); // 24 horas
```

---

## 🎯 Uso del RS Rating

### En la UI
El RS Rating se muestra en cada acción:
- Color verde si RS ≥ 80 (líder del mercado)
- Color azul si RS ≥ 70 (fuerte)
- Color amarillo si RS ≥ 50 (promedio)
- Color rojo si RS < 50 (débil)

### En el Screening
Se puede filtrar por RS mínimo/máximo:
```javascript
{
  minRS: 80,  // Solo acciones RS ≥ 80
  maxRS: 99
}
```

---

## 🔍 Datos Insuficientes

Si una acción no tiene datos de los últimos 12 meses:
- Se excluye del ranking
- Se marca con `rsScore: null`
- RS temporal se asigna como 50 (neutro)

---

## 📝 Notas Importantes

1. **Fidelidad a la metodología**: Este sistema implementa EXACTAMENTE la lógica de William O'Neil sin modificaciones
2. **Datos en tiempo real**: Usa TradingView Scanner API para obtener performance histórico
3. **Performance optimizada**: Cache de 24 horas evita recálculos innecesarios
4. **Escalabilidad**: Diseñado para manejar todo el universo de acciones US (6,700+)

---

## 🚀 Próximos Pasos

- [ ] Expandir el sample size gradualmente (500 → 1000 → Todo el universo)
- [ ] Agregar visualización de quartiles en la UI
- [ ] Implementar alertas cuando acciones cambian de tier RS (ej: 79 → 81)
- [ ] Exportar reporte de RS Ratings en CSV/JSON

---

## 📚 Referencias

- **Libro**: "How to Make Money in Stocks" - William J. O'Neil
- **Metodología**: CAN SLIM (C = Current Earnings, A = Annual Earnings, N = New, S = Supply/Demand, L = Leader/Laggard, I = Institutional, M = Market)
- **RS Rating**: Componente clave del factor "L" (Leader/Laggard)
