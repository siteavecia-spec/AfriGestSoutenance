const express = require('express');
const { authenticate } = require('../middleware/auth');
const Company = require('../models/Company');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const User = require('../models/User');

const router = express.Router({ mergeParams: true });

// Middleware: authenticate for all private tenant routes
router.use('/tenants/:tenantId', authenticate);

// PUT admin update product ecommerce fields (publish/unpublish, meta)
router.put('/tenants/:tenantId/ecommerce/products/:productId', ensureEcommerceEnabled, async (req, res) => {
  try {
    const { tenantId, productId } = req.params;
    const { ecommerce } = req.body || {};
    if (!ecommerce || typeof ecommerce !== 'object') {
      return res.status(400).json({ message: 'ecommerce payload requis' });
    }
    const allowed = {};
    if (typeof ecommerce.isListed === 'boolean') allowed['ecommerce.isListed'] = ecommerce.isListed;
    if (typeof ecommerce.title === 'string') allowed['ecommerce.title'] = ecommerce.title;
    if (typeof ecommerce.description === 'string') allowed['ecommerce.description'] = ecommerce.description;

    const updated = await Product.findOneAndUpdate(
      { _id: productId, companyId: tenantId },
      { $set: allowed },
      { new: true }
    ).select('name sku pricing ecommerce');
    if (!updated) return res.status(404).json({ message: 'Produit introuvable' });
    res.json({ product: updated });
  } catch (e) {
    console.error('Admin update product ecommerce error:', e);
    res.status(500).json({ message: 'Erreur mise à jour produit' });
  }
});

// Middleware: check company access and feature flag

async function ensureEcommerceEnabled(req, res, next) {
  try {
    const { tenantId } = req.params;
    const company = await Company.findById(tenantId).select('settings.ecommerce status');
    if (!company) return res.status(404).json({ message: 'Entreprise introuvable' });
    if (company.status !== 'active') return res.status(403).json({ message: 'Entreprise inactive' });
    if (!company.settings?.ecommerce?.enabled) return res.status(403).json({ message: 'E-commerce non activé pour cette entreprise' });
    req.company = company;
    next();
  } catch (e) {
    console.error('ensureEcommerceEnabled error:', e);
    res.status(500).json({ message: 'Erreur vérification e-commerce' });
  }
}

// GET admin list products (e-commerce view/meta)
router.get('/tenants/:tenantId/ecommerce/products', ensureEcommerceEnabled, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search;
    const filter = { companyId: tenantId };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    const [items, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('name sku pricing inventory ecommerce'),
      Product.countDocuments(filter),
    ]);
    res.json({ products: items, pagination: { total, page, pages: Math.ceil(total / limit), limit } });
  } catch (e) {
    console.error('Admin ecom products error:', e);
    res.status(500).json({ message: 'Erreur chargement produits' });
  }
});

// GET admin list orders (channel = ecommerce)
router.get('/tenants/:tenantId/ecommerce/orders', ensureEcommerceEnabled, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Sale.find({ companyId: tenantId, status: { $ne: 'cancelled' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('saleNumber totalAmount saleDate status payment channel customer storeId')
        .lean(),
      Sale.countDocuments({ companyId: tenantId, status: { $ne: 'cancelled' } }),
    ]);
    res.json({ orders: items, pagination: { total, page, pages: Math.ceil(total / limit), limit } });
  } catch (e) {
    console.error('Admin ecom orders error:', e);
    res.status(500).json({ message: 'Erreur chargement commandes' });
  }
});

// GET admin list customers (derived from Sale.customer)
router.get('/tenants/:tenantId/ecommerce/customers', ensureEcommerceEnabled, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const since = req.query.since ? new Date(req.query.since) : null;
    const match = { companyId: tenantId };
    if (since) match.createdAt = { $gte: since };
    const customers = await Sale.aggregate([
      { $match: match },
      { $group: { _id: '$customer.email', name: { $first: '$customer.name' }, phone: { $first: '$customer.phone' }, orders: { $sum: 1 }, lastOrder: { $max: '$createdAt' } } },
      { $sort: { lastOrder: -1 } },
      { $limit: 100 },
    ]);
    res.json({ customers });
  } catch (e) {
    console.error('Admin ecom customers error:', e);
    res.status(500).json({ message: 'Erreur chargement clients' });
  }
});

// POST admin sync inventory (stub)
router.post('/tenants/:tenantId/ecommerce/sync-inventory', ensureEcommerceEnabled, async (req, res) => {
  try {
    // TODO: implement provider/webhook sync
    res.json({ message: 'Sync lancé (stub)' });
  } catch (e) {
    console.error('Admin ecom sync error:', e);
    res.status(500).json({ message: 'Erreur de synchronisation' });
  }
});

module.exports = router;
