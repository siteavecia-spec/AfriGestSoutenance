// Test simple pour vérifier que les utilisateurs de test existent
const mongoose = require('mongoose');
const User = require('../server/models/User');
const Company = require('../server/models/Company');

describe('🧪 Test Simple - Vérification des Utilisateurs', () => {
  
  beforeAll(async () => {
    // Connexion à MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Alpaoumarbarry:Alpha.o.b5@cluster0.nokkhsj.mongodb.net/afrigest-test');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('✅ Vérifier que les modèles existent', () => {
    expect(User).toBeDefined();
    expect(Company).toBeDefined();
  });

  test('✅ Créer un Super Admin de test', async () => {
    const superAdmin = new User({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@afrigest.com',
      password: 'SuperAdmin123!',
      role: 'super_admin'
    });

    await superAdmin.save();
    
    expect(superAdmin._id).toBeDefined();
    expect(superAdmin.role).toBe('super_admin');
    expect(superAdmin.email).toBe('superadmin@afrigest.com');
  });

  test('✅ Créer un Admin/PDG de test', async () => {
    const admin = new User({
      firstName: 'Admin',
      lastName: 'PDG',
      email: 'admin@afrigest.com',
      password: 'Admin123!',
      role: 'admin'
    });

    await admin.save();
    
    expect(admin._id).toBeDefined();
    expect(admin.role).toBe('admin');
    expect(admin.email).toBe('admin@afrigest.com');
  });

  test('✅ Créer un Directeur Général de test', async () => {
    const dg = new User({
      firstName: 'Directeur',
      lastName: 'Général',
      email: 'dg@afrigest.com',
      password: 'DG123!',
      role: 'directeur_general'
    });

    await dg.save();
    
    expect(dg._id).toBeDefined();
    expect(dg.role).toBe('directeur_general');
    expect(dg.email).toBe('dg@afrigest.com');
  });

  test('✅ Créer un Manager de test', async () => {
    const manager = new User({
      firstName: 'Manager',
      lastName: 'Test',
      email: 'manager@afrigest.com',
      password: 'Manager123!',
      role: 'manager'
    });

    await manager.save();
    
    expect(manager._id).toBeDefined();
    expect(manager.role).toBe('manager');
    expect(manager.email).toBe('manager@afrigest.com');
  });

  test('✅ Créer un Employé de test', async () => {
    const employee = new User({
      firstName: 'Employé',
      lastName: 'Test',
      email: 'employee@afrigest.com',
      password: 'Employee123!',
      role: 'employee'
    });

    await employee.save();
    
    expect(employee._id).toBeDefined();
    expect(employee.role).toBe('employee');
    expect(employee.email).toBe('employee@afrigest.com');
  });

  test('✅ Créer une entreprise de test', async () => {
    // Récupérer un utilisateur pour être le créateur
    const creator = await User.findOne({ role: 'super_admin' });
    
    const company = new Company({
      name: 'Entreprise Test AfriGest',
      description: 'Entreprise de test pour AfriGest',
      address: 'Dakar, Sénégal',
      phone: '+221 77 123 45 67',
      email: 'test@afrigest.com',
      createdBy: creator._id
    });

    await company.save();
    
    expect(company._id).toBeDefined();
    expect(company.name).toBe('Entreprise Test AfriGest');
    expect(company.createdBy).toBeDefined();
  });

  test('✅ Lister tous les utilisateurs créés', async () => {
    const users = await User.find({});
    
    expect(users.length).toBeGreaterThan(0);
    
    // Vérifier que tous les rôles sont présents
    const roles = users.map(user => user.role);
    expect(roles).toContain('super_admin');
    expect(roles).toContain('admin');
    expect(roles).toContain('directeur_general');
    expect(roles).toContain('manager');
    expect(roles).toContain('employee');
  });

  test('✅ Lister toutes les entreprises créées', async () => {
    const companies = await Company.find({});
    
    expect(companies.length).toBeGreaterThan(0);
    expect(companies[0].name).toBe('Entreprise Test AfriGest');
  });
});
