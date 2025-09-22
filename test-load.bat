@echo off
echo ⚡ Tests de charge AfriGest
echo.

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js n'est pas installé
    pause
    exit /b 1
)

echo ✅ Node.js est installé
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
echo ⚠️  ATTENTION : Les tests de charge peuvent prendre plusieurs minutes
echo    et créer beaucoup de données dans la base de données.
echo.
set /p confirm="Voulez-vous continuer ? (y/N): "
if /i not "%confirm%"=="y" (
    echo Tests de charge annulés
    pause
    exit /b 0
)

echo.
echo 🚀 Démarrage des tests de charge...
echo.

REM Exécuter les tests de charge
npm run test:load

if %errorlevel% equ 0 (
    echo.
    echo ✅ Tests de charge terminés avec succès !
    echo.
    echo 📊 Résultats des tests de charge :
    echo    - Création de 100 entreprises
    echo    - Création de 500 boutiques
    echo    - Création de 1000 utilisateurs
    echo    - Création de 2000 ventes
    echo    - Requêtes d'agrégation sur 1000 ventes
    echo    - Opérations concurrentes
    echo.
    echo 🧹 Nettoyage des données de test...
    echo    (Les données de test sont automatiquement nettoyées)
) else (
    echo.
    echo ❌ Les tests de charge ont échoué
    echo.
    echo 🔍 Vérifiez :
    echo    - La connexion à la base de données
    echo    - Les ressources système (mémoire, CPU)
    echo    - Les logs d'erreur
)

echo.
pause
