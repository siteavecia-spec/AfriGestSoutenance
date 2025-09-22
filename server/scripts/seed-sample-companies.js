require('dotenv').config({ path: process.cwd() + '/.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Store = require('../models/Store');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DBNAME = process.env.MONGODB_DBNAME || 'afrigest';

async function seedSampleCompanies() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DBNAME });
    console.log('✅ Connecté à MongoDB (DB:', MONGODB_DBNAME, ')');

    // Trouver un Super Admin existant pour l'attribuer en createdBy
    const superAdmin = await User.findOne({ role: 'super_admin' });
    if (!superAdmin) {
      throw new Error("Aucun super_admin trouvé. Veuillez créer un super admin d'abord.");
    }

    const samples = [
      {
        company: {
          name: 'Alpha Guinée SARL',
          description: "Entreprise de distribution en Guinée",
          email: 'contact@alpha-guinee.com',
          phone: '+224 620 00 00 01',
          address: {
            street: 'Immeuble Boulbinet',
            city: 'Conakry',
            state: 'Conakry',
            country: 'Guinée',
            postalCode: 'GN-001'
          },
          website: 'https://www.alpha-guinee.com',
          industry: 'Distribution',
          size: 'PME',
          status: 'active',
        },
        admin: {
          firstName: 'Mamadou',
          lastName: 'Diallo',
          email: 'admin@alpha-guinee.com',
          password: 'admin123',
          phone: '+224 620 00 00 02',
          role: 'company_admin'
        },
        store: {
          name: 'Alpha Boutique Kaloum',
          code: 'AGK001',
          description: 'Boutique principale à Kaloum',
          address: {
            street: 'Avenue de la République',
            city: 'Conakry',
            state: 'Conakry',
            country: 'Guinée',
            postalCode: 'GN-001'
          },
          phone: '+224 620 00 00 03',
          email: 'kaloum@alpha-guinee.com',
          status: 'active'
        }
      },
      {
        company: {
          name: 'Conakry Market',
          description: 'Supermarché moderne à Conakry',
          email: 'contact@conakrymarket.com',
          phone: '+224 621 11 11 01',
          address: {
            street: 'Corniche Nord',
            city: 'Conakry',
            state: 'Conakry',
            country: 'Guinée',
            postalCode: 'GN-002'
          },
          website: 'https://www.conakrymarket.com',
          industry: 'Commerce de détail',
          size: 'PME',
          status: 'active',
        },
        admin: {
          firstName: 'Aïssatou',
          lastName: 'Bah',
          email: 'admin@conakrymarket.com',
          password: 'admin123',
          phone: '+224 621 11 11 02',
          role: 'company_admin'
        },
        store: {
          name: 'CM Boutique Ratoma',
          code: 'CMR001',
          description: 'Boutique principale à Ratoma',
          address: {
            street: 'Route Le Prince',
            city: 'Conakry',
            state: 'Conakry',
            country: 'Guinée',
            postalCode: 'GN-002'
          },
          phone: '+224 621 11 11 03',
          email: 'ratoma@conakrymarket.com',
          status: 'active'
        }
      }
    ];

    for (const sample of samples) {
      // 1) Créer la société
      const company = new Company({
        ...sample.company,
        settings: { currency: 'GNF' },
        createdBy: superAdmin._id,
      });
      const savedCompany = await company.save();
      console.log('🏢 Entreprise créée:', savedCompany.name, savedCompany._id.toString());

      // 2) Créer l'admin rattaché à la société
      const admin = new User({
        ...sample.admin,
        company: savedCompany._id,
        createdBy: superAdmin._id,
      });
      const savedAdmin = await admin.save();
      console.log('👤 Admin créé:', savedAdmin.fullName, savedAdmin._id.toString());

      // 3) Créer la boutique par défaut
      const store = new Store({
        ...sample.store,
        companyId: savedCompany._id,
        managerId: savedAdmin._id,
        createdBy: savedAdmin._id,
      });
      const savedStore = await store.save();
      console.log('🏪 Boutique créée:', savedStore.name, savedStore._id.toString());
    }

    console.log('✅ Seed terminé.');
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnexion MongoDB');
  }
}

if (require.main === module) {
  seedSampleCompanies();
}

module.exports = seedSampleCompanies;
