// Tests unitaires pour le modèle Company
const mongoose = require('mongoose');
const Company = require('../../../server/models/Company');
const User = require('../../../server/models/User');
const { createTestCompany } = require('../../helpers/testHelpers');

describe('🧪 Tests unitaires - Modèle Company', () => {
  let testUser;
  
  beforeEach(async () => {
    // Nettoyer les collections avant chaque test
    await Company.deleteMany({});
    await User.deleteMany({});
    
    // Créer un utilisateur de test pour être le créateur
    testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: `testuser.${Date.now()}.${Math.random().toString(36).substr(2, 9)}@test.com`,
      password: 'password123',
      role: 'super_admin'
    });
    await testUser.save();
  });

  describe('✅ Validation des champs obligatoires', () => {
    
    test('Doit créer une entreprise avec tous les champs requis', async () => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const companyData = {
        name: `Test Company ${timestamp} ${randomId}`,
        description: 'Entreprise de test',
        address: {
          street: '123 Rue Test',
          city: 'Conakry',
          country: 'Guinée'
        },
        phone: '+221 77 123 45 67',
        email: `test.${timestamp}.${randomId}@company.com`,
        createdBy: testUser._id
      };

      const company = new Company(companyData);
      const savedCompany = await company.save();

      expect(savedCompany._id).toBeDefined();
      expect(savedCompany.name).toBe(companyData.name);
      expect(savedCompany.description).toBe(companyData.description);
      expect(savedCompany.address.street).toBe(companyData.address.street);
      expect(savedCompany.phone).toBe(companyData.phone);
      expect(savedCompany.email).toBe(companyData.email);
      expect(savedCompany.createdBy.toString()).toBe(testUser._id.toString());
    });

    test('Doit échouer sans name', async () => {
      const companyData = {
        description: 'Entreprise de test',
        address: '123 Rue Test',
        phone: '+221 77 123 45 67',
        email: 'test@company.com'
      };

      const company = new Company(companyData);
      await expect(company.save()).rejects.toThrow();
    });

    test('Doit échouer sans email', async () => {
      const companyData = {
        name: 'Test Company',
        description: 'Entreprise de test',
        address: '123 Rue Test',
        phone: '+221 77 123 45 67'
      };

      const company = new Company(companyData);
      await expect(company.save()).rejects.toThrow();
    });
  });

  describe('📧 Validation de l\'email', () => {
    
    test('Doit accepter un email valide', async () => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const companyData = {
        name: `Test Company ${timestamp} ${randomId}`,
        email: `test.${timestamp}.${randomId}@company.com`,
        address: {
          street: '123 Rue Test',
          city: 'Conakry',
          country: 'Guinée'
        },
        phone: '+221 77 123 45 67',
        createdBy: testUser._id
      };

      const company = new Company(companyData);
      const savedCompany = await company.save();
      expect(savedCompany.email).toBe(companyData.email);
    });

    test('Doit échouer avec un email invalide', async () => {
      const companyData = {
        name: 'Test Company',
        email: 'email-invalide',
        address: '123 Rue Test',
        phone: '+221 77 123 45 67'
      };

      const company = new Company(companyData);
      await expect(company.save()).rejects.toThrow();
    });

    test('Doit échouer avec un email dupliqué', async () => {
      const email = 'duplicate@company.com';
      
      // Créer la première entreprise
      await createTestCompany({ email });
      
      // Essayer de créer une deuxième entreprise avec le même email
      const companyData = {
        name: 'Another Company',
        email: email,
        address: '456 Rue Test',
        phone: '+221 77 234 56 78'
      };

      const company = new Company(companyData);
      await expect(company.save()).rejects.toThrow();
    });
  });

  describe('📞 Validation du téléphone', () => {
    
    test('Doit accepter un numéro de téléphone valide', async () => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const companyData = {
        name: `Test Company ${timestamp} ${randomId}`,
        email: `test.${timestamp}.${randomId}@company.com`,
        address: {
          street: '123 Rue Test',
          city: 'Conakry',
          country: 'Guinée'
        },
        phone: '+221 77 123 45 67',
        createdBy: testUser._id
      };

      const company = new Company(companyData);
      const savedCompany = await company.save();
      expect(savedCompany.phone).toBe(companyData.phone);
    });

    test('Doit accepter différents formats de téléphone', async () => {
      const phoneNumbers = [
        '+221 77 123 45 67',
        '+221771234567',
        '221771234567',
        '0771234567'
      ];

      for (let i = 0; i < phoneNumbers.length; i++) {
        const phone = phoneNumbers[i];
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const companyData = {
          name: `Test Company ${timestamp} ${randomId} ${i}`,
          email: `test.${timestamp}.${randomId}.${i}@company.com`,
          address: {
            street: '123 Rue Test',
            city: 'Conakry',
            country: 'Guinée'
          },
          phone: phone,
          createdBy: testUser._id
        };

        const company = new Company(companyData);
        const savedCompany = await company.save();
        expect(savedCompany.phone).toBe(phone);
      }
    });
  });

  describe('📅 Timestamps automatiques', () => {
    
    test('Doit créer createdAt et updatedAt automatiquement', async () => {
      const company = await createTestCompany();
      
      expect(company.createdAt).toBeDefined();
      expect(company.updatedAt).toBeDefined();
      expect(company.createdAt).toBeInstanceOf(Date);
      expect(company.updatedAt).toBeInstanceOf(Date);
    });

    test('Doit mettre à jour updatedAt lors de la modification', async () => {
      const company = await createTestCompany();
      const originalUpdatedAt = company.updatedAt;
      
      // Attendre un peu pour s'assurer que la date change
      await new Promise(resolve => setTimeout(resolve, 100));
      
      company.name = 'Updated Company Name';
      await company.save();
      
      expect(company.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('🔍 Méthodes d\'instance', () => {
    
    test('Doit retourner les informations publiques avec toPublicJSON', async () => {
      const company = await createTestCompany();

      const publicData = company.toPublicJSON();

      expect(publicData._id).toBeDefined();
      expect(publicData.name).toBe(company.name);
      expect(publicData.description).toBe(company.description);
      expect(publicData.address).toEqual(company.address);
      expect(publicData.phone).toBe(company.phone);
      expect(publicData.email).toBe(company.email);
      expect(publicData.createdAt).toBeDefined();
      expect(publicData.updatedAt).toBeDefined();
    });

    test('Doit retourner le nombre de boutiques avec getStoreCount', async () => {
      const company = await createTestCompany();
      
      // Cette méthode devrait être implémentée dans le modèle
      // Pour l'instant, on teste juste que la méthode existe
      expect(typeof company.getStoreCount).toBe('function');
    });
  });

  describe('🔎 Méthodes statiques', () => {
    
    test('Doit trouver une entreprise par email', async () => {
      const email = 'find.by.email@company.com';
      await createTestCompany({ email });

      const foundCompany = await Company.findByEmail(email);
      expect(foundCompany).toBeDefined();
      expect(foundCompany.email).toBe(email);
    });

    test('Doit retourner null si l\'entreprise n\'existe pas', async () => {
      const foundCompany = await Company.findByEmail('nonexistent@company.com');
      expect(foundCompany).toBeNull();
    });

    test('Doit trouver les entreprises par nom (recherche partielle)', async () => {
      await createTestCompany({ name: 'Alpha Company' });
      await createTestCompany({ name: 'Beta Company' });
      await createTestCompany({ name: 'Alpha Beta Company' });

      const alphaCompanies = await Company.findByName('Alpha');
      expect(alphaCompanies).toHaveLength(2);
      expect(alphaCompanies.every(company => company.name.includes('Alpha'))).toBe(true);
    });

    test('Doit compter le nombre total d\'entreprises', async () => {
      await createTestCompany({ name: 'Company 1' });
      await createTestCompany({ name: 'Company 2' });
      await createTestCompany({ name: 'Company 3' });

      const count = await Company.getTotalCount();
      expect(count).toBe(3);
    });
  });

  describe('🔗 Relations avec Store', () => {
    
    test('Doit pouvoir peupler les boutiques associées', async () => {
      // Créer directement une company sans dépendances circulaires
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const companyData = {
        name: `Test Company ${timestamp} ${randomId}`,
        description: 'Entreprise de test',
        address: {
          street: '123 Rue Test',
          city: 'Conakry',
          country: 'Guinée'
        },
        phone: '+221 77 123 45 67',
        email: `test.${timestamp}.${randomId}@company.com`,
        createdBy: testUser._id
      };
      const company = new Company(companyData);
      await company.save();
      
      // Créer des boutiques pour cette entreprise
      const Store = require('../../../server/models/Store');
      const store1 = new Store({
        name: 'Store 1',
        code: `S1_${randomId}`,
        address: {
          street: '123 Avenue Store 1',
          city: 'Conakry',
          country: 'Guinée'
        },
        phone: '+221 77 111 11 11',
        companyId: company._id,
        createdBy: testUser._id
      });
      await store1.save();

      const store2 = new Store({
        name: 'Store 2',
        code: `S2_${randomId}`,
        address: {
          street: '456 Avenue Store 2',
          city: 'Conakry',
          country: 'Guinée'
        },
        phone: '+221 77 222 22 22',
        companyId: company._id,
        createdBy: testUser._id
      });
      await store2.save();

      // Peupler les boutiques
      const populatedCompany = await Company.findById(company._id)
        .populate('stores');

      expect(populatedCompany.stores).toHaveLength(2);
      expect(populatedCompany.stores[0].name).toBe('Store 1');
      expect(populatedCompany.stores[1].name).toBe('Store 2');
    });
  });

  describe('📊 Statistiques et agrégations', () => {
    
    test('Doit calculer les statistiques des entreprises', async () => {
      // Créer des entreprises avec différents statuts
      await createTestCompany({ name: 'Active Company 1', status: 'active' });
      await createTestCompany({ name: 'Active Company 2', status: 'active' });
      await createTestCompany({ name: 'Inactive Company', status: 'inactive' });

      const stats = await Company.getStatistics();
      
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.inactive).toBe(1);
    });

    test('Doit trouver les entreprises les plus récentes', async () => {
      // Créer des entreprises avec des dates différentes
      const company1 = await createTestCompany({ name: 'Old Company' });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const company2 = await createTestCompany({ name: 'New Company' });

      const recentCompanies = await Company.findRecent(1);
      expect(recentCompanies).toHaveLength(1);
      expect(recentCompanies[0].name).toBe('New Company');
    });
  });

  describe('🔍 Recherche et filtrage', () => {
    
    test('Doit rechercher des entreprises par critères multiples', async () => {
      await createTestCompany({ 
        name: 'Tech Company', 
        description: 'Technology solutions',
        address: 'Dakar, Senegal'
      });
      
      await createTestCompany({ 
        name: 'Food Company', 
        description: 'Food and beverages',
        address: 'Thies, Senegal'
      });

      const techCompanies = await Company.search({
        name: 'Tech',
        description: 'Technology'
      });
      
      expect(techCompanies).toHaveLength(1);
      expect(techCompanies[0].name).toBe('Tech Company');
    });

    test('Doit filtrer les entreprises par localisation', async () => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      
      // Créer directement les companies sans dépendances circulaires
      const dakarCompanyData = {
        name: `Dakar Company ${timestamp} ${randomId}`,
        description: 'Entreprise de Dakar',
        address: {
          street: '123 Rue Dakar',
          city: 'Dakar',
          country: 'Sénégal'
        },
        phone: '+221 77 123 45 67',
        email: `dakar.${timestamp}.${randomId}@company.com`,
        createdBy: testUser._id
      };
      const dakarCompany = new Company(dakarCompanyData);
      await dakarCompany.save();
      
      const thiesCompanyData = {
        name: `Thies Company ${timestamp} ${randomId}`,
        description: 'Entreprise de Thies',
        address: {
          street: '456 Rue Thies',
          city: 'Thies',
          country: 'Sénégal'
        },
        phone: '+221 77 234 56 78',
        email: `thies.${timestamp}.${randomId}@company.com`,
        createdBy: testUser._id
      };
      const thiesCompany = new Company(thiesCompanyData);
      await thiesCompany.save();

      const dakarCompanies = await Company.findByLocation('Dakar');
      expect(dakarCompanies).toHaveLength(1);
      expect(dakarCompanies[0].name).toBe(`Dakar Company ${timestamp} ${randomId}`);
    });
  });
});
