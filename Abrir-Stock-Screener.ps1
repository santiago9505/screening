Add-Type -AssemblyName System.Windows.Forms

# Verificar si el servidor está corriendo
$serverRunning = Get-Process -Name node -ErrorAction SilentlyContinue

if (-not $serverRunning) {
    # Preguntar si quiere iniciar el servidor
    $result = [System.Windows.Forms.MessageBox]::Show(
        "El servidor no está corriendo. ¿Deseas iniciarlo?`n`nEsto abrirá una ventana con el servidor.",
        "Stock Screener Pro",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
    )
    
    if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
        # Iniciar servidor
        $scriptPath = $PSScriptRoot
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath'; Write-Host '=== STOCK SCREENER SERVER ===' -ForegroundColor Cyan; node server.js"
        
        # Esperar 5 segundos para que inicie
        Start-Sleep -Seconds 5
    } else {
        exit
    }
}

# Abrir en el navegador
Start-Process "http://localhost:3002"
