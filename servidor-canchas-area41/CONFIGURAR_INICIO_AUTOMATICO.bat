@echo off
title Configurar Inicio Automatico - Area 41
color 0B
cd /d "%~dp0"

echo ========================================================
echo    ACTIVANDO ARRANQUE AUTOMATICO AL PRENDER LA PC
echo ========================================================
echo.

set SCRIPT_DIR=%~dp0
set TARGET_BAT=%SCRIPT_DIR%INICIAR_SERVIDOR.bat
set SHORTCUT_VBS=%TEMP%\crear_acceso_area41.vbs

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%SHORTCUT_VBS%"
echo sLinkFile = oWS.SpecialFolders("Startup") ^& "\Servidor_Area41.lnk" >> "%SHORTCUT_VBS%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%SHORTCUT_VBS%"
echo oLink.TargetPath = "%TARGET_BAT%" >> "%SHORTCUT_VBS%"
echo oLink.WorkingDirectory = "%SCRIPT_DIR%" >> "%SHORTCUT_VBS%"
echo oLink.Description = "Servidor de Grabaciones Area 41" >> "%SHORTCUT_VBS%"
echo oLink.Save >> "%SHORTCUT_VBS%"

cscript /nologo "%SHORTCUT_VBS%"
del "%SHORTCUT_VBS%"

echo.
echo [LISTO] Se configuro el auto-arranque con exito!
echo.
echo A partir de ahora, cada vez que se prenda la PC (o si vuelve la luz
echo tras un corte), el servidor arrancara completamente solo.
echo.
pause
