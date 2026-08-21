# 📊 Stock Screener Pro - Aplicación de Escritorio

## 🚀 Cómo usar la aplicación

### Opción 1: Ejecutar como aplicación de escritorio (Recomendado)

#### Para crear el ejecutable (.exe):

```powershell
npm run dist
```

Esto creará un instalador en la carpeta `release/`. Simplemente:
1. Ve a `release/`
2. Ejecuta el instalador `Stock Screener Pro Setup x.x.x.exe`
3. Instala la aplicación
4. Abre "Stock Screener Pro" desde el menú de inicio o acceso directo del escritorio

**¡Listo!** La aplicación abrirá automáticamente el servidor backend y el frontend en una ventana nativa.

---

### Opción 2: Desarrollo con Electron

Para probar en modo desarrollo con recarga automática:

```powershell
npm run electron:dev
```

Esto iniciará:
- ✅ Servidor backend en puerto 3002
- ✅ Vite dev server en puerto 5173
- ✅ Ventana de Electron con DevTools abierto

---

### Opción 3: Modo navegador (método anterior)

Si prefieres usar el navegador en lugar de la app de escritorio:

```powershell
npm start
```

Luego abre http://localhost:5173

---

## 📦 Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run electron:dev` | Inicia la app en modo desarrollo |
| `npm run dist` | Crea el instalador .exe para Windows |
| `npm run electron:build` | Build de la app (sin crear instalador) |
| `npm start` | Inicia en modo navegador (desarrollo) |
| `npm run build` | Compila el frontend para producción |

---

## 🎯 Ventajas de la aplicación de escritorio

✅ **Un solo clic para abrir** - No necesitas VS Code ni terminal  
✅ **Servidor automático** - Se inicia y cierra automáticamente  
✅ **Ventana nativa** - Mejor rendimiento y UX  
✅ **Acceso directo** - Desde menú de inicio o escritorio  
✅ **Sin navegador** - Menos distracciones  

---

## 🔧 Requisitos

- Node.js instalado (ya lo tienes si llegaste hasta aquí)
- Windows 10/11 (para el .exe)

---

## 📝 Notas

- El ejecutable incluye todo lo necesario (servidor + frontend)
- Los datos se actualizan automáticamente desde TradingView
- La primera compilación puede tardar unos minutos
- El instalador quedará en `release/Stock Screener Pro Setup x.x.x.exe`

---

## 🐛 Problemas comunes

**P: El instalador no se crea**  
R: Asegúrate de haber ejecutado `npm run build` primero, o usa directamente `npm run dist`

**P: La app no abre**  
R: Verifica que los puertos 3002 y 5173 no estén en uso

**P: Quiero cambiar el ícono**  
R: Reemplaza `icon.ico` en la raíz del proyecto

---

## 🎨 Personalización

Para cambiar el nombre o versión de la app, edita `package.json`:

```json
{
  "name": "stock-screener-pro",
  "version": "1.0.0",
  "build": {
    "productName": "Tu Nombre Aquí"
  }
}
```
