# HandOff 360 - script de arranque local
$ErrorActionPreference = "Stop"

$venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $venvPython)) {
    Write-Host "Creando entorno virtual..." -ForegroundColor Green
    python -m venv .venv
    & $venvPython -m pip install --upgrade pip --quiet
}

Write-Host "Instalando dependencias..." -ForegroundColor Green
& $venvPython -m pip install -r requirements.txt --quiet

Write-Host "Levantando HandOff 360 en http://127.0.0.1:5000" -ForegroundColor Green
Start-Process "http://127.0.0.1:5000"
& $venvPython app.py
