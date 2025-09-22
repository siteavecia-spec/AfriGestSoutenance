#!/usr/bin/env node

// Script pour exécuter tous les tests de rôles
const { spawn, exec } = require('child_process');
const path = require('path');

// Fonction pour arrêter le serveur
const stopServer = () => {
  return new Promise((resolve) => {
    console.log('🛑 Arrêt du serveur...');
    
    // Tuer les processus sur le port 5000
    exec('netstat -ano | findstr :5000', (error, stdout) => {
      if (stdout) {
        const lines = stdout.trim().split('\n');
        const pids = lines.map(line => {
          const parts = line.trim().split(/\s+/);
          return parts[parts.length - 1];
        }).filter(pid => pid && pid !== '0');
        
        if (pids.length > 0) {
          pids.forEach(pid => {
            exec(`taskkill /PID ${pid} /F`, (err) => {
              if (err) console.log(`⚠️  Processus ${pid} déjà arrêté`);
            });
          });
        }
      }
      
      // Attendre un peu pour que les processus se terminent
      setTimeout(resolve, 2000);
    });
  });
};

const roleTests = [
  { name: 'Super Admin', file: 'tests/roles/superAdmin.test.js' },
  { name: 'Admin/PDG', file: 'tests/roles/adminPDG.test.js' },
  { name: 'Directeur Général', file: 'tests/roles/directeurGeneral.test.js' },
  { name: 'Manager', file: 'tests/roles/manager.test.js' },
  { name: 'Employee', file: 'tests/roles/employee.test.js' }
];

async function runRoleTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Exécution des tests pour: ${testFile.name}`);
    console.log('=' .repeat(50));
    
    const testProcess = spawn('npx', ['jest', testFile.file, '--verbose'], {
      stdio: 'inherit',
      shell: true
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Tests ${testFile.name} réussis`);
        resolve(true);
      } else {
        console.log(`❌ Tests ${testFile.name} échoués`);
        resolve(false);
      }
    });

    testProcess.on('error', (error) => {
      console.error(`❌ Erreur lors de l'exécution des tests ${testFile.name}:`, error);
      reject(error);
    });
  });
}

async function runAllRoleTests() {
  console.log('🚀 Démarrage des tests de rôles AfriGest');
  console.log('=' .repeat(60));
  
  // Arrêter le serveur d'abord
  await stopServer();
  
  const results = [];
  
  for (const test of roleTests) {
    try {
      const success = await runRoleTest(test);
      results.push({ name: test.name, success });
    } catch (error) {
      console.error(`❌ Erreur critique pour ${test.name}:`, error);
      results.push({ name: test.name, success: false, error });
    }
  }
  
  // Résumé des résultats
  console.log('\n📊 RÉSUMÉ DES TESTS DE RÔLES');
  console.log('=' .repeat(60));
  
  let totalTests = results.length;
  let passedTests = results.filter(r => r.success).length;
  let failedTests = totalTests - passedTests;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.error) {
      console.log(`   Erreur: ${result.error.message}`);
    }
  });
  
  console.log('\n📈 STATISTIQUES');
  console.log(`Total des tests: ${totalTests}`);
  console.log(`Tests réussis: ${passedTests}`);
  console.log(`Tests échoués: ${failedTests}`);
  console.log(`Taux de réussite: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests > 0) {
    console.log('\n⚠️  Certains tests ont échoué. Vérifiez les logs ci-dessus.');
    process.exit(1);
  } else {
    console.log('\n🎉 Tous les tests de rôles ont réussi !');
    process.exit(0);
  }
}

// Exécuter les tests
runAllRoleTests().catch(error => {
  console.error('❌ Erreur critique:', error);
  process.exit(1);
});
