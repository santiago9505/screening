@echo off
echo ========================================
echo   STOCK SCREENER PRO - Instalador
echo ========================================
echo.

echo [1/3] Compilando frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Fallo en la compilacion del frontend
    pause
    exit /b 1
)

echo.
echo [2/3] Creando instalador .exe...
echo (Esto puede tardar 3-5 minutos)
call npm run electron:build
if %errorlevel% neq 0 (
    echo ERROR: Fallo al crear el instalador
    pause
    exit /b 1
)

echo.
echo ========================================
echo   INSTALACION COMPLETA!
echo ========================================
echo.
echo El instalador esta en: release\Stock Screener Pro Setup 1.0.0.exe
echo.
echo Siguiente paso:
echo 1. Ve a la carpeta 'release'
echo 2. Ejecuta el instalador
echo 3. Abre Stock Screener Pro desde el escritorio
echo.

explorer release

pause
