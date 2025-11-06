# 📋 LEEME PRIMERO - Stock Screener Pro

## ✅ ¡Tu screener está instalado y corriendo!

**URL:** http://localhost:3000/

---

## 🚨 ACCIÓN REQUERIDA (2 minutos)

### Necesitas configurar una API key GRATUITA:

1. **Registrate:** https://finnhub.io/register
2. **Copia tu API key** del dashboard
3. **Pega la key** en: `src/services/stockData.ts` (línea 9)
4. **Guarda el archivo** y listo!

👉 **Ver guía completa:** `TUTORIAL.md`

---

## 📚 Guías Disponibles

| Archivo | Para qué sirve | ⏱️ Tiempo |
|---------|---------------|-----------|
| **TUTORIAL.md** | 📖 Guía paso a paso de configuración | 5 min |
| **QUICKSTART.md** | 🚀 Inicio rápido y tips | 3 min |
| **INSTRUCCIONES.md** | 📱 Manual de usuario completo | 15 min |
| **API_SETUP.md** | 🔑 Configuración detallada de APIs | 10 min |
| **README.md** | 📝 Documentación técnica completa | 20 min |
| **RESUMEN.md** | ⭐ Resumen ejecutivo del proyecto | 5 min |
| **MEJORAS_FUTURAS.md** | 🚀 Ideas para expandir el screener | 10 min |

---

## 🎯 Lee Según Tu Objetivo

### "Solo quiero que funcione YA"
1. Lee: **TUTORIAL.md**
2. Configura API key (2 min)
3. ¡Listo!

### "Quiero entender cómo usarlo"
1. Lee: **QUICKSTART.md**
2. Lee: **INSTRUCCIONES.md**
3. Explora la app

### "Quiero saber qué hace y cómo funciona"
1. Lee: **RESUMEN.md**
2. Lee: **README.md**
3. Revisa el código

### "Quiero personalizarlo"
1. Lee: **README.md** (sección Personalización)
2. Lee: **MEJORAS_FUTURAS.md**
3. Edita `src/services/stockData.ts` para agregar más acciones

---

## ⚡ Quick Commands

```bash
# Iniciar (si se cerró)
npm run dev

# Detener
Ctrl + C

# Build para producción
npm run build
```

---

## 🎨 Características Principales

✅ **Datos en tiempo real** de ~50 acciones populares
✅ **Medias móviles** SMA 20/50/200 con indicadores visuales
✅ **Relative Strength (RS)** estilo MarketSmith (0-100)
✅ **Fundamentales trimestrales** (EPS, Sales, Margins)
✅ **Watchlists ilimitadas** guardadas en tu navegador
✅ **Filtros avanzados** por precio, RS, medias móviles
✅ **UI profesional** tema oscuro estilo TradingView
✅ **Auto-actualización** cada 5 minutos

---

## 🔗 Links Útiles

- **Finnhub Dashboard:** https://finnhub.io/dashboard
- **Alpha Vantage API:** https://www.alphavantage.co/support/#api-key
- **Finnhub Docs:** https://finnhub.io/docs/api

---

## 🆘 Problemas?

### No carga datos
→ Lee: `TUTORIAL.md` para configurar API key

### Errores en consola
→ Presiona F12 y revisa la pestaña Console

### API rate limit
→ Espera 1 minuto, el plan gratis permite 60 llamadas/min

### Más ayuda
→ Lee: `API_SETUP.md` o `README.md`

---

## 📊 Estructura del Proyecto

```
Screener/
├── src/
│   ├── components/       # Componentes React
│   ├── services/         # ⚠️ Configurar API aquí
│   ├── types/           # TypeScript types
│   └── App.tsx          # App principal
├── TUTORIAL.md          # 👈 EMPIEZA AQUÍ
├── QUICKSTART.md        # Guía rápida
├── INSTRUCCIONES.md     # Manual completo
├── README.md            # Docs técnicas
└── ...otros archivos
```

---

## 🎓 Orden de Lectura Recomendado

### Principiantes:
1. **ESTE ARCHIVO** ✅
2. `TUTORIAL.md` - Configuración paso a paso
3. `QUICKSTART.md` - Cómo usar el screener
4. `INSTRUCCIONES.md` - Manual detallado

### Usuarios Avanzados:
1. **ESTE ARCHIVO** ✅
2. `RESUMEN.md` - Overview técnico
3. `README.md` - Documentación completa
4. `MEJORAS_FUTURAS.md` - Expansión del proyecto

---

## 💡 Tips Rápidos

### Para encontrar acciones con momentum:
```
1. Click en "Filtros"
2. RS Min: 80
3. ☑ Sobre SMA 20
4. ☑ Sobre SMA 50
```

### Para crear una watchlist:
```
1. Click "Nueva Lista"
2. Dale un nombre
3. Click en + junto a acciones
```

### Para ver fundamentales:
```
Click en cualquier fila de la tabla
```

---

## 🚀 Next Steps

- [ ] Leer `TUTORIAL.md` (3 min)
- [ ] Configurar API key (2 min)
- [ ] Explorar la app (5 min)
- [ ] Crear tu primera watchlist (2 min)
- [ ] Aplicar filtros (3 min)
- [ ] ¡Empezar a hacer screening! 📈

---

## 🎉 ¡Disfruta tu Stock Screener Pro!

Si tienes alguna pregunta, consulta los archivos de documentación. ¡Todo está documentado!

**¡Feliz Trading! 📊💰**

---

*Última actualización: 2024*
*Versión: 1.0.0*
