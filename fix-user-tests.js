// Script pour corriger automatiquement tous les tests User
const fs = require('fs');
const path = require('path');

const testFile = path.join(__dirname, 'tests', 'unit', 'models', 'User.test.js');

// Lire le fichier
let content = fs.readFileSync(testFile, 'utf8');

// Remplacer tous les patterns de données utilisateur incomplètes
const patterns = [
  // Pattern 1: userData avec champs manquants
  {
    from: /const userData = \{\s*firstName: '[^']*',\s*lastName: '[^']*',\s*email: '[^']*',\s*password: '[^']*',\s*role: '[^']*'\s*\};/g,
    to: 'const userData = await createCompleteUserData();'
  },
  // Pattern 2: userData avec email spécifique
  {
    from: /const userData = \{\s*firstName: '[^']*',\s*lastName: '[^']*',\s*email: '([^']*)',\s*password: '[^']*',\s*role: '[^']*'\s*\};/g,
    to: (match, email) => `const userData = await createCompleteUserData({ email: '${email}' });`
  },
  // Pattern 3: userData avec role spécifique
  {
    from: /const userData = \{\s*firstName: '[^']*',\s*lastName: '[^']*',\s*email: '[^']*',\s*password: '[^']*',\s*role: '([^']*)'\s*\};/g,
    to: (match, role) => `const userData = await createCompleteUserData({ role: '${role}' });`
  }
];

// Appliquer les remplacements
patterns.forEach(pattern => {
  if (typeof pattern.to === 'function') {
    content = content.replace(pattern.from, pattern.to);
  } else {
    content = content.replace(pattern.from, pattern.to);
  }
});

// Écrire le fichier modifié
fs.writeFileSync(testFile, content, 'utf8');

console.log('✅ Tests User corrigés automatiquement !');
