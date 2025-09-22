const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import des modèles
const User = require('../models/User');
const Company = require('../models/Company');
const Store = require('../models/Store');

// Configuration MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Alpaoumarbarry:Alpha.o.b5@cluster0.nokkhsj.mongodb.net/afrigest';

async function createElectoAfricaDemo() {
    try {
        console.log('🚀 Démarrage de la création de la démo ELECTO AFRICA...');
        
        // Connexion à MongoDB
        console.log('🔌 Connexion à MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connecté à MongoDB');

        // 0. Trouver ou créer un super admin pour createdBy
        console.log('\n🔍 Recherche d\'un super admin...');
        let superAdmin = await User.findOne({ role: 'super_admin' });
        
        if (!superAdmin) {
            console.log('⚠️ Aucun super admin trouvé. Création d\'un super admin temporaire...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            superAdmin = new User({
                firstName: 'Super',
                lastName: 'Admin',
                email: 'superadmin@afrigest.com',
                password: hashedPassword,
                role: 'super_admin',
                status: 'active',
                permissions: {
                    canManageSystem: true,
                    canManageCompanies: true,
                    canManageSuperAdmins: true,
                    canViewGlobalReports: true,
                    canManageCompany: false,
                    canManageStores: false,
                    canManageUsers: false,
                    canManageProducts: false,
                    canManageInventory: false,
                    canManageSales: false,
                    canViewReports: false,
                    canManageAccounting: false
                }
            });
            await superAdmin.save();
            console.log('✅ Super admin temporaire créé avec l\'ID:', superAdmin._id);
        } else {
            console.log('✅ Super admin trouvé:', superAdmin.email);
        }

        // 1. Créer ou récupérer l'entreprise ELECTO AFRICA
        console.log('\n📊 Recherche de l\'entreprise ELECTO AFRICA...');
        
        let electoAfrica = await Company.findOne({ name: 'ELECTO AFRICA' });
        
        if (!electoAfrica) {
            console.log('Création de l\'entreprise ELECTO AFRICA...');
            electoAfrica = new Company({
                name: 'ELECTO AFRICA',
                email: 'contact@electoafrica.com',
                phone: '+225 20 30 40 50',
                address: {
                    street: 'Cocody',
                    city: 'Abidjan',
                    country: 'Côte d\'Ivoire'
                },
                description: 'Entreprise leader dans l\'électricité et les solutions énergétiques en Afrique de l\'Ouest',
                status: 'active',
                createdBy: superAdmin._id,
                settings: {
                    currency: 'XOF',
                    timezone: 'Africa/Abidjan',
                    language: 'fr'
                }
            });

            await electoAfrica.save();
            console.log('✅ Entreprise ELECTO AFRICA créée avec l\'ID:', electoAfrica._id);
        } else {
            console.log('✅ Entreprise ELECTO AFRICA trouvée avec l\'ID:', electoAfrica._id);
        }

        // 2. Créer ou récupérer le magasin principal (Siège Social)
        console.log('\n🏢 Recherche du magasin principal...');
        
        let mainStore = await Store.findOne({ code: 'ELE-001' });
        
        if (!mainStore) {
            console.log('Création du magasin principal...');
            mainStore = new Store({
            name: 'Siège Social - Cocody',
            code: 'ELE-001',
            address: {
                street: 'Cocody',
                city: 'Abidjan',
                country: 'Côte d\'Ivoire'
            },
            phone: '+225 20 30 40 50',
            email: 'cocody@electoafrica.com',
            type: 'physical',
            companyId: electoAfrica._id,
            createdBy: superAdmin._id,
            status: 'active',
            settings: {
                workingHours: {
                    monday: { open: '08:00', close: '18:00', isOpen: true },
                    tuesday: { open: '08:00', close: '18:00', isOpen: true },
                    wednesday: { open: '08:00', close: '18:00', isOpen: true },
                    thursday: { open: '08:00', close: '18:00', isOpen: true },
                    friday: { open: '08:00', close: '18:00', isOpen: true },
                    saturday: { open: '08:00', close: '13:00', isOpen: true },
                    sunday: { open: 'closed', close: 'closed', isOpen: false }
                }
            }
        });

            await mainStore.save();
            console.log('✅ Magasin principal créé avec l\'ID:', mainStore._id);
        } else {
            console.log('✅ Magasin principal trouvé avec l\'ID:', mainStore._id);
        }

        // 3. Créer ou récupérer le magasin Yopougon
        console.log('\n🏪 Recherche du magasin Yopougon...');
        
        let yopougonStore = await Store.findOne({ code: 'ELE-002' });
        
        if (!yopougonStore) {
            console.log('Création du magasin Yopougon...');
            yopougonStore = new Store({
            name: 'Magasin Yopougon',
            code: 'ELE-002',
            address: {
                street: 'Yopougon',
                city: 'Abidjan',
                country: 'Côte d\'Ivoire'
            },
            phone: '+225 20 30 40 51',
            email: 'yopougon@electoafrica.com',
            type: 'physical',
            companyId: electoAfrica._id,
            createdBy: superAdmin._id,
            status: 'active',
            settings: {
                workingHours: {
                    monday: { open: '08:00', close: '18:00', isOpen: true },
                    tuesday: { open: '08:00', close: '18:00', isOpen: true },
                    wednesday: { open: '08:00', close: '18:00', isOpen: true },
                    thursday: { open: '08:00', close: '18:00', isOpen: true },
                    friday: { open: '08:00', close: '18:00', isOpen: true },
                    saturday: { open: '08:00', close: '13:00', isOpen: true },
                    sunday: { open: 'closed', close: 'closed', isOpen: false }
                }
            }
        });

            await yopougonStore.save();
            console.log('✅ Magasin Yopougon créé avec l\'ID:', yopougonStore._id);
        } else {
            console.log('✅ Magasin Yopougon trouvé avec l\'ID:', yopougonStore._id);
        }

        // 4. Créer le PDG (Admin d'entreprise)
        console.log('\n👔 Création du PDG...');
        
        const hashedPassword = await bcrypt.hash('pdg123', 10);
        
        const pdg = new User({
            firstName: 'Jean-Baptiste',
            lastName: 'KOUAME',
            email: 'pdg@electoafrica.com',
            password: hashedPassword,
            role: 'company_admin',
            company: electoAfrica._id,
            store: mainStore._id,
            phone: '+225 07 12 34 56 78',
            address: 'Cocody, Abidjan',
            status: 'active',
            permissions: {
                canManageSystem: false,
                canManageCompanies: false,
                canManageSuperAdmins: false,
                canViewGlobalReports: false,
                canManageCompany: true,
                canManageStores: true,
                canManageUsers: true,
                canManageProducts: true,
                canManageInventory: true,
                canManageSales: true,
                canViewReports: true,
                canManageAccounting: true
            }
        });

        await pdg.save();
        console.log('✅ PDG créé avec l\'ID:', pdg._id);

        // 5. Créer le Directeur Général
        console.log('\n👨‍💼 Création du Directeur Général...');
        
        const dg = new User({
            firstName: 'Marie-Claire',
            lastName: 'DIABATE',
            email: 'dg@electoafrica.com',
            password: hashedPassword,
            role: 'dg',
            company: electoAfrica._id,
            store: mainStore._id,
            phone: '+225 07 12 34 56 79',
            address: 'Cocody, Abidjan',
            status: 'active',
            permissions: {
                canManageSystem: false,
                canManageCompanies: false,
                canManageSuperAdmins: false,
                canViewGlobalReports: false,
                canManageCompany: false,
                canManageStores: true,
                canManageUsers: true,
                canManageProducts: true,
                canManageInventory: true,
                canManageSales: true,
                canViewReports: true,
                canManageAccounting: false
            }
        });

        await dg.save();
        console.log('✅ Directeur Général créé avec l\'ID:', dg._id);

        // 6. Créer le Gestionnaire du magasin Yopougon
        console.log('\n👨‍💻 Création du Gestionnaire Yopougon...');
        
        const storeManager = new User({
            firstName: 'Kouassi',
            lastName: 'TRAORE',
            email: 'manager.yopougon@electoafrica.com',
            password: hashedPassword,
            role: 'store_manager',
            company: electoAfrica._id,
            store: yopougonStore._id,
            phone: '+225 07 12 34 56 80',
            address: 'Yopougon, Abidjan',
            status: 'active',
            permissions: {
                canManageSystem: false,
                canManageCompanies: false,
                canManageSuperAdmins: false,
                canViewGlobalReports: false,
                canManageCompany: false,
                canManageStores: false,
                canManageUsers: false,
                canManageProducts: true,
                canManageInventory: true,
                canManageSales: true,
                canViewReports: true,
                canManageAccounting: false
            }
        });

        await storeManager.save();
        console.log('✅ Gestionnaire Yopougon créé avec l\'ID:', storeManager._id);

        // 7. Créer des employés
        console.log('\n👷 Création des employés...');
        
        const employees = [
            {
                firstName: 'Fatou',
                lastName: 'DIALLO',
                email: 'fatou.diallo@electoafrica.com',
                role: 'employee',
                store: mainStore._id,
                phone: '+225 07 12 34 56 81'
            },
            {
                firstName: 'Moussa',
                lastName: 'SANGARE',
                email: 'moussa.sangare@electoafrica.com',
                role: 'employee',
                store: yopougonStore._id,
                phone: '+225 07 12 34 56 82'
            }
        ];

        for (const empData of employees) {
            const employee = new User({
                ...empData,
                password: hashedPassword,
                company: electoAfrica._id,
                address: empData.store.toString() === mainStore._id.toString() ? 'Cocody, Abidjan' : 'Yopougon, Abidjan',
                status: 'active',
                permissions: {
                    canManageSystem: false,
                    canManageCompanies: false,
                    canManageSuperAdmins: false,
                    canViewGlobalReports: false,
                    canManageCompany: false,
                    canManageStores: false,
                    canManageUsers: false,
                    canManageProducts: false,
                    canManageInventory: false,
                    canManageSales: true,
                    canViewReports: false,
                    canManageAccounting: false
                }
            });

            await employee.save();
            console.log(`✅ Employé ${empData.firstName} ${empData.lastName} créé avec l'ID:`, employee._id);
        }

        // 8. Mettre à jour l'entreprise avec les magasins
        electoAfrica.stores = [mainStore._id, yopougonStore._id];
        await electoAfrica.save();

        console.log('\n🎉 DÉMO ELECTO AFRICA CRÉÉE AVEC SUCCÈS !');
        console.log('\n📋 RÉSUMÉ DE LA DÉMO:');
        console.log('=====================================');
        console.log(`🏢 Entreprise: ${electoAfrica.name} (${electoAfrica._id})`);
        console.log(`📧 Email: ${electoAfrica.email}`);
        console.log(`📞 Téléphone: ${electoAfrica.phone}`);
        console.log(`📍 Adresse: ${electoAfrica.address}`);
        console.log('\n🏪 MAGASINS:');
        console.log(`   • ${mainStore.name} (${mainStore._id})`);
        console.log(`   • ${yopougonStore.name} (${yopougonStore._id})`);
        console.log('\n👥 UTILISATEURS:');
        console.log(`   • PDG: ${pdg.firstName} ${pdg.lastName} (${pdg.email}) - Mot de passe: pdg123`);
        console.log(`   • DG: ${dg.firstName} ${dg.lastName} (${dg.email}) - Mot de passe: pdg123`);
        console.log(`   • Manager Yopougon: ${storeManager.firstName} ${storeManager.lastName} (${storeManager.email}) - Mot de passe: pdg123`);
        console.log(`   • Employés: Fatou DIALLO, Moussa SANGARE - Mot de passe: pdg123`);
        console.log('\n🔐 CONNEXION:');
        console.log('   Vous pouvez maintenant vous connecter avec n\'importe quel compte ci-dessus');
        console.log('   pour tester les différentes fonctionnalités selon les rôles.');

    } catch (error) {
        console.error('❌ Erreur lors de la création de la démo:', error);
    } finally {
        // Déconnexion
        await mongoose.disconnect();
        console.log('\n🔌 Déconnecté de MongoDB');
    }
}

// Exécution du script
createElectoAfricaDemo();