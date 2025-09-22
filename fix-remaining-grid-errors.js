const fs = require('fs');
const path = require('path');

// Fonction pour corriger les props Grid2 mal formatées
function fixGrid2Props(content) {
  // Corriger les patterns comme: size={{ xs: {12} size={{ sm: {6}>
  content = content.replace(
    /size=\{\{\s*(\w+):\s*\{(\d+)\}\s*size=\{\{\s*(\w+):\s*\{(\d+)\}\s*>/g,
    (match, xs, xsVal, sm, smVal) => {
      return `size={{ xs: ${xsVal}, ${sm}: ${smVal} }}>`;
    }
  );
  
  // Corriger les patterns comme: size={{ xs: {12}>
  content = content.replace(
    /size=\{\{\s*(\w+):\s*\{(\d+)\}\s*>/g,
    (match, prop, value) => {
      return `size={{ ${prop}: ${value} }}>`;
    }
  );
  
  // Corriger les patterns comme: size={{ xs: {12} size={{ md: {4}>
  content = content.replace(
    /size=\{\{\s*(\w+):\s*\{(\d+)\}\s*size=\{\{\s*(\w+):\s*\{(\d+)\}\s*>/g,
    (match, xs, xsVal, md, mdVal) => {
      return `size={{ xs: ${xsVal}, ${md}: ${mdVal} }}>`;
    }
  );
  
  return content;
}

// Fonction pour traiter un fichier
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    
    // Appliquer les corrections
    updatedContent = fixGrid2Props(updatedContent);
    
    // Écrire le fichier modifié
    if (updatedContent !== content) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ Corrigé: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${filePath}:`, error.message);
    return false;
  }
}

// Traitement des fichiers spécifiques
const filesToFix = [
  'client/src/components/companies/CreateCompanyWithAdmin.tsx',
  'client/src/components/global-reports/GlobalReports.tsx'
];

console.log('🔧 Correction des props Grid2 mal formatées...');

let totalFixed = 0;
filesToFix.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    if (processFile(fullPath)) {
      totalFixed++;
    }
  } else {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
  }
});

console.log(`\n✨ Correction terminée! ${totalFixed} fichiers modifiés.`);
