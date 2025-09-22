const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
require('dotenv').config();

const createRealSuperAdmin = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DBNAME || 'afrigest'
    });
    console.log('✅ Connecté à MongoDB');

    // Vérifier si un super admin existe déjà
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      console.log('⚠️  Un super admin existe déjà:', existingSuperAdmin.email);
      console.log('🔄 Mise à jour des permissions...');
      
      // Mettre à jour les permissions (concepteur/créateur uniquement)
      existingSuperAdmin.permissions = {
        canManageSystem: true,
        canManageCompanies: true,
        canManageSuperAdmins: true,
        canViewGlobalReports: true,
        // Pas de gestion opérationnelle directe
        canManageUsers: false,
        canViewAccounting: false,
        canManageInventory: false,
        canProcessSales: false,
        canViewReports: false
      };
      
      await existingSuperAdmin.save();
      console.log('✅ Permissions du super admin mises à jour !');
      console.log('📧 Email:', existingSuperAdmin.email);
      console.log('🔑 Mot de passe: admin123');
      process.exit(0);
    }

    // Créer le vrai super admin (concepteur/créateur)
    const superAdmin = new User({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@afrigest.com',
      password: 'admin123', // Mot de passe par défaut
      role: 'super_admin',
      isActive: true,
      isEmailVerified: true,
      permissions: {
        // Permissions de concepteur/créateur uniquement
        canManageSystem: true,        // Gestion du système global
        canManageCompanies: true,     // Créer/supprimer des entreprises
        canManageSuperAdmins: true,   // Créer d'autres super admins
        canViewGlobalReports: true,   // Rapports de toutes les entreprises
        // Pas de gestion opérationnelle directe
        canManageUsers: false,        // Pas de gestion directe des utilisateurs
        canViewAccounting: false,     // Pas d'accès direct à la comptabilité
        canManageInventory: false,    // Pas de gestion directe de l'inventaire
        canProcessSales: false,       // Pas de gestion directe des ventes
        canViewReports: false         // Pas d'accès direct aux rapports opérationnels
      }
    });

    await superAdmin.save();
    console.log('✅ Vrai Super Admin créé avec succès !');
    console.log('📧 Email:', superAdmin.email);
    console.log('🔑 Mot de passe: admin123');
    console.log('🎯 Rôle: Concepteur/Créateur');
    console.log('⚠️  N\'oubliez pas de changer le mot de passe après la première connexion !');

    // Créer une entreprise d'exemple pour les tests
    const exampleCompany = new Company({
      name: 'Entreprise d\'exemple',
      code: 'EXEMPLE',
      email: 'contact@exemple.com',
      phone: '+225 07 00 00 00 00',
      address: {
        street: '123 Rue de l\'exemple',
        city: 'Abidjan',
        state: 'Abidjan',
        zipCode: '00225',
        country: 'Côte d\'Ivoire'
      },
      status: 'active',
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

createRealSuperAdmin();
