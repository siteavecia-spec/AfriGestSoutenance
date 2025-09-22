// Tests unitaires pour le modèle User
const mongoose = require('mongoose');
const User = require('../../../server/models/User');
const { createTestUser, createTestCompany, createTestStore } = require('../../helpers/testHelpers');

describe('🧪 Tests unitaires - Modèle User', () => {
  
  // Helper pour créer des données utilisateur complètes
  const createCompleteUserData = async (overrides = {}) => {
    const company = await createTestCompany();
    const store = await createTestStore({ companyId: company._id });
    
    return {
      firstName: 'John',
      lastName: 'Doe',
      email: `user.${Date.now()}.${Math.random().toString(36).substr(2, 9)}@test.com`,
      password: 'password123',
      role: 'employee',
      company: company._id,
      store: store._id,
      ...overrides
    };
  };
  
  beforeEach(async () => {
    // Nettoyer toutes les collections avant chaque test pour éviter les conflits
    const collections = mongoose.connection.collections;
    const testCollections = ['users', 'companies', 'stores'];
    
    for (const collectionName of testCollections) {
      if (collections[collectionName]) {
        await collections[collectionName].deleteMany({});
      }
    }
  });

  describe('✅ Validation des champs obligatoires', () => {
    
    test('Doit créer un utilisateur avec tous les champs requis', async () => {
      // Créer une entreprise et une boutique pour l'utilisateur
      const company = await createTestCompany();
      const store = await createTestStore({ companyId: company._id });
      
      const timestamp = Date.now();
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: `john.doe.${timestamp}@test.com`,
        password: 'password123',
        role: 'employee',
        company: company._id,
        store: store._id
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.firstName).toBe(userData.firstName);
      expect(savedUser.lastName).toBe(userData.lastName);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.password).not.toBe(userData.password); // Doit être haché
    });

    test('Doit échouer sans firstName', async () => {
      const userData = await createCompleteUserData();
      delete userData.firstName;

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    test('Doit échouer sans lastName', async () => {
      const userData = await createCompleteUserData();
      delete userData.lastName;

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    test('Doit échouer sans email', async () => {
      const userData = await createCompleteUserData();
      delete userData.email;

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    test('Doit échouer sans password', async () => {
      const userData = await createCompleteUserData();
      delete userData.password;

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    test('Doit échouer sans role', async () => {
      const userData = await createCompleteUserData();
      delete userData.role;

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('📧 Validation de l\'email', () => {
    
    test('Doit accepter un email valide', async () => {
      const userData = await createCompleteUserData({
        email: 'john.doe@example.com'
      });

      const user = new User(userData);
      const savedUser = await user.save();
      expect(savedUser.email).toBe(userData.email);
    });

    test('Doit échouer avec un email invalide', async () => {
      const userData = await createCompleteUserData({
        email: 'email-invalide'
      });

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    test('Doit échouer avec un email dupliqué', async () => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const email = `duplicate${timestamp}${randomId}@test.com`;
      
      // Créer une company et store partagés
      const company = await createTestCompany();
      const store = await createTestStore({ companyId: company._id });
      
      // Créer le premier utilisateur
      const firstUserData = {
        firstName: 'First',
        lastName: 'User',
        email: email,
        password: 'password123',
        role: 'employee',
        company: company._id,
        store: store._id
      };
      const firstUser = new User(firstUserData);
      await firstUser.save();
      
      // Essayer de créer un deuxième utilisateur avec le même email
      const secondUserData = {
        firstName: 'Second',
        lastName: 'User',
        email: email,
        password: 'password123',
        role: 'employee',
        company: company._id,
        store: store._id
      };

      const secondUser = new User(secondUserData);
      await expect(secondUser.save()).rejects.toThrow();
    });
  });

  describe('🔐 Validation du mot de passe', () => {
    
    test('Doit hacher le mot de passe avant de le sauvegarder', async () => {
      const password = 'password123';
      const userData = await createCompleteUserData({
        password: password
      });

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.password).not.toBe(password);
      expect(savedUser.password).toMatch(/^\$2[aby]\$\d+\$/); // Format bcrypt
    });

    test('Doit pouvoir comparer le mot de passe avec comparePassword', async () => {
      const password = 'password123';
      const userData = await createCompleteUserData({ password });
      const user = new User(userData);
      const savedUser = await user.save();

      const isMatch = await savedUser.comparePassword(password);
      expect(isMatch).toBe(true);

      const isNotMatch = await savedUser.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });
  });

  describe('👤 Validation des rôles', () => {
    
    const validRoles = ['super_admin', 'company_admin', 'store_manager', 'employee'];
    
    test.each(validRoles)('Doit accepter le rôle valide: %s', async (role) => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const userData = await createCompleteUserData({
        email: `john.${role}.${timestamp}.${randomId}@test.com`,
        role: role
      });

      const user = new User(userData);
      const savedUser = await user.save();
      expect(savedUser.role).toBe(role);
    });

    test('Doit échouer avec un rôle invalide', async () => {
      const userData = await createCompleteUserData({
        role: 'invalid_role'
      });

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('🏢 Relations avec Company et Store', () => {
    
    test('Doit pouvoir associer un utilisateur à une entreprise', async () => {
      const company = await createTestCompany();
      const timestamp = Date.now();
      const userData = await createCompleteUserData({
        email: `john.company${timestamp}@test.com`,
        role: 'company_admin',
        company: company._id,
        store: undefined // Pas de store pour company_admin
      });

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.company.toString()).toBe(company._id.toString());
    });

    test('Doit pouvoir associer un utilisateur à une boutique', async () => {
      const company = await createTestCompany();
      const store = await createTestStore({ companyId: company._id });
      
      const timestamp = Date.now();
      const userData = await createCompleteUserData({
        email: `john.store${timestamp}@test.com`,
        role: 'store_manager',
        company: company._id,
        store: store._id
      });

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.store.toString()).toBe(store._id.toString());
    });

    test('Doit pouvoir peupler les relations company et store', async () => {
      // Créer directement les Company et Store sans dépendances circulaires
      const Company = require('../../../server/models/Company');
      const Store = require('../../../server/models/Store');
      
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      
      // Créer un super admin pour être le créateur
      const superAdmin = new User({
        firstName: 'Super',
        lastName: 'Admin',
        email: `superadmin.${timestamp}.${randomId}@test.com`,
        password: 'password123',
        role: 'super_admin'
      });
      await superAdmin.save();
      
      // Créer la company
      const companyData = {
        name: `Test Company ${timestamp} ${randomId}`,
        description: 'Entreprise de test',
        address: {
          street: '123 Rue Test',
          city: 'Conakry',
          state: 'Conakry',
          postalCode: '001',
          country: 'Guinée'
        },
        phone: '+221 77 123 45 67',
        email: `test.${timestamp}.${randomId}@company.com`,
        createdBy: superAdmin._id
      };
      
      const company = new Company(companyData);
      await company.save();
      
      // Créer la store
      const storeData = {
        name: `Test Store ${timestamp} ${randomId}`,
        code: `T${randomId.substring(0, 4)}`,
        description: 'Boutique de test',
        companyId: company._id,
        email: `store.${timestamp}.${randomId}@test.com`,
        phone: '+221 77 987 65 43',
        address: {
          street: '456 Avenue Test',
          city: 'Conakry',
          country: 'Guinée'
        },
        createdBy: superAdmin._id
      };
      
      const store = new Store(storeData);
      await store.save();
      
      // Vérifier que company et store existent et sont sauvegardés
      expect(company).not.toBeNull();
      expect(store).not.toBeNull();
      expect(company._id).toBeDefined();
      expect(store._id).toBeDefined();
      
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: `user.${Date.now()}.${Math.random().toString(36).substr(2, 9)}@test.com`,
        password: 'password123',
        role: 'store_manager',
        company: company._id,
        store: store._id
      };
      
      const user = new User(userData);
      const savedUser = await user.save();

      const populatedUser = await User.findById(savedUser._id)
        .populate('company')
        .populate('store');

      expect(populatedUser).not.toBeNull();
      expect(populatedUser.company).not.toBeNull();
      expect(populatedUser.store).not.toBeNull();
      expect(populatedUser.company.name).toBe(company.name);
      expect(populatedUser.store.name).toBe(store.name);
    });
  });

  describe('📅 Timestamps automatiques', () => {
    
    test('Doit créer createdAt et updatedAt automatiquement', async () => {
      const userData = await createCompleteUserData();
      const user = new User(userData);
      const savedUser = await user.save();
      
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
      expect(savedUser.createdAt).toBeInstanceOf(Date);
      expect(savedUser.updatedAt).toBeInstanceOf(Date);
    });

    test('Doit mettre à jour updatedAt lors de la modification', async () => {
      const userData = await createCompleteUserData();
      const user = new User(userData);
      const savedUser = await user.save();
      const originalUpdatedAt = savedUser.updatedAt;
      
      // Attendre un peu pour s'assurer que la date change
      await new Promise(resolve => setTimeout(resolve, 100));
      
      savedUser.firstName = 'Updated Name';
      await savedUser.save();
      
      expect(savedUser.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('🔍 Méthodes d\'instance', () => {
    
    test('Doit retourner le nom complet avec getFullName', async () => {
      const userData = await createCompleteUserData({
        firstName: 'John',
        lastName: 'Doe'
      });
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.getFullName()).toBe('John Doe');
    });

    test('Doit retourner les informations publiques avec toPublicJSON', async () => {
      const userData = await createCompleteUserData();
      const user = new User(userData);
      const savedUser = await user.save();

      const publicData = savedUser.toPublicJSON();

      expect(publicData._id).toBeDefined();
      expect(publicData.firstName).toBe(savedUser.firstName);
      expect(publicData.lastName).toBe(savedUser.lastName);
      expect(publicData.email).toBe(savedUser.email);
      expect(publicData.role).toBe(savedUser.role);
      expect(publicData.password).toBeUndefined(); // Ne doit pas inclure le mot de passe
    });
  });

  describe('🔎 Méthodes statiques', () => {
    
    test('Doit trouver un utilisateur par email', async () => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const email = `find.by.email.${timestamp}.${randomId}@test.com`;
      const userData = await createCompleteUserData({ email });
      const user = new User(userData);
      await user.save();

      const foundUser = await User.findByEmail(email);
      expect(foundUser).toBeDefined();
      expect(foundUser.email).toBe(email);
    });

    test('Doit retourner null si l\'utilisateur n\'existe pas', async () => {
      const foundUser = await User.findByEmail('nonexistent@test.com');
      expect(foundUser).toBeNull();
    });

    test('Doit trouver les utilisateurs par rôle', async () => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      
      // Nettoyer spécifiquement les utilisateurs avec le rôle employee
      await User.deleteMany({ role: 'employee' });
      
      // Créer directement les Company et Store sans dépendances circulaires
      const Company = require('../../../server/models/Company');
      const Store = require('../../../server/models/Store');
      
      // Créer un super admin pour être le créateur
      const superAdmin = new User({
        firstName: 'Super',
        lastName: 'Admin',
        email: `superadmin.${timestamp}.${randomId}@test.com`,
        password: 'password123',
        role: 'super_admin'
      });
      await superAdmin.save();
      
      // Créer la company
      const companyData = {
        name: `Test Company ${timestamp} ${randomId}`,
        description: 'Entreprise de test',
        address: {
          street: '123 Rue Test',
          city: 'Conakry',
          state: 'Conakry',
          postalCode: '001',
          country: 'Guinée'
        },
        phone: '+221 77 123 45 67',
        email: `test.${timestamp}.${randomId}@company.com`,
        createdBy: superAdmin._id
      };
      
      const company = new Company(companyData);
      await company.save();
      
      // Créer la store
      const storeData = {
        name: `Test Store ${timestamp} ${randomId}`,
        code: `T${randomId.substring(0, 4)}`,
        description: 'Boutique de test',
        companyId: company._id,
        email: `store.${timestamp}.${randomId}@test.com`,
        phone: '+221 77 987 65 43',
        address: {
          street: '456 Avenue Test',
          city: 'Conakry',
          country: 'Guinée'
        },
        createdBy: superAdmin._id
      };
      
      const store = new Store(storeData);
      await store.save();
      
      const userData1 = {
        firstName: 'Employee',
        lastName: 'One',
        email: `employee1${timestamp}${randomId}@test.com`,
        password: 'password123',
        role: 'employee',
        company: company._id,
        store: store._id
      };
      const user1 = new User(userData1);
      await user1.save();
      
      const userData2 = {
        firstName: 'Employee',
        lastName: 'Two',
        email: `employee2${timestamp}${randomId}@test.com`,
        password: 'password123',
        role: 'employee', 
        company: company._id,
        store: store._id
      };
      const user2 = new User(userData2);
      await user2.save();
      
      const userData3 = {
        firstName: 'Admin',
        lastName: 'User',
        email: `admin${timestamp}${randomId}@test.com`,
        password: 'password123',
        role: 'company_admin', 
        company: company._id
      };
      const user3 = new User(userData3);
      await user3.save();

      const employees = await User.findByRole('employee');
      expect(employees).toHaveLength(2);
      expect(employees.every(user => user.role === 'employee')).toBe(true);
    });
  });
});
