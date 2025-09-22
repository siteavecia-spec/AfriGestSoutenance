@echo off
echo 🚀 Démarrage rapide des tests AfriGest
echo.

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js n'est pas installé
    pause
    exit /b 1
)

REM Vérifier si npm est installé
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm n'est pas installé
    pause
    exit /b 1
)

echo ✅ Node.js et npm sont installés
echo.

REM Installer les dépendances si nécessaire
if not exist "node_modules" (
    echo 📦 Installation des dépendances...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Erreur lors de l'installation des dépendances
        pause
        exit /b 1
    )
)

echo.
echo 🧪 Exécution des tests...
echo.

REM Exécuter les tests
npm run test:all

if %errorlevel% equ 0 (
    echo.
    echo ✅ Tous les tests sont passés avec succès !
    echo.
    echo 📊 Pour voir la couverture de code :
    echo    npm run test:coverage
    echo.
    echo 🔍 Pour exécuter des tests spécifiques :
    echo    npm run test:unit
    echo    npm run test:api
    echo    npm run test:integration
    echo    npm run test:e2e
) else (
    echo.
    echo ❌ Certains tests ont échoué
    echo.
    echo 🔍 Pour plus de détails :
    echo    npm run test:coverage
)

echo.
pause
