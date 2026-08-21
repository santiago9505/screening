# 🚀 GUÍA DE INSTALACIÓN - Stock Screener Pro

## 📋 Pasos para crear e instalar la aplicación en tu PC

### ✅ PASO 1: Compilar el Frontend

```powershell
npm run build
```

⏱️ Esto tardará 1-2 minutos. Verás:
- ✓ Compilación de TypeScript
- ✓ Optimización de assets
- ✓ Creación de carpeta `dist/`

---

### ✅ PASO 2: Crear el Instalador .exe

```powershell
npm run dist
```

⏱️ Esto tardará 3-5 minutos la primera vez. Verás:
- ✓ Empaquetando aplicación
- ✓ Creando instalador NSIS
- ✓ Generando carpeta `release/`

**Resultado:** 
- 📁 `release/Stock Screener Pro Setup 1.0.0.exe` (~200-300 MB)

---

### ✅ PASO 3: Instalar la Aplicación

1. Ve a la carpeta `release/`
2. Doble clic en `Stock Screener Pro Setup 1.0.0.exe`
3. Sigue el asistente de instalación:
   - ✓ Acepta los términos
   - ✓ Elige ubicación (recomendado: dejar por defecto)
   - ✓ Marca "Crear acceso directo en escritorio"
   - ✓ Click en "Instalar"

⏱️ La instalación tarda ~30 segundos.

---

### ✅ PASO 4: Abrir Stock Screener Pro

**Opción A:** Doble clic en el ícono del escritorio 🖥️

**Opción B:** Menú Inicio → Buscar "Stock Screener Pro"

**Opción C:** Abrir desde `C:\Users\TuUsuario\AppData\Local\Programs\stock-screener-pro\`

---

## 🎯 ¿Qué pasa al abrir la app?

1. ⚡ Se inicia el servidor backend automáticamente (puerto 3002)
2. 🪟 Se abre una ventana nativa de 1600x1000px
3. 📊 Carga tu Stock Screener listo para usar
4. ✅ Sin necesidad de VS Code ni terminal

**Al cerrar la app:** Todo se apaga automáticamente.

---

## 🔧 Comandos Rápidos

### Para desarrollo (con recarga automática):
```powershell
npm run electron:dev
```

### Para recrear el instalador (después de hacer cambios):
```powershell
npm run build
npm run dist
```

### Para desinstalar:
- Panel de Control → Programas → Desinstalar "Stock Screener Pro"

---

## 📂 Estructura de archivos importante

```
C:\Users\santi\Documents\Screener\
├── release/                    ← Aquí se crea el instalador
│   └── Stock Screener Pro Setup 1.0.0.exe
├── dist/                       ← Frontend compilado
├── icon.ico                    ← Ícono de la aplicación ✓
├── icon.png                    ← Ícono PNG ✓
├── electron-main.cjs           ← Archivo principal de Electron
└── server.js                   ← Backend Express
```

---

## ⚠️ Solución de problemas

### Error: "npm run dist falla"
**Solución:** Ejecuta primero `npm run build`

### Error: "La app no abre"
**Solución:** Cierra cualquier instancia de `node server.js` manualmente

### Error: "Puerto 3002 en uso"
**Solución:** 
```powershell
netstat -ano | findstr :3002
taskkill /PID <número> /F
```

### Quiero actualizar la app:
1. Haz tus cambios en el código
2. Ejecuta `npm run build && npm run dist`
3. Reinstala el nuevo `.exe` (desinstala la anterior primero)

---

## 🎨 Personalización

### Cambiar el nombre:
Edita `package.json`:
```json
{
  "name": "tu-nombre-app",
  "build": {
    "productName": "Tu App"
  }
}
```

### Cambiar el ícono:
Reemplaza `icon.ico` con tu propio ícono (256x256px recomendado)

### Cambiar el puerto:
Edita `electron-main.cjs` y `server.js` (cambia 3002 por otro)

---

## 📊 Tamaño estimado

- **Instalador:** ~200-300 MB
- **App instalada:** ~400-500 MB
- **Incluye:** Node.js, Electron, todas las dependencias

---

## ✨ ¡Listo!

Tu Stock Screener Pro ahora es una aplicación nativa de Windows.

**Próximos pasos recomendados:**
1. Crea un backup del instalador en `release/`
2. Opcional: Firma digitalmente el .exe para evitar advertencias de Windows
3. Opcional: Sube el instalador a Google Drive para instalarlo en otras PCs

---

💡 **Tip:** Para distribuir a otros PCs, solo necesitas compartir el archivo `.exe` de la carpeta `release/`. Los usuarios lo ejecutan y listo.
