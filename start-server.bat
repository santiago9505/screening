@echo off
cd /d "%~dp0"
echo Iniciando Stock Screener Server...
start /min cmd /c "title Stock Screener Server && node server.js"
echo Esperando a que el servidor inicie...
timeout /t 5 /nobreak > nul
echo Abriendo navegador...
start http://localhost:3002
echo.
echo ✅ Stock Screener iniciado en http://localhost:3002
echo.
echo Para detener el servidor, ejecuta: stop-server.bat
timeout /t 3
