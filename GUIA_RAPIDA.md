# 🚀 Stock Screener Pro - Guía Rápida

## 📋 Opciones de Uso

### Opción 1: Inicio Manual
Haz doble clic en **`run-server.bat`** para iniciar el servidor.
- Se abrirá una ventana del servidor
- Accede en tu navegador: **http://localhost:3002**
- Para detener: cierra la ventana o ejecuta `stop-server.bat`

### Opción 2: Inicio Automático con Windows ⭐ (Recomendado)

#### Activar:
1. Clic derecho en **`setup-autostart.ps1`**
2. Selecciona **"Ejecutar con PowerShell"**
3. ¡Listo! El servidor iniciará automáticamente cuando enciendas tu PC

#### Desactivar:
1. Clic derecho en **`remove-autostart.ps1`**
2. Selecciona **"Ejecutar con PowerShell"**

---

## 🌐 Acceso

Una vez iniciado el servidor, abre tu navegador favorito y ve a:
```
http://localhost:3002
```

**Crea un marcador/favorito** para acceso rápido.

---

## 📁 Archivos Importantes

- **run-server.bat** - Inicia el servidor manualmente
- **stop-server.bat** - Detiene el servidor
- **setup-autostart.ps1** - Configura inicio automático
- **remove-autostart.ps1** - Desactiva inicio automático
- **server.js** - Código del servidor (no modificar)
- **all-us-stocks.json** - Base de datos de acciones

---

## ⚡ Comandos Útiles

### Verificar si el servidor está corriendo:
```powershell
Get-Process node | Where-Object {$_.Path -like "*Screener*"}
```

### Detener el servidor desde PowerShell:
```powershell
.\stop-server.bat
```

### Ver el log del servidor:
Abre la ventana del servidor (run-server.bat) para ver los mensajes

---

## 🔧 Troubleshooting

### El servidor no inicia:
1. Verifica que Node.js esté instalado: `node --version`
2. Instala dependencias: `npm install`
3. Verifica que el puerto 3002 esté libre

### No puedo acceder desde el navegador:
1. Verifica que el servidor esté corriendo
2. Prueba: http://localhost:3002
3. Revisa el firewall de Windows

### El inicio automático no funciona:
1. Verifica la carpeta de inicio de Windows: `shell:startup`
2. Debe haber un acceso directo llamado "Stock Screener Server"

---

## 📊 Características

✅ Más de 11,000 acciones de EE.UU.
✅ Filtros avanzados (precio, volumen, market cap, RS)
✅ Gráficos de TradingView integrados
✅ Análisis de medias móviles (SMA 20, 50, 200)
✅ Relative Strength Rating (estilo CANSLIM)
✅ Actualización en tiempo real

---

**¿Necesitas ayuda?** Revisa los archivos .md en el proyecto o ejecuta `npm run dev` para modo desarrollo.
