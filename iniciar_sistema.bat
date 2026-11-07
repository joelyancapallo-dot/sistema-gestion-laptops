@echo off
chcp 65001 > nul
title Sistema Comercial de Laptops - LaptopPRO ERP

echo ========================================================
echo    SISTEMA DE GESTION COMERCIAL DE LAPTOPS (ERP)
echo ========================================================
echo.

:: 1. Verificar si Docker Desktop está en ejecución
echo [1/3] Verificando motor de Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Docker Desktop no está iniciado.
    echo [*] Abriendo Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo [*] Esperando a que el motor de Docker esté listo...
    
    :wait_docker
    timeout /t 4 /nobreak >nul
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        echo     Aguardando inicio de Docker Engine...
        goto wait_docker
    )
    echo [OK] Motor Docker listo.
) else (
    echo [OK] Motor Docker en ejecución.
)

:: 2. Iniciar el contenedor de PostgreSQL
echo.
echo [2/3] Levantando contenedor PostgreSQL en Docker...
docker compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo levantar el contenedor de base de datos.
    pause
    exit /b 1
)

:: 3. Abrir navegador e iniciar el servidor Node.js
echo.
echo [3/3] Iniciando Sistema Web en http://localhost:5000 ...
timeout /t 2 /nobreak >nul
start http://localhost:5000

node server/server.js

pause
