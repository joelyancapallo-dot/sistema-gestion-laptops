Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   SISTEMA DE GESTION COMERCIAL DE LAPTOPS (ERP)" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Comprobar Docker Desktop
Write-Host "[1/3] Verificando motor de Docker..." -ForegroundColor Gray
$dockerCheck = & docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Docker Desktop no está iniciado." -ForegroundColor Yellow
    Write-Host "[*] Abriendo Docker Desktop..." -ForegroundColor Cyan
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    Write-Host "[*] Esperando a que el motor de Docker termine de iniciar..." -ForegroundColor Gray
    do {
        Start-Sleep -Seconds 4
        & docker info 2>&1 | Out-Null
        Write-Host "    Aguardando inicio de Docker Engine..." -ForegroundColor DarkGray
    } while ($LASTEXITCODE -ne 0)
    Write-Host "[OK] Motor Docker listo." -ForegroundColor Green
} else {
    Write-Host "[OK] Motor Docker en ejecución." -ForegroundColor Green
}

# 2. Levantar PostgreSQL
Write-Host ""
Write-Host "[2/3] Levantando base de datos PostgreSQL en Docker..." -ForegroundColor Gray
& docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] No se pudo levantar el contenedor de PostgreSQL." -ForegroundColor Red
    Exit 1
}

# 3. Iniciar Servidor Node.js
Write-Host ""
Write-Host "[3/3] Iniciando Sistema Web en http://localhost:5000 ..." -ForegroundColor Cyan
Start-Process "http://localhost:5000"

node server/server.js
