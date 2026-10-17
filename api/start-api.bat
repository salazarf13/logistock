@echo off
cd /d "%~dp0.."
echo Iniciando API PHP de LogiStock en http://127.0.0.1:4000
C:\xampp\php\php.exe -S 127.0.0.1:4000 api\index.php
