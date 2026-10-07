@echo off
title IA local - MEGA CUEVA TESTER
cd /d "%~dp0.."
echo Arrancando la IA local (DeepSeek con tu clave de este ordenador)...
python herramientas\ia_local.py %*
pause
