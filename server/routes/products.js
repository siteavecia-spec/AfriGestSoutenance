const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Store = require('../models/Store');
const { authenticate, checkPermission } = require('../middleware/auth');

const router = express.Router();
const { normalizeId } = require('../utils/ids');

// NOTE: Cette route est un alias de /api/inventory/* pour correspondre aux tests
// Elle reprend la logique de server/routes/inventory.js, adaptée aux chemins attendus par les tests

// List products: GET /api/products
router.get('/', authenticate, async (req, res) => {
  try {
    let products;
    let query = {};

    // Filtrer selon le rôle
    if (req.user.role === 'super_admin') {
      if (req.query.companyId) query.companyId = req.query.companyId;
      if (req.query.storeId) query.storeId = req.query.storeId;
    } else if (['company_admin', 'dg'].includes(req.user.role)) {
      query.companyId = req.user.company?._id || req.user.company;
      if (req.query.storeId) query.storeId = req.query.storeId;
    } else {
      // store_manager / employee
      query.storeId = req.user.store?._id || req.user.store;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    products = await Product.find(query)
      .populate('categoryId', 'name')
      .populate('storeId', 'name code')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (req.query.lowStock === 'true') {
      products = products.filter(p => p.isLowStock);
    }

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
      pagination: { current: page, pages: Math.ceil(total / limit), total, limit }
    });
  } catch (error) {
    console.error('Products alias list error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des produits' });
  }
});

// Low stock: GET /api/products/low-stock
router.get('/low-stock', authenticate, async (req, res) => {
  try {
    let query = {};

    // Filtrer selon le rôle
    if (req.user.role === 'super_admin') {
      if (req.query.companyId) query.companyId = req.query.companyId;
      if (req.query.storeId) query.storeId = req.query.storeId;
    } else if (['company_admin', 'dg'].includes(req.user.role)) {
      query.companyId = req.user.company?._id || req.user.company;
      if (req.query.storeId) query.storeId = req.query.storeId;
    } else {
      query.storeId = req.user.store?._id || req.user.store;
    }

    const products = await Product.find(query)
      .populate('categoryId', 'name')
      .populate('storeId', 'name code')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    const lowStock = products.filter(p => p.isLowStock);

    res.json({ success: true, products: lowStock, count: lowStock.length });
  } catch (error) {
    console.error('Products alias low-stock error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des produits en rupture' });
  }
});

// Search: GET /api/products/search
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, categoryId, storeId } = req.query;
    let filters = {};

    if (['company_admin', 'dg'].includes(req.user.role)) {
      filters.companyId = req.user.company?._id || req.user.company;
      if (storeId) filters.storeId = storeId;
    } else if (['store_manager', 'employee'].includes(req.user.role)) {
      filters.storeId = req.user.store?._id || req.user.store;
    } else if (req.user.role === 'super_admin') {
      if (req.query.companyId) filters.companyId = req.query.companyId;
      if (storeId) filters.storeId = storeId;
    }
    if (categoryId) filters.categoryId = categoryId;

    const products = await Product.searchProducts(q, filters);
    res.json({ success: true, products, count: products.length });
  } catch (error) {
    console.error('Products alias search error:', error);
    res.status(500).json({ message: 'Erreur lors de la recherche' });
  }
});

// Get by id: GET /api/products/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name')
      .populate('storeId', 'name code')
      .populate('companyId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!product) return res.status(404).json({ message: 'Produit non trouvé' });

    // Accès (cast robuste si champs populés)
    const productCompanyId = normalizeId(product.companyId);
    const userCompanyId = normalizeId(req.user.company);
    if (['company_admin', 'dg'].includes(req.user.role) && productCompanyId !== (userCompanyId || '')) {
      return res.status(403).json({ message: 'Accès refusé à ce produit' });
    }
    const productStoreId = normalizeId(product.storeId);
    const userStoreId = normalizeId(req.user.store);
    if (['store_manager', 'employee'].includes(req.user.role) && productStoreId !== (userStoreId || '')) {
      return res.status(403).json({ message: 'Accès refusé à ce produit' });
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error('Products alias get error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du produit' });
  }
});

