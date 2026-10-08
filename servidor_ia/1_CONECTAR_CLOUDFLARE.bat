@echo off
title Conectar este ordenador a Cloudflare
cd /d "%~dp0"
echo.
echo Se abrira el navegador. Entra en Cloudflare (o crea la cuenta) y pulsa ALLOW.
echo Tienes unos minutos. Si caduca, vuelve a hacer doble clic en este archivo.
echo.
npx --yes wrangler login
echo.
npx --yes wrangler whoami
echo.
echo Si arriba ves tu correo, ya esta: ahora doble clic en 2_PUBLICAR_SERVIDOR.bat
pause
