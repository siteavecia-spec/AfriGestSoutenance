const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
require('dotenv').config();

const createSuperAdmin = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Alpaoumarbarry:Alpha.o.b5@cluster0.nokkhsj.mongodb.net/afrigest');
    console.log('✅ Connecté à MongoDB');

    // Vérifier si un super admin existe déjà
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      console.log('⚠️  Un super admin existe déjà:', existingSuperAdmin.email);
      process.exit(0);
    }

    // Créer le super admin
    const superAdmin = new User({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@afrigest.com',
      password: 'admin123', // Mot de passe par défaut
      role: 'super_admin',
      isActive: true,
      isEmailVerified: true,
      permissions: {
        canManageUsers: true,
        canViewAccounting: true,
        canManageInventory: true,
        canProcessSales: true,
        canViewReports: true
      }
    });

    await superAdmin.save();
    console.log('✅ Super admin créé avec succès !');
    console.log('📧 Email:', superAdmin.email);
    console.log('🔑 Mot de passe: admin123');
    console.log('⚠️  N\'oubliez pas de changer le mot de passe après la première connexion !');

    // Créer une entreprise d'exemple
    const exampleCompany = new Company({
      name: 'LHT - La Haute Technologie',
      description: 'Entreprise d\'exemple pour démonstration',
      email: 'contact@lht.com',
      phone: '+224 123 456 789',
      address: {
        street: 'Rue du Commerce',
        city: 'Conakry',
        state: 'Conakry',
        country: 'Guinée',
        postalCode: '001'
      },
      legalInfo: {
        legalForm: 'SARL',
        registrationNumber: 'LHT-2024-001'
      },
      settings: {
        currency: 'GNF',
        timezone: 'Africa/Conakry',
        language: 'fr'
      },
      subscription: {
        plan: 'premium',
        maxStores: 10,
        maxUsers: 50
      },
      createdBy: superAdmin._id
    });

    await exampleCompany.save();
    console.log('✅ Entreprise d\'exemple créée:', exampleCompany.name);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la création du super admin:', error);
    process.exit(1);
  }
};

createSuperAdmin();
