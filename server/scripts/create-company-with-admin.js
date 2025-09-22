const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Store = require('../models/Store');

// Configuration de la base de données
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DBNAME = process.env.MONGODB_DBNAME || 'afrigest';

async function createCompanyWithAdmin() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DBNAME });
    console.log('✅ Connecté à MongoDB');

    // Données de l'entreprise à créer
    const companyData = {
      name: 'Entreprise Demo',
      description: 'Entreprise de démonstration créée par le Super Admin',
      email: 'contact@entreprisedemo.com',
      phone: '+225 07 00 00 00 01',
      address: {
        street: '123 Avenue de la République',
        city: 'Abidjan',
        state: 'Abidjan',
        country: 'Côte d\'Ivoire',
        postalCode: '00225'
      },
      website: 'https://www.entreprisedemo.com',
      industry: 'Commerce de détail',
      size: 'PME',
      status: 'active'
    };

    // Données de l'admin (PDG) à créer
    const adminData = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'admin@entreprisedemo.com',
      password: 'admin123',
      phone: '+225 07 00 00 00 02',
      role: 'company_admin'
    };

    // 1. Créer l'entreprise
    console.log('🏢 Création de l\'entreprise...');
    const company = new Company({
      ...companyData,
      createdBy: null // Le Super Admin n'a pas besoin d'être dans la relation
    });
    
    const savedCompany = await company.save();
    console.log('✅ Entreprise créée:', savedCompany.name);

    // 2. Créer l'admin (PDG) lié à l'entreprise
    console.log('👤 Création de l\'admin (PDG)...');
    const admin = new User({
      ...adminData,
      company: savedCompany._id
    });
    
    const savedAdmin = await admin.save();
    console.log('✅ Admin (PDG) créé:', savedAdmin.fullName);

    // 3. Créer une boutique par défaut pour l'entreprise
    console.log('🏪 Création de la boutique par défaut...');
    const store = new Store({
      name: 'Boutique Principale',
      code: 'BP001',
      description: 'Boutique principale de l\'entreprise',
      address: {
        street: '123 Avenue de la République',
        city: 'Abidjan',
        state: 'Abidjan',
        country: 'Côte d\'Ivoire',
        postalCode: '00225'
      },
      phone: '+225 07 00 00 00 03',
      email: 'boutique@entreprisedemo.com',
      manager: savedAdmin._id,
      company: savedCompany._id,
      status: 'active',
      createdBy: savedAdmin._id
    });
    
    const savedStore = await store.save();
    console.log('✅ Boutique créée:', savedStore.name);

    // 4. Mettre à jour l'admin avec la boutique par défaut
    savedAdmin.store = savedStore._id;
    await savedAdmin.save();
    console.log('✅ Admin lié à la boutique');

    // 5. Afficher le résumé
    console.log('\n🎉 CRÉATION TERMINÉE !');
    console.log('================================');
    console.log('🏢 Entreprise:', savedCompany.name);
    console.log('   ID:', savedCompany._id);
    console.log('   Email:', savedCompany.email);
    console.log('   Statut:', savedCompany.status);
    console.log('');
    console.log('👤 Admin (PDG):', savedAdmin.fullName);
    console.log('   Email:', savedAdmin.email);
    console.log('   Mot de passe: admin123');
    console.log('   Rôle:', savedAdmin.role);
    console.log('   Entreprise liée:', savedCompany.name);
    console.log('');
    console.log('🏪 Boutique:', savedStore.name);
    console.log('   Code:', savedStore.code);
    console.log('   Manager:', savedAdmin.fullName);
    console.log('   Statut:', savedStore.status);
    console.log('');
    console.log('🔗 RELATIONS ÉTABLIES:');
    console.log('   Super Admin → Crée → Entreprise');
    console.log('   Entreprise → Contient → Admin (PDG)');
    console.log('   Admin (PDG) → Gère → Boutique');
    console.log('   Boutique → Appartient → Entreprise');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code === 11000) {
      console.error('💡 Email déjà utilisé. Changez l\'email dans le script.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

// Exécution du script
if (require.main === module) {
  createCompanyWithAdmin();
}

module.exports = createCompanyWithAdmin;
