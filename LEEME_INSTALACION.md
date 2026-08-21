# 🚀 Stock Screener Pro - Instrucciones de Instalación

## ⚡ MÉTODO RÁPIDO (Recomendado)

### 1️⃣ Doble clic en `INSTALAR.bat`

Eso es todo! El script automáticamente:
- ✅ Compila el frontend
- ✅ Crea el instalador
- ✅ Abre la carpeta con el .exe

---

## 📋 MÉTODO MANUAL

### 1️⃣ Abrir PowerShell en esta carpeta

```powershell
# Compilar frontend
npm run build

# Crear instalador
npm run dist
```

### 2️⃣ Instalar la aplicación

1. Ve a `release/`
2. Ejecuta `Stock Screener Pro Setup 1.0.0.exe`
3. Sigue el asistente (acepta todo con valores por defecto)

### 3️⃣ Abrir la app

- 🖥️ Doble clic en el ícono del escritorio
- O busca "Stock Screener Pro" en el menú Inicio

---

## ✅ ¿Qué incluye la aplicación?

- ✓ Servidor backend automático
- ✓ Frontend React optimizado
- ✓ Datos en tiempo real de TradingView
- ✓ Gráficos profesionales
- ✓ Sistema de watchlists
- ✓ Filtros avanzados

---

## 🎯 Uso diario

1. **Abrir:** Doble clic en el ícono
2. **Usar:** Todo funciona automáticamente
3. **Cerrar:** Click en X (se apaga todo)

**No necesitas:**
- ❌ Abrir VS Code
- ❌ Ejecutar comandos
- ❌ Iniciar servidores manualmente

---

## 📁 Archivos importantes

```
📂 Screener/
├── 📄 INSTALAR.bat           ← Doble clic aquí para instalar
├── 📄 INSTALACION.md         ← Guía detallada
├── 📄 icon.ico               ← Ícono de la app ✓
├── 📂 release/               ← Instalador final
│   └── Stock Screener Pro Setup 1.0.0.exe
```

---

## 🔧 Comandos de desarrollo

Si quieres hacer cambios al código:

```powershell
# Desarrollo en navegador
npm start

# Desarrollo en Electron (app de escritorio)
npm run electron:dev

# Recrear instalador después de cambios
npm run build
npm run dist
```

---

## 💡 Tips

### Para distribuir a otras computadoras:
Comparte el archivo `.exe` de la carpeta `release/`. Solo necesitan ejecutarlo.

### Para actualizar la app:
1. Haz cambios en el código
2. Ejecuta `INSTALAR.bat` de nuevo
3. Reinstala (desinstala la versión anterior primero)

### Para desinstalar:
Panel de Control → Programas → Desinstalar "Stock Screener Pro"

---

## 🎨 Tu ícono personalizado

✅ Ya está incluido! Un gráfico de barras azul con línea de tendencia dorada.

Si quieres cambiarlo:
1. Crea tu ícono (256x256px, formato .ico)
2. Reemplaza `icon.ico`
3. Ejecuta `INSTALAR.bat` de nuevo

---

## ⚠️ Problemas comunes

**"npm run dist falla"**
→ Ejecuta `npm run build` primero

**"La app no abre"**
→ Cierra cualquier proceso de Node.js manualmente

**"Puerto 3002 en uso"**
→ Reinicia tu PC o mata el proceso manualmente

---

## 📊 Tamaños

- Instalador: ~250 MB
- App instalada: ~450 MB
- Incluye todo lo necesario (Node.js, Electron, dependencias)

---

## ✨ ¡Listo para usar!

Abre `Stock Screener Pro` y empieza a analizar acciones como un profesional.

**Características:**
- 📈 6,000+ acciones en tiempo real
- 🔍 Filtros CANSLIM y técnicos
- 📊 Gráficos TradingView integrados
- 💼 Sistema de watchlists ilimitadas
- ⚡ Actualizaciones automáticas
- 🎨 Interfaz oscura profesional

---

**¿Necesitas ayuda?** Revisa `INSTALACION.md` para más detalles.
