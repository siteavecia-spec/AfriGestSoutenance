@echo off
echo ========================================
echo    AfriGest - Application de Gestion
echo ========================================
echo.
echo Demarrage de l'application en mode developpement...
echo.
echo 1. Serveur backend (Node.js + Express) : http://localhost:5000
echo 2. Client frontend (React) : http://localhost:3000
echo.
echo Appuyez sur Ctrl+C pour arreter les serveurs
echo.

start "AfriGest Server" cmd /k "npm run server"
timeout /t 3 /nobreak > nul
start "AfriGest Client" cmd /k "cd client && npm start"

echo.
echo Les serveurs sont en cours de demarrage...
echo Ouvrez votre navigateur sur http://localhost:3000
echo.
pause
