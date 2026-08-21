@echo off
title Stock Screener Server
cd /d "%~dp0"
echo ========================================
echo   STOCK SCREENER PRO - SERVER
echo ========================================
echo.
echo Iniciando servidor en http://localhost:3002
echo.
echo Para detener el servidor, cierra esta ventana
echo o ejecuta stop-server.bat
echo ========================================
echo.
node server.js
pause
