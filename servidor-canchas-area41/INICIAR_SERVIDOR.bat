@echo off
title SERVIDOR AUTOMATICO CANCHAS - COMPLEJO AREA 41
color 0A
cd /d "%~dp0"

:: Habilitar compatibilidad total con Windows 7, 8 y 8.1
set NODE_SKIP_PLATFORM_CHECK=1

echo ========================================================
echo    COMPLEJO AREA 41 - SISTEMA DE GRABACIONES AUTOMATICO
echo ========================================================
echo.

if exist "%~dp0node.exe" (
    echo [OK] Motor portatil detectado correctamente.
    echo [OK] Compatible con Windows 7, 8, 8.1, 10 y 11.
    echo.
    echo Iniciando servidor receptor de videos del DVR...
    echo.
    echo [!] IMPORTANTE: No cierres esta ventana. Debe quedar abierta
    echo     para que suba los partidos automaticamente.
    echo.
    "%~dp0node.exe" servidor.js
) else (
    echo [!] Buscando Node.js en el sistema...
    node -v >nul 2>&1
    if %errorlevel% == 0 (
        node servidor.js
    ) else (
        color 0C
        echo ========================================================
        echo  ERROR: No se encontro el archivo "node.exe" en esta carpeta.
        echo ========================================================
        echo.
        echo Para solucionarlo tenes dos opciones muy faciles:
        echo.
        echo 1. Volve a copiar la carpeta completa desde tu otra PC,
        echo    asegurandote de incluir el archivo "node.exe".
        echo.
        echo 2. O instala el instalador oficial para Windows 7/8 desde:
        echo    https://nodejs.org/dist/v16.20.2/node-v16.20.2-x64.msi
        echo.
    )
)

pause
