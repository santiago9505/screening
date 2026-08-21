# 🚀 Stock Screener Pro - CONFIGURADO Y LISTO

## ✅ YA ESTÁ TODO CONFIGURADO

### 📌 Formas de Abrir el Screener:

#### **OPCIÓN 1: Icono del Escritorio (MÁS FÁCIL)**
1. Busca el icono **"Stock Screener Pro"** en tu escritorio
2. Haz **doble clic**
3. Si el servidor no está corriendo, te preguntará si quieres iniciarlo
4. ¡Listo! Se abre el screener en tu navegador

#### **OPCIÓN 2: Anclar a la Barra de Tareas (RECOMENDADO)**
1. Busca el icono **"Stock Screener Pro"** en tu escritorio
2. Clic derecho → **"Anclar a la barra de tareas"**
3. Ahora siempre lo tendrás disponible con un solo clic

#### **OPCIÓN 3: Navegador Directo**
Si el servidor ya está corriendo, solo abre tu navegador y ve a:
```
http://localhost:3002
```
*Crea un marcador/favorito para acceso rápido*

---

## 🔄 Inicio Automático del Servidor

**✅ YA ESTÁ ACTIVADO**

El servidor se iniciará automáticamente cada vez que enciendas tu PC.
- Corre en segundo plano (no verás ninguna ventana)
- Puedes usar el screener inmediatamente abriendo el navegador

### Para verificar si está corriendo:
```powershell
Get-Process -Name node
```

### Para detenerlo manualmente:
```
.\stop-server.bat
```

### Para desactivar el inicio automático:
```
.\remove-autostart.ps1
```

---

## 📋 Archivos Útiles

| Archivo | Descripción |
|---------|-------------|
| **Abrir-Stock-Screener.vbs** | Doble clic para abrir (usado por el icono del escritorio) |
| **run-server.bat** | Inicia el servidor manualmente con ventana visible |
| **stop-server.bat** | Detiene el servidor |
| **start-server.bat** | Inicia servidor + abre navegador |
| **setup-autostart.ps1** | Activa inicio automático |
| **remove-autostart.ps1** | Desactiva inicio automático |

---

## 🎯 Uso Diario

### Escenario 1: PC recién encendida
1. Espera 10 segundos (el servidor está iniciando en background)
2. Haz clic en el icono del escritorio o abre http://localhost:3002
3. ¡Listo!

### Escenario 2: Servidor no está corriendo
1. Ejecuta `run-server.bat` (se abre una ventana con el servidor)
2. O haz doble clic en el icono del escritorio (te preguntará si quieres iniciarlo)
3. Abre http://localhost:3002

### Escenario 3: Quiero detenerlo
1. Ejecuta `stop-server.bat`
2. O cierra la ventana del servidor si está visible

---

## 🔧 Tips y Trucos

### Crear atajo de teclado personalizado
1. Clic derecho en el icono del escritorio → Propiedades
2. En "Tecla de método abreviado", presiona la combinación que quieras (ej: Ctrl+Alt+S)
3. Aplicar → Aceptar

### Abrir en modo ventana (sin pestañas del navegador)
En Chrome/Edge:
1. Abre http://localhost:3002
2. Menú (⋮) → Más herramientas → Crear acceso directo
3. ✅ Marca "Abrir como ventana"
4. Se creará un icono que lo abre como app independiente

### Usar en segundo monitor
El screener funciona perfecto en múltiples monitores. Solo arrastra la ventana.

---

## 📊 Características Disponibles

✅ Más de 6,700 acciones de EE.UU.
✅ Filtros avanzados (precio, volumen, market cap, RS)
✅ Gráficos de TradingView integrados
✅ Análisis de medias móviles (SMA 20, 50, 200)
✅ Relative Strength Rating (estilo CANSLIM)
✅ Actualización automática de RS Ratings cada 24h

---

## 🆘 Solución de Problemas

### El icono del escritorio no funciona
- Ejecuta manualmente: `.\Abrir-Stock-Screener.vbs`
- O ejecuta: `.\run-server.bat`

### "Cannot GET /" en el navegador
- El servidor no está corriendo
- Ejecuta `.\run-server.bat`
- Espera 5 segundos y refresca (F5)

### "ERR_CONNECTION_REFUSED"
- El servidor no está corriendo
- Verifica: `Get-Process -Name node`
- Si no hay resultado, ejecuta `.\run-server.bat`

### El puerto 3002 está en uso
- Otro programa está usando ese puerto
- Ejecuta: `.\stop-server.bat`
- O reinicia tu PC

---

## 🎉 ¡Todo Listo!

Ya tienes el Stock Screener Pro completamente configurado y listo para usar.

**Próximos pasos:**
1. Haz doble clic en el icono del escritorio
2. (Opcional) Ancla el icono a tu barra de tareas
3. ¡Empieza a analizar acciones!

---

*Para más información, revisa los archivos .md en el proyecto*
