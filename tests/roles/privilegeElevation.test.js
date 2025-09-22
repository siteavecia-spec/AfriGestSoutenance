// Tests de sécurité: prévention d'élévation de privilèges lors de la création/mise à jour d'utilisateurs
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server/app');
const User = require('../../server/models/User');
const Company = require('../../server/models/Company');
const Store = require('../../server/models/Store');
const { createTestCompany, createTestStore } = require('../helpers/testHelpers');

async function login(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

describe('🔐 Élévation de privilèges - règles de sécurité', () => {
  let company;
  let store;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/afrigest-test');
    company = await createTestCompany();
    store = await createTestStore({ company: company });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('PDG (company_admin)', () => {
    let pdgToken;

    beforeAll(async () => {
      const pdg = new User({
        firstName: 'PDG',
        lastName: 'Test',
        email: `pdg.${Date.now()}@test.com`,
        password: 'password123',
        role: 'company_admin',
        company: company._id,
      });
      await pdg.save();
      pdgToken = await login(pdg.email, 'password123');
    });

    test('ne peut PAS créer un super_admin', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${pdgToken}`)
        .send({
          firstName: 'X', lastName: 'Y', email: `su.${Date.now()}@test.com`, password: 'password123',
          role: 'super_admin', company: company._id,
        });
      expect([401,403]).toContain(res.status);
    });

    test('ne peut PAS créer un company_admin', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${pdgToken}`)
        .send({
          firstName: 'X', lastName: 'Y', email: `ca.${Date.now()}@test.com`, password: 'password123',
          role: 'company_admin', company: company._id,
        });
      expect([401,403]).toContain(res.status);
    });

    test('ne peut PAS promouvoir vers super_admin/company_admin via PUT', async () => {
      const emp = new User({
        firstName: 'Emp', lastName: 'One', email: `emp.${Date.now()}@test.com`, password: 'password123',
        role: 'employee', company: company._id, store: store._id,
      });
      await emp.save();

      const put1 = await request(app)
        .put(`/api/users/${emp._id}`)
        .set('Authorization', `Bearer ${pdgToken}`)
        .send({ role: 'super_admin' });
      expect([401,403]).toContain(put1.status);

      const put2 = await request(app)
        .put(`/api/users/${emp._id}`)
        .set('Authorization', `Bearer ${pdgToken}`)
        .send({ role: 'company_admin' });
      expect([401,403]).toContain(put2.status);
    });
  });

  describe('DG (store_manager)', () => {
    let dgToken;

    beforeAll(async () => {
      const dg = new User({
        firstName: 'DG',
        lastName: 'Test',
        email: `dg.${Date.now()}@test.com`,
        password: 'password123',
        role: 'store_manager',
        company: company._id,
        store: store._id,
      });
      await dg.save();
      dgToken = await login(dg.email, 'password123');
    });

    test('peut créer un employee (autorisé)', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${dgToken}`)
        .send({
          firstName: 'Emp', lastName: 'DG', email: `empdg.${Date.now()}@test.com`, password: 'password123',
          role: 'employee', company: company._id, store: store._id,
        });
      expect([201,200]).toContain(res.status);
    });

    test('ne peut PAS créer un store_manager', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${dgToken}`)
        .send({
          firstName: 'DG2', lastName: 'X', email: `dg2.${Date.now()}@test.com`, password: 'password123',
          role: 'store_manager', company: company._id, store: store._id,
        });
      expect([401,403]).toContain(res.status);
    });

    test('ne peut PAS promouvoir vers autre chose que employee', async () => {
      const emp = new User({
        firstName: 'Emp', lastName: 'Two', email: `emp2.${Date.now()}@test.com`, password: 'password123',
        role: 'employee', company: company._id, store: store._id,
      });
      await emp.save();

      const put = await request(app)
        .put(`/api/users/${emp._id}`)
        .set('Authorization', `Bearer ${dgToken}`)
        .send({ role: 'store_manager' });
      expect([401,403]).toContain(put.status);
    });
  });
});
