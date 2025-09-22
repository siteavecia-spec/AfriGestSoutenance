const fs = require('fs');
const path = require('path');

// Fonction pour corriger les imports Grid
function fixGridImports(content) {
  // Remplacer l'import Grid par Grid2
  content = content.replace(
    /import\s*{\s*([^}]*Grid[^}]*)\s*}\s*from\s*['"]@mui\/material['"];?/g,
    (match, imports) => {
      // Séparer les imports
      const importList = imports.split(',').map(imp => imp.trim());
      
      // Remplacer Grid par Grid2
      const updatedImports = importList.map(imp => {
        if (imp === 'Grid') {
          return 'Grid2';
        }
        return imp;
      });
      
      return `import { ${updatedImports.join(', ')} } from '@mui/material';`;
    }
  );
  
  return content;
}

// Fonction pour corriger les props Grid
function fixGridProps(content) {
  // Remplacer Grid par Grid2 dans les composants
  content = content.replace(/<Grid\s+/g, '<Grid2 ');
  content = content.replace(/<\/Grid>/g, '</Grid2>');
  
  // Corriger les props Grid2
  content = content.replace(
    /<Grid2\s+([^>]*?)>/g,
    (match, props) => {
      // Extraire les props
      const propMatches = props.match(/(\w+)=({[^}]+}|[^\s>]+)/g);
      if (!propMatches) return match;
      
      const newProps = propMatches.map(prop => {
        const [key, value] = prop.split('=');
        
        // Si c'est une prop de taille (xs, sm, md, lg, xl), la convertir
        if (['xs', 'sm', 'md', 'lg', 'xl'].includes(key)) {
          return `size={{ ${key}: ${value} }}`;
        }
        
        // Si c'est la prop item, la supprimer (Grid2 n'en a pas besoin)
        if (key === 'item') {
          return '';
        }
        
        return prop;
      }).filter(prop => prop !== '').join(' ');
      
      return `<Grid2 ${newProps}>`;
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
    updatedContent = fixGridImports(updatedContent);
    updatedContent = fixGridProps(updatedContent);
    
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

// Fonction pour parcourir récursivement les dossiers
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let totalFixed = 0;
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      totalFixed += processDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (processFile(filePath)) {
        totalFixed++;
      }
    }
  });
  
  return totalFixed;
}

// Traitement principal
const srcDir = path.join(__dirname, 'client', 'src');
console.log('🔧 Correction des composants Grid...');
console.log(`📁 Traitement du dossier: ${srcDir}`);

const totalFixed = processDirectory(srcDir);
console.log(`\n✨ Correction terminée! ${totalFixed} fichiers modifiés.`);
