Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Stock Screener Pro'
$form.Size = New-Object System.Drawing.Size(450, 320)
$form.StartPosition = 'CenterScreen'
$form.BackColor = [System.Drawing.Color]::FromArgb(26, 31, 46)
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false

$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = 'STOCK SCREENER PRO'
$titleLabel.Font = New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::White
$titleLabel.AutoSize = $false
$titleLabel.Size = New-Object System.Drawing.Size(430, 40)
$titleLabel.Location = New-Object System.Drawing.Point(10, 15)
$titleLabel.TextAlign = 'MiddleCenter'
$form.Controls.Add($titleLabel)

$statusPanel = New-Object System.Windows.Forms.Panel
$statusPanel.Size = New-Object System.Drawing.Size(410, 90)
$statusPanel.Location = New-Object System.Drawing.Point(20, 65)
$statusPanel.BackColor = [System.Drawing.Color]::FromArgb(31, 41, 55)
$statusPanel.BorderStyle = 'FixedSingle'
$form.Controls.Add($statusPanel)

$statusIcon = New-Object System.Windows.Forms.Label
$statusIcon.Font = New-Object System.Drawing.Font('Segoe UI', 32, [System.Drawing.FontStyle]::Bold)
$statusIcon.AutoSize = $false
$statusIcon.Size = New-Object System.Drawing.Size(80, 80)
$statusIcon.Location = New-Object System.Drawing.Point(10, 5)
$statusIcon.TextAlign = 'MiddleCenter'
$statusPanel.Controls.Add($statusIcon)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Font = New-Object System.Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
$statusLabel.AutoSize = $false
$statusLabel.Size = New-Object System.Drawing.Size(300, 35)
$statusLabel.Location = New-Object System.Drawing.Point(95, 15)
$statusLabel.TextAlign = 'MiddleLeft'
$statusPanel.Controls.Add($statusLabel)

$subtextLabel = New-Object System.Windows.Forms.Label
$subtextLabel.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$subtextLabel.AutoSize = $false
$subtextLabel.Size = New-Object System.Drawing.Size(300, 35)
$subtextLabel.Location = New-Object System.Drawing.Point(95, 45)
$subtextLabel.ForeColor = [System.Drawing.Color]::LightGray
$statusPanel.Controls.Add($subtextLabel)

$mainButton = New-Object System.Windows.Forms.Button
$mainButton.Size = New-Object System.Drawing.Size(410, 45)
$mainButton.Location = New-Object System.Drawing.Point(20, 170)
$mainButton.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$mainButton.FlatStyle = 'Flat'
$mainButton.FlatAppearance.BorderSize = 0
$form.Controls.Add($mainButton)

$secondaryButton = New-Object System.Windows.Forms.Button
$secondaryButton.Size = New-Object System.Drawing.Size(200, 35)
$secondaryButton.Location = New-Object System.Drawing.Point(20, 225)
$secondaryButton.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$secondaryButton.FlatStyle = 'Flat'
$secondaryButton.FlatAppearance.BorderSize = 1
$secondaryButton.BackColor = [System.Drawing.Color]::FromArgb(31, 41, 55)
$secondaryButton.ForeColor = [System.Drawing.Color]::White
$form.Controls.Add($secondaryButton)

$closeButton = New-Object System.Windows.Forms.Button
$closeButton.Text = 'Cerrar'
$closeButton.Size = New-Object System.Drawing.Size(200, 35)
$closeButton.Location = New-Object System.Drawing.Point(230, 225)
$closeButton.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$closeButton.FlatStyle = 'Flat'
$closeButton.FlatAppearance.BorderSize = 1
$closeButton.BackColor = [System.Drawing.Color]::FromArgb(31, 41, 55)
$closeButton.ForeColor = [System.Drawing.Color]::White
$closeButton.Add_Click({ $form.Close() })
$form.Controls.Add($closeButton)

function Update-Status {
    $process = Get-Process -Name node -ErrorAction SilentlyContinue
    
    if ($process) {
        $statusIcon.Text = 'OK'
        $statusIcon.ForeColor = [System.Drawing.Color]::FromArgb(34, 197, 94)
        $statusLabel.Text = 'Servidor Corriendo'
        $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(34, 197, 94)
        $subtextLabel.Text = 'Todo listo para usar el screener' + [Environment]::NewLine + 'Proceso ID: ' + $process.Id
        
        $mainButton.Text = 'Abrir Stock Screener'
        $mainButton.BackColor = [System.Drawing.Color]::FromArgb(59, 130, 246)
        $mainButton.ForeColor = [System.Drawing.Color]::White
        $mainButton.Enabled = $true
        
        $secondaryButton.Text = 'Detener Servidor'
        $secondaryButton.Enabled = $true
    } else {
        $statusIcon.Text = 'X'
        $statusIcon.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
        $statusLabel.Text = 'Servidor Detenido'
        $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
        $subtextLabel.Text = 'El servidor no esta corriendo' + [Environment]::NewLine + 'Inicia el servidor para usar el screener'
        
        $mainButton.Text = 'Iniciar Servidor'
        $mainButton.BackColor = [System.Drawing.Color]::FromArgb(34, 197, 94)
        $mainButton.ForeColor = [System.Drawing.Color]::White
        $mainButton.Enabled = $true
        
        $secondaryButton.Text = 'Configurar Inicio Auto'
        $secondaryButton.Enabled = $true
    }
}

$mainButton.Add_Click({
    $process = Get-Process -Name node -ErrorAction SilentlyContinue
    
    if ($process) {
        Start-Process 'http://localhost:3002'
        $form.WindowState = 'Minimized'
    } else {
        $mainButton.Text = 'Iniciando...'
        $mainButton.Enabled = $false
        
        $scriptPath = Split-Path -Parent $PSCommandPath
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath'; Write-Host '=== STOCK SCREENER SERVER ===' -ForegroundColor Cyan; node server.js" -WindowStyle Normal
        
        Start-Sleep -Seconds 3
        Update-Status
        
        if (Get-Process -Name node -ErrorAction SilentlyContinue) {
            [System.Windows.Forms.MessageBox]::Show('Servidor iniciado correctamente!' + [Environment]::NewLine + [Environment]::NewLine + 'Abriendo navegador...', 'Stock Screener Pro', 'OK', 'Information')
            Start-Process 'http://localhost:3002'
            $form.WindowState = 'Minimized'
        }
    }
})

$secondaryButton.Add_Click({
    $process = Get-Process -Name node -ErrorAction SilentlyContinue
    
    if ($process) {
        $result = [System.Windows.Forms.MessageBox]::Show('Estas seguro de detener el servidor?', 'Confirmar', 'YesNo', 'Question')
        if ($result -eq 'Yes') {
            Stop-Process -Name node -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
            Update-Status
            [System.Windows.Forms.MessageBox]::Show('Servidor detenido correctamente', 'Stock Screener Pro', 'OK', 'Information')
        }
    } else {
        $scriptPath = Split-Path -Parent $PSCommandPath
        $setupScript = Join-Path $scriptPath 'setup-autostart.ps1'
        
        if (Test-Path $setupScript) {
            Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$setupScript`"" -Wait
            [System.Windows.Forms.MessageBox]::Show('Inicio automatico configurado!' + [Environment]::NewLine + [Environment]::NewLine + 'El servidor se iniciara cuando enciendas tu PC.', 'Stock Screener Pro', 'OK', 'Information')
        }
    }
})

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 2000
$timer.Add_Tick({ Update-Status })
$timer.Start()

Update-Status

$form.Add_Shown({$form.Activate()})
[void]$form.ShowDialog()
$timer.Stop()
