const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
require('dotenv').config();

const createCompanyAdmin = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/afrigest');
    console.log('✅ Connecté à MongoDB');

    // Trouver une entreprise existante ou en créer une
    let company = await Company.findOne();
    if (!company) {
      console.log('⚠️  Aucune entreprise trouvée. Création d\'une entreprise d\'exemple...');
      company = new Company({
        name: 'Entreprise Test',
        code: 'TEST',
        email: 'contact@test.com',
        phone: '+225 07 00 00 00 01',
        address: {
          street: '456 Rue de test',
          city: 'Abidjan',
          state: 'Abidjan',
          zipCode: '00225',
          country: 'Côte d\'Ivoire'
        },
        status: 'active'
      });
      await company.save();
      console.log('✅ Entreprise créée:', company.name);
    }

    // Vérifier si un admin d'entreprise existe déjà
    const existingAdmin = await User.findOne({ 
      role: 'company_admin',
      company: company._id 
    });
    
    if (existingAdmin) {
      console.log('⚠️  Un admin d\'entreprise existe déjà:', existingAdmin.email);
      console.log('📧 Email:', existingAdmin.email);
      console.log('🔑 Mot de passe: admin123');
      process.exit(0);
    }

    // Créer le PDG/Admin d'entreprise
    const companyAdmin = new User({
      firstName: 'PDG',
      lastName: 'Entreprise',
      email: 'pdg@entreprise.com',
      password: 'admin123',
      role: 'company_admin',
      company: company._id,
      isActive: true,
      isEmailVerified: true,
      permissions: {
        // Permissions de PDG/Admin d'entreprise
        canManageSystem: false,
        canManageCompanies: false,
        canManageSuperAdmins: false,
        canViewGlobalReports: false,
        canManageUsers: true,         // Gestion des utilisateurs de son entreprise
        canViewAccounting: true,      // Comptabilité de son entreprise
        canManageInventory: true,     // Inventaire de son entreprise
        canProcessSales: true,        // Ventes de son entreprise
        canViewReports: true          // Rapports de son entreprise
      }
    });

    await companyAdmin.save();
    console.log('✅ PDG/Admin d\'entreprise créé avec succès !');
    console.log('📧 Email:', companyAdmin.email);
    console.log('🔑 Mot de passe: admin123');
    console.log('🎯 Rôle: PDG/Admin Entreprise');
    console.log('🏢 Entreprise:', company.name);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin d\'entreprise:', error);
    process.exit(1);
  }
};

createCompanyAdmin();
