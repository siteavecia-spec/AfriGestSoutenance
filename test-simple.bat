@echo off
echo 🚀 Tests de rôles AfriGest
echo ================================

echo.
echo 🛑 Arrêt du serveur principal...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo 🧪 Lancement des tests de rôles...
node tests/run-role-tests.js

echo.
echo ✅ Tests terminés
pause
