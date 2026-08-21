@echo off
REM Script para iniciar el servidor del Stock Screener en segundo plano

cd /d "%~dp0"

REM Verificar si ya está corriendo
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    exit
)

REM Iniciar el servidor en segundo plano
start /B /MIN cmd /c "node server.js > nul 2>&1"

exit
