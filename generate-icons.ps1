# Script para generar íconos desde SVG
Write-Host "Generando iconos para Stock Screener Pro..." -ForegroundColor Cyan

# Verificar si existe ImageMagick (herramienta común para convertir imágenes)
$hasImageMagick = Get-Command magick -ErrorAction SilentlyContinue

if ($hasImageMagick) {
    Write-Host "Usando ImageMagick para generar iconos..." -ForegroundColor Green
    
    # Convertir SVG a PNG de alta resolución
    magick convert -background none -size 512x512 icon.svg icon.png
    
    # Convertir PNG a ICO con múltiples resoluciones
    magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
    
    Write-Host "✅ Iconos generados exitosamente:" -ForegroundColor Green
    Write-Host "   - icon.png (512x512)" -ForegroundColor Yellow
    Write-Host "   - icon.ico (multi-resolución)" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  ImageMagick no está instalado." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Cyan
    Write-Host "1. Instalar ImageMagick: https://imagemagick.org/script/download.php#windows" -ForegroundColor White
    Write-Host "2. Usar convertidor online:" -ForegroundColor White
    Write-Host "   - Abre: https://cloudconvert.com/svg-to-ico" -ForegroundColor White
    Write-Host "   - Sube: icon.svg" -ForegroundColor White
    Write-Host "   - Descarga como: icon.ico" -ForegroundColor White
    Write-Host "   - Guarda en: C:\Users\santi\Documents\Screener\" -ForegroundColor White
    Write-Host ""
    Write-Host "Creando icono temporal básico..." -ForegroundColor Yellow
    
    # Crear un mensaje para el usuario
    Write-Host ""
    Write-Host "📝 Por ahora, usa el SVG como referencia." -ForegroundColor Cyan
    Write-Host "   Una vez tengas icon.ico, ejecuta: npm run dist" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
