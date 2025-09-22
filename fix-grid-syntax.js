const fs = require('fs');
const path = require('path');

// Fichiers à corriger
const files = [
  'client/src/components/companies/CreateCompanyWithAdmin.tsx',
  'client/src/components/global-reports/GlobalReports.tsx',
  'client/src/components/super-admins/SuperAdminManagement.tsx',
  'client/src/components/system/SystemManagement.tsx'
];

function fixGridSyntax(content) {
  // Remplacer Grid item xs={...} par Grid size={{ xs: ... }}
  content = content.replace(/<Grid\s+item\s+xs={(\d+)}/g, '<Grid size={{ xs: $1 }}');
  
  // Remplacer Grid item xs={...} sm={...} par Grid size={{ xs: ..., sm: ... }}
  content = content.replace(/<Grid\s+item\s+xs={(\d+)}\s+sm={(\d+)}/g, '<Grid size={{ xs: $1, sm: $2 }}');
  
  // Remplacer Grid item xs={...} sm={...} md={...} par Grid size={{ xs: ..., sm: ..., md: ... }}
  content = content.replace(/<Grid\s+item\s+xs={(\d+)}\s+sm={(\d+)}\s+md={(\d+)}/g, '<Grid size={{ xs: $1, sm: $2, md: $3 }}');
  
  // Remplacer Grid item xs={...} md={...} par Grid size={{ xs: ..., md: ... }}
  content = content.replace(/<Grid\s+item\s+xs={(\d+)}\s+md={(\d+)}/g, '<Grid size={{ xs: $1, md: $2 }}');
  
  return content;
}

files.forEach(filePath => {
  try {
    const fullPath = path.resolve(filePath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const originalContent = content;
      
      content = fixGridSyntax(content);
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Corrigé: ${filePath}`);
      } else {
        console.log(`ℹ️  Aucun changement: ${filePath}`);
      }
    } else {
      console.log(`❌ Fichier non trouvé: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Erreur avec ${filePath}:`, error.message);
  }
});

console.log('🎉 Correction terminée !');