// Create: POST /api/products
router.post('/', authenticate, checkPermission('canManageInventory'), [
  body('name').trim().isLength({ min: 2, max: 200 }),
  body('sku').optional().trim().isLength({ min: 2, max: 50 }),
  // accepter soit pricing.sellingPrice/costPrice soit price/cost
  body('pricing.costPrice').optional().isNumeric({ min: 0 }),
  body('pricing.sellingPrice').optional().isNumeric({ min: 0 }),
  body('price').optional().isNumeric({ min: 0 }),
  body('cost').optional().isNumeric({ min: 0 }),
  body('inventory.currentStock').optional().isInt({ min: 0 }),
  body('inventory.minStock').optional().isInt({ min: 0 }),
  body('stock').optional().isInt({ min: 0 }),
  body('minStock').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Données invalides', errors: errors.array() });

    const { storeId, categoryId, price, cost, stock, minStock, ...rest } = req.body;

    let targetStoreId = storeId;
    if (['store_manager', 'employee'].includes(req.user.role)) {
      targetStoreId = req.user.store?._id || req.user.store;
    }

    const store = await Store.findById(targetStoreId);
    if (!store) return res.status(404).json({ message: 'Boutique non trouvée' });
    if (store.status !== 'active') return res.status(400).json({ message: "La boutique n'est pas active" });

    // construire les champs pricing/inventory en acceptant les alias simples
    const pricing = {
      costPrice: (rest.pricing && typeof rest.pricing.costPrice === 'number') ? rest.pricing.costPrice : (typeof cost === 'number' ? cost : 0),
      sellingPrice: (rest.pricing && typeof rest.pricing.sellingPrice === 'number') ? rest.pricing.sellingPrice : (typeof price === 'number' ? price : 0),
    };
    // Pricing guards
    if (pricing.costPrice < 0 || pricing.sellingPrice < 0) {
      return res.status(400).json({ message: 'Les prix ne peuvent pas être négatifs' });
    }
    if (pricing.sellingPrice < pricing.costPrice) {
      return res.status(400).json({ message: 'Le prix de vente doit être supérieur ou égal au prix de revient' });
    }
    const inventory = {
      currentStock: (rest.inventory && typeof rest.inventory.currentStock === 'number') ? rest.inventory.currentStock : (typeof stock === 'number' ? stock : 0),
      minStock: (rest.inventory && typeof rest.inventory.minStock === 'number') ? rest.inventory.minStock : (typeof minStock === 'number' ? minStock : 0),
    };

    // SKU auto si manquant
    const sku = rest.sku || `SKU-${Math.random().toString(36).slice(2,8).toUpperCase()}`;

    const product = new Product({
      ...rest,
      sku,
      pricing,
      inventory,
      companyId: req.user.company?._id || req.user.company,
      storeId: targetStoreId,
      categoryId,
      createdBy: req.user._id
    });

    await product.save();
    res.status(201).json({ success: true, message: 'Produit créé avec succès', product });
  } catch (error) {
    console.error('Products alias create error:', error);
    if (error.code === 11000) return res.status(400).json({ message: 'Un produit avec ce SKU existe déjà' });
    res.status(500).json({ message: 'Erreur lors de la création du produit' });
  }
});

// Update: PUT /api/products/:id
router.put('/:id', authenticate, checkPermission('canManageInventory'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produit non trouvé' });

    // Accès
    if (['company_admin', 'dg'].includes(req.user.role) && product.companyId.toString() !== (req.user.company?._id || req.user.company).toString()) {
      return res.status(403).json({ message: 'Accès refusé à ce produit' });
    }
    if (['store_manager', 'employee'].includes(req.user.role) && product.storeId.toString() !== (req.user.store?._id || req.user.store).toString()) {
      return res.status(403).json({ message: 'Accès refusé à ce produit' });
    }

    // Merge pricing to validate constraints if provided
    const nextPricing = { ...product.pricing };
    if (req.body.pricing && typeof req.body.pricing.costPrice === 'number') {
      nextPricing.costPrice = req.body.pricing.costPrice;
    }
    if (req.body.cost !== undefined && typeof req.body.cost === 'number') {
      nextPricing.costPrice = req.body.cost;
    }
    if (req.body.pricing && typeof req.body.pricing.sellingPrice === 'number') {
      nextPricing.sellingPrice = req.body.pricing.sellingPrice;
    }
    if (req.body.price !== undefined && typeof req.body.price === 'number') {
      nextPricing.sellingPrice = req.body.price;
    }
    if (nextPricing.costPrice < 0 || nextPricing.sellingPrice < 0) {
      return res.status(400).json({ message: 'Les prix ne peuvent pas être négatifs' });
    }
    if (nextPricing.sellingPrice < nextPricing.costPrice) {
      return res.status(400).json({ message: 'Le prix de vente doit être supérieur ou égal au prix de revient' });
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, pricing: req.body.pricing ? { ...req.body.pricing } : product.pricing, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: 'Produit mis à jour avec succès', product: updated });
  } catch (error) {
    console.error('Products alias update error:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du produit' });
  }
});

module.exports = router;
