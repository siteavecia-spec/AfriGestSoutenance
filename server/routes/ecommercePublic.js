const express = require('express');
const Company = require('../models/Company');
const Product = require('../models/Product');
const Sale = require('../models/Sale');

const router = express.Router({ mergeParams: true });

async function getCompanyIfPublicEcom(tenantId) {
  const company = await Company.findById(tenantId).select('status settings.ecommerce');
  if (!company) return null;
  if (company.status !== 'active') return null;
  if (!company.settings?.ecommerce?.enabled) return null;
  return company;
}

// GET public products
router.get('/ecommerce/:tenantId/products', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const company = await getCompanyIfPublicEcom(tenantId);
    if (!company) return res.status(404).json({ message: 'Boutique indisponible' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search;

    const filter = { companyId: tenantId, isActive: true, 'ecommerce.isListed': true };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name sku pricing inventory ecommerce categoryId')
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({ products: items, pagination: { total, page, pages: Math.ceil(total / limit), limit } });
  } catch (e) {
    console.error('Public ecom products error:', e);
    res.status(500).json({ message: "Erreur lors du chargement de la boutique" });
  }
});

// POST public order (stub - payment not processed here)
router.post('/ecommerce/:tenantId/orders', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const company = await getCompanyIfPublicEcom(tenantId);
    if (!company) return res.status(404).json({ message: 'Boutique indisponible' });

    const { items, customer, payment } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Articles requis' });

    // Basic validation of items
    for (const it of items) {
      if (!it.productId || !it.quantity || it.quantity <= 0) {
        return res.status(400).json({ message: 'Article invalide' });
      }
    }

    // Create a minimal Sale with channel=ecommerce (no stock changes here - handled by normal sales route or a worker)
    const sale = new Sale({
      saleNumber: 'TEMP-PUBLIC', // will be set by pre-save
      channel: 'ecommerce',
      companyId: tenantId,
      storeId: req.body.storeId || null, // can be assigned later by backoffice
      cashierId: req.body.userId || null, // anonymous order - left null in real impl
      items: [],
      subtotal: 0,
      totalDiscount: 0,
      totalTax: 0,
      totalAmount: 0,
      payment: { method: payment?.method || 'card', amount: payment?.amount || 0, status: 'pending' },
      customer: customer || {},
      status: 'pending',
      notes: 'Commande e-commerce (stub)'
    });

    // Minimal line build - a real implementation would price from DB
    const products = await Product.find({ _id: { $in: items.map(i => i.productId) } }).select('pricing name sku tax');
    for (const it of items) {
      const p = products.find(x => String(x._id) === String(it.productId));
      if (!p) continue;
      sale.items.push({
        productId: p._id,
        productName: p.name,
        productSku: p.sku,
        quantity: it.quantity,
        unitPrice: p.pricing?.sellingPrice || 0,
        discount: 0,
        discountType: 'percentage',
        tax: { rate: p.tax?.rate || 0.18, amount: 0 },
        subtotal: 0,
        total: 0,
      });
    }

    await sale.save();

    res.status(201).json({ message: 'Commande enregistrée', orderId: sale._id, saleNumber: sale.saleNumber });
  } catch (e) {
    console.error('Public ecom order error:', e);
    res.status(500).json({ message: 'Erreur lors de la commande' });
  }
});

module.exports = router;
