@echo off
echo Demarrage d'AfriGest...
echo.

echo 1. Creation du super admin...
node server/scripts/create-super-admin.js

echo.
echo 2. Demarrage du serveur...
start "AfriGest Server" cmd /k "npm run server"

echo.
echo 3. Demarrage du client...
timeout /t 3 /nobreak > nul
start "AfriGest Client" cmd /k "cd client && npm start"

echo.
echo Application demarree !
echo - Serveur: http://localhost:5000
echo - Client: http://localhost:3000
echo - Super Admin: admin@afrigest.com / admin123
echo.
pause
