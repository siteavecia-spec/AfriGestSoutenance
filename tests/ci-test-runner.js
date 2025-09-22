#!/usr/bin/env node

// Script de test pour CI/CD
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  testTimeout: 300000, // 5 minutes
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testSuites: [
    'test:unit',
    'test:api',
    'test:integration',
    'test:coverage'
  ]
};

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Fonction pour logger avec couleur
const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Fonction pour exécuter une commande
const runCommand = (command, description) => {
  log(`\n${colors.cyan}🔄 ${description}...${colors.reset}`);
  log(`${colors.yellow}Commande: ${command}${colors.reset}`);
  
  try {
    const startTime = Date.now();
    const output = execSync(command, { 
      stdio: 'inherit',
      timeout: config.testTimeout,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    const duration = Date.now() - startTime;
    
    log(`${colors.green}✅ ${description} terminé en ${duration}ms${colors.reset}`);
    return { success: true, duration };
  } catch (error) {
    log(`${colors.red}❌ ${description} échoué: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
};

// Fonction pour vérifier la couverture de code
const checkCoverage = () => {
  const coveragePath = path.join(__dirname, '..', 'coverage', 'lcov-report', 'index.html');
  
  if (!fs.existsSync(coveragePath)) {
    log(`${colors.red}❌ Rapport de couverture non trouvé${colors.reset}`);
    return false;
  }
  
  // Lire le rapport de couverture
  const coverageReport = fs.readFileSync(coveragePath, 'utf8');
  
  // Extraire les pourcentages (simplifié)
  const linesMatch = coverageReport.match(/Lines\s*:\s*(\d+\.?\d*)%/);
  const functionsMatch = coverageReport.match(/Functions\s*:\s*(\d+\.?\d*)%/);
  const branchesMatch = coverageReport.match(/Branches\s*:\s*(\d+\.?\d*)%/);
  const statementsMatch = coverageReport.match(/Statements\s*:\s*(\d+\.?\d*)%/);
  
  if (linesMatch && functionsMatch && branchesMatch && statementsMatch) {
    const lines = parseFloat(linesMatch[1]);
    const functions = parseFloat(functionsMatch[1]);
    const branches = parseFloat(branchesMatch[1]);
    const statements = parseFloat(statementsMatch[1]);
    
    log(`${colors.cyan}📊 Couverture de code:${colors.reset}`);
    log(`   Lines: ${lines}% (minimum: ${config.coverageThreshold.global.lines}%)`);
    log(`   Functions: ${functions}% (minimum: ${config.coverageThreshold.global.functions}%)`);
    log(`   Branches: ${branches}% (minimum: ${config.coverageThreshold.global.branches}%)`);
    log(`   Statements: ${statements}% (minimum: ${config.coverageThreshold.global.statements}%)`);
    
    const meetsThreshold = 
      lines >= config.coverageThreshold.global.lines &&
      functions >= config.coverageThreshold.global.functions &&
      branches >= config.coverageThreshold.global.branches &&
      statements >= config.coverageThreshold.global.statements;
    
    if (meetsThreshold) {
      log(`${colors.green}✅ Couverture de code acceptable${colors.reset}`);
      return true;
    } else {
      log(`${colors.red}❌ Couverture de code insuffisante${colors.reset}`);
      return false;
    }
  }
  
  log(`${colors.yellow}⚠️ Impossible de lire le rapport de couverture${colors.reset}`);
  return false;
};

// Fonction pour générer un rapport de test
const generateTestReport = (results) => {
  const reportPath = path.join(__dirname, '..', 'test-results.json');
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'test',
    results: results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0)
    }
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`${colors.cyan}📄 Rapport de test généré: ${reportPath}${colors.reset}`);
  
  return report;
};

// Fonction principale
const runCITests = async () => {
  log(`${colors.bright}${colors.blue}🚀 Démarrage des tests CI/CD AfriGest${colors.reset}`);
  log(`${colors.cyan}⏰ Timeout: ${config.testTimeout}ms${colors.reset}`);
  log(`${colors.cyan}📊 Seuil de couverture: ${config.coverageThreshold.global.lines}%${colors.reset}`);
  
  const results = [];
  let allTestsPassed = true;
  
  // Exécuter chaque suite de tests
  for (const testSuite of config.testSuites) {
    const result = runCommand(`npm run ${testSuite}`, `Suite de tests: ${testSuite}`);
    results.push({ suite: testSuite, ...result });
    
    if (!result.success) {
      allTestsPassed = false;
    }
  }
  
  // Vérifier la couverture de code
  const coveragePassed = checkCoverage();
  if (!coveragePassed) {
    allTestsPassed = false;
  }
  
  // Générer le rapport
  const report = generateTestReport(results);
  
  // Afficher le résumé
  log(`\n${colors.bright}${colors.blue}📋 Résumé des tests CI/CD${colors.reset}`);
  log(`${colors.cyan}Total des suites: ${report.summary.total}${colors.reset}`);
  log(`${colors.green}Suites réussies: ${report.summary.passed}${colors.reset}`);
  log(`${colors.red}Suites échouées: ${report.summary.failed}${colors.reset}`);
  log(`${colors.yellow}Durée totale: ${report.summary.totalDuration}ms${colors.reset}`);
  log(`${colors.cyan}Couverture: ${coveragePassed ? '✅ Acceptable' : '❌ Insuffisante'}${colors.reset}`);
  
  if (allTestsPassed && coveragePassed) {
    log(`\n${colors.bright}${colors.green}🎉 Tous les tests CI/CD sont passés avec succès !${colors.reset}`);
    process.exit(0);
  } else {
    log(`\n${colors.bright}${colors.red}💥 Certains tests CI/CD ont échoué${colors.reset}`);
    process.exit(1);
  }
};

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  log(`${colors.red}❌ Erreur non gérée: ${error.message}${colors.reset}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`${colors.red}❌ Promesse rejetée: ${reason}${colors.reset}`);
  process.exit(1);
});

// Exécuter les tests
if (require.main === module) {
  runCITests().catch(error => {
    log(`${colors.red}❌ Erreur lors de l'exécution des tests CI/CD: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { runCITests, checkCoverage, generateTestReport };
