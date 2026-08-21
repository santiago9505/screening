@echo off
echo Deteniendo servidor Stock Screener...
taskkill /F /FI "WINDOWTITLE eq Stock Screener Server*" /T 2>nul
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *server.js*" 2>nul
echo Servidor detenido.
timeout /t 2
