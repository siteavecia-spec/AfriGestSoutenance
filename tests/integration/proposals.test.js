const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../../server/app');
const User = require('../../server/models/User');
const Company = require('../../server/models/Company');
const Store = require('../../server/models/Store');
const Product = require('../../server/models/Product');
const Proposal = require('../../server/models/Proposal');
const AuditLog = require('../../server/models/AuditLog');
const Notification = require('../../server/models/Notification');

function makeToken(userId) {
  return jwt.sign({ userId: String(userId) }, process.env.JWT_SECRET || 'test-jwt-secret-key', { expiresIn: '1h' });
}

async function createCompanyAdmin() {
  // Créer un super admin temporaire pour satisfaire createdBy
  const superAdmin = await User.create({
    firstName: 'Temp', lastName: 'Owner', email: `owner.${Date.now()}@ex.com`, password: 'pass1234',
    role: 'super_admin'
  });
  const company = await Company.create({ 
    name: `Comp ${Date.now()}`, 
    status: 'active',
    email: `company.${Date.now()}@ex.com`,
    createdBy: superAdmin._id
  });
  const admin = await User.create({
    firstName: 'Alice', lastName: 'Admin', email: `admin.${Date.now()}@ex.com`, password: 'pass1234',
    role: 'company_admin', company: company._id,
    permissions: { canManageInventory: true },
  });
  return { company, admin, token: makeToken(admin._id), superAdmin };
}

async function createEmployee(company, store) {
  const user = await User.create({
    firstName: 'Eli', lastName: 'Employee', email: `emp.${Date.now()}@ex.com`, password: 'pass1234',
    role: 'employee', company: company._id, store: store._id,
  });
  return { user, token: makeToken(user._id) };
}

async function createStore(company, creatorUser) {
  return Store.create({
    name: `Store ${Date.now()}`,
    code: `S${Math.random().toString(36).slice(2,6)}`,
    companyId: company._id,
    status: 'active',
    createdBy: creatorUser?._id || company.createdBy
  });
}

describe('Proposals workflow', () => {
  beforeEach(async () => {
    // Clean collections used here
    const colls = ['users','companies','stores','products','proposals','auditlogs','notifications'];
    for (const name of colls) {
      if (mongoose.connection.collections[name]) {
        await mongoose.connection.collections[name].deleteMany({});
      }
    }
  });

  test('employee submits product create proposal, admin approves -> product created, audit+notif written', async () => {
    const { company, admin, token: adminToken, superAdmin } = await createCompanyAdmin();
    const store = await createStore(company, superAdmin);
    const { user: employee, token: empToken } = await createEmployee(company, store);

    // Submit proposal (create product)
    const payload = {
      targetEntityType: 'product',
      proposedChanges: {
        name: 'Produit Test', sku: `SKU-${Date.now()}`,
        pricing: { costPrice: 10, sellingPrice: 15 },
        inventory: { currentStock: 5, minStock: 1, unit: 'piece' },
        tax: { rate: 0.18, isInclusive: true },
        storeId: store._id, // ensure store is set for creation
      }
    };

    const submitRes = await request(app)
      .post('/api/proposals')
      .set('Authorization', `Bearer ${empToken}`)
      .send(payload)
      .expect(201);

    expect(submitRes.body?.proposal?._id).toBeTruthy();
    const propId = submitRes.body.proposal._id;

    // Approve by company admin
    const approveRes = await request(app)
      .put(`/api/proposals/${propId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'OK' })
      .expect(200);

    const product = approveRes.body?.product;
    expect(product).toBeTruthy();
    expect(product.name).toBe('Produit Test');

    // Check DB side-effects
    const pDoc = await Product.findById(product._id);
    expect(pDoc).toBeTruthy();

    const audits = await AuditLog.find({ meta: { $exists: true }, 'meta.proposalId': new mongoose.Types.ObjectId(propId) });
    expect(audits.length).toBeGreaterThanOrEqual(1);

    const notif = await Notification.findOne({ 'meta.proposalId': new mongoose.Types.ObjectId(propId), userId: employee._id })
      .sort({ createdAt: -1 });
    expect(notif).toBeTruthy();
    expect(notif.severity).toBe('success');
  });

  test('employee submits product update proposal, admin rejects -> proposal rejected, audit+notif written', async () => {
    const { company, token: adminToken, superAdmin } = await createCompanyAdmin();
    const store = await createStore(company, superAdmin);
    const { user: employee, token: empToken } = await createEmployee(company, store);

    // Seed a product owned by the company/store for update scenario
    const product = await Product.create({
      name: 'Ancien Produit', sku: `SKU-${Math.random().toString(36).slice(2,8)}`,
      pricing: { costPrice: 20, sellingPrice: 30 },
      inventory: { currentStock: 10, minStock: 2, unit: 'piece' },
      tax: { rate: 0.18, isInclusive: true },
      companyId: company._id, storeId: store._id, createdBy: employee._id,
    });

    const payload = {
      targetEntityType: 'product', targetId: product._id,
      proposedChanges: { pricing: { sellingPrice: 35 }, inventory: { minStock: 3 } }
    };

    const submitRes = await request(app)
      .post('/api/proposals')
      .set('Authorization', `Bearer ${empToken}`)
      .send(payload)
      .expect(201);

    const propId = submitRes.body.proposal._id;

    const rejectRes = await request(app)
      .put(`/api/proposals/${propId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Non conforme' })
      .expect(200);

    expect(rejectRes.body?.proposal?.status).toBe('rejected');

    const audit = await AuditLog.findOne({ entityType: 'proposal', entityId: propId, action: 'proposal_rejected' });
    expect(audit).toBeTruthy();

    const notif = await Notification.findOne({ 'meta.proposalId': new mongoose.Types.ObjectId(propId), userId: employee._id }).sort({ createdAt: -1 });
    expect(notif).toBeTruthy();
    expect(notif.severity).toBe('warning');
  });
});
